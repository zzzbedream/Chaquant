use std::collections::HashMap;
use std::time::SystemTime;

use fips203::ml_kem_1024::{self, CipherText, DecapsKey, EncapsKey, CT_LEN, EK_LEN};
use fips203::traits::{Decaps, Encaps, KeyGen, SerDes};
use hkdf::Hkdf;
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha3::Sha3_256;
use x25519_dalek::{PublicKey as X25519Public, StaticSecret as X25519Secret};
use zeroize::Zeroize;

use crate::crypto::payload::{decrypt_aes_256_gcm, encrypt_aes_256_gcm, EncryptedPayload};
use crate::error::ChaquantError;

pub const MAX_SKIPPED_KEYS: usize = 2000;
pub const SPQR_PERIOD: u32 = 10; // Cada 10 mensajes se inyecta paso post-cuántico

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RatchetHeader {
    pub dh_public: [u8; 32],
    pub n: u32,
    pub pn: u32,
    /// Encapsulación ML-KEM-1024 periódica (si corresponde a este hito de SPQR)
    pub pq_step: Option<PqRatchetStep>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum PqRatchetStep {
    /// El emisor publica una nueva clave pública KEM para que el receptor encapsule
    AdvertiseKey(Vec<u8>),
    /// El emisor encapsula contra la clave pública del receptor
    Encapsulated(Vec<u8>),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RatchetMessage {
    pub header: RatchetHeader,
    pub encrypted_payload: EncryptedPayload,
}

pub struct SpqrSession {
    // Claves maestras del trinquete
    root_key: [u8; 32],
    
    // Trinquete clásico DH (X25519)
    dh_secret: X25519Secret,
    dh_public: X25519Public,
    remote_dh_public: Option<X25519Public>,

    // Cadenas simétricas
    sending_chain_key: Option<[u8; 32]>,
    receiving_chain_key: Option<[u8; 32]>,

    // Contadores de mensajes
    ns: u32,
    nr: u32,
    pn: u32,

    // Estado SPQR (Post-Cuántica)
    turns_since_pq: u32,
    local_kem_decaps_key: Option<DecapsKey>,
    remote_kem_encaps_key: Option<Vec<u8>>,

    // Buffer de claves salteadas (tolerancia al desorden de Nym)
    // Clave: ([u8; 32] remote_dh_public, u32 message_number) -> [u8; 32] message_key
    skipped_message_keys: HashMap<([u8; 32], u32), [u8; 32]>,

    // Gobernanza B2B / Deal Room y Control de Ciclo de Vida (ET-01, ET-02, ET-03)
    deal_room_commitment: Option<[u8; 32]>,
    expires_at_timestamp: Option<u64>,
    policy_flags: u32,
    mock_time: Option<u64>,
    is_destroyed: bool,
}

impl SpqrSession {
    /// Inicializa la sesión para Alice (Iniciadora activa tras PQXDH)
    pub fn init_initiator(
        master_secret: [u8; 32],
        bob_dh_public: [u8; 32],
    ) -> Result<Self, ChaquantError> {
        let rng = OsRng;
        let dh_secret = X25519Secret::random_from_rng(rng);
        let dh_public = X25519Public::from(&dh_secret);
        let remote_dh = X25519Public::from(bob_dh_public);

        let dh_out = dh_secret.diffie_hellman(&remote_dh);
        let (root_key, sending_chain_key) = kdf_rk(&master_secret, dh_out.as_bytes())?;

        Ok(Self {
            root_key,
            dh_secret,
            dh_public,
            remote_dh_public: Some(remote_dh),
            sending_chain_key: Some(sending_chain_key),
            receiving_chain_key: None,
            ns: 0,
            nr: 0,
            pn: 0,
            turns_since_pq: 0,
            local_kem_decaps_key: None,
            remote_kem_encaps_key: None,
            skipped_message_keys: HashMap::new(),
            deal_room_commitment: None,
            expires_at_timestamp: None,
            policy_flags: 0,
            mock_time: None,
            is_destroyed: false,
        })
    }

    /// Inicializa la sesión para Bob (Respondedor pasivo tras PQXDH)
    pub fn init_responder(
        master_secret: [u8; 32],
        bob_initial_dh_secret: X25519Secret,
    ) -> Self {
        let dh_public = X25519Public::from(&bob_initial_dh_secret);

        Self {
            root_key: master_secret,
            dh_secret: bob_initial_dh_secret,
            dh_public,
            remote_dh_public: None,
            sending_chain_key: None,
            receiving_chain_key: None,
            ns: 0,
            nr: 0,
            pn: 0,
            turns_since_pq: 0,
            local_kem_decaps_key: None,
            remote_kem_encaps_key: None,
            skipped_message_keys: HashMap::new(),
            deal_room_commitment: None,
            expires_at_timestamp: None,
            policy_flags: 0,
            mock_time: None,
            is_destroyed: false,
        }
    }

    /// Configura las políticas de Deal Room empresarial y vencimiento TTL
    pub fn set_deal_room_policy(
        &mut self,
        commitment: [u8; 32],
        expires_at: u64,
        policy_flags: u32,
    ) {
        self.deal_room_commitment = Some(commitment);
        self.expires_at_timestamp = Some(expires_at);
        self.policy_flags = policy_flags;
    }

    /// Inyecta un reloj simulado para pruebas deterministas sin depender de sleeps
    pub fn set_mock_time(&mut self, time: u64) {
        self.mock_time = Some(time);
    }

    /// Obtiene el tiempo UNIX actual considerando el mock inyectado
    pub fn current_time(&self) -> u64 {
        self.mock_time.unwrap_or_else(|| {
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        })
    }

    /// Valida que la sesión no haya sido destruida ni haya expirado por TTL
    pub fn check_ttl(&self) -> Result<(), ChaquantError> {
        if self.is_destroyed {
            return Err(ChaquantError::CryptoError("Session has been destroyed".into()));
        }
        if let Some(expires_at) = self.expires_at_timestamp {
            if self.current_time() > expires_at {
                return Err(ChaquantError::SessionExpired);
            }
        }
        Ok(())
    }

    /// Destrucción segura e irreversible de material criptográfico en RAM (ET-02 / ET-04)
    /// Emplea Zeroize y black_box para evitar elusiones por optimización del compilador.
    pub fn destroy(&mut self) {
        if self.is_destroyed {
            return;
        }

        // 1. Poner a cero la clave raíz
        self.root_key.zeroize();
        std::hint::black_box(&mut self.root_key);

        // 2. Poner a cero y eliminar las claves de cadena de envío y recepción
        if let Some(mut ck) = self.sending_chain_key.take() {
            ck.zeroize();
            std::hint::black_box(&mut ck);
        }

        if let Some(mut rk) = self.receiving_chain_key.take() {
            rk.zeroize();
            std::hint::black_box(&mut rk);
        }

        // 3. Iterar y aplicar zeroize a cada clave del buffer de mensajes salteados
        for (_, mut mk) in self.skipped_message_keys.drain() {
            mk.zeroize();
            std::hint::black_box(&mut mk);
        }
        self.skipped_message_keys.clear();

        // 4. Limpiar claves post-cuánticas KEM
        self.local_kem_decaps_key = None;
        if let Some(mut ek) = self.remote_kem_encaps_key.take() {
            ek.zeroize();
            std::hint::black_box(&mut ek);
        }

        self.is_destroyed = true;
        std::hint::black_box(self.is_destroyed);
    }

    /// Comprueba si la sesión ha sido destruida en memoria
    pub fn is_destroyed(&self) -> bool {
        self.is_destroyed
    }

    /// Inspección de depuración/testing para verificar que la clave raíz está a ceros
    pub fn root_key_bytes(&self) -> &[u8; 32] {
        &self.root_key
    }

    /// Inspección del tamaño del buffer de claves salteadas
    pub fn skipped_keys_count(&self) -> usize {
        self.skipped_message_keys.len()
    }

    /// Inserción manual de clave salteada para pruebas unitarias de Zeroize
    pub fn insert_skipped_key_for_test(&mut self, remote_dh: [u8; 32], n: u32, key: [u8; 32]) {
        self.skipped_message_keys.insert((remote_dh, n), key);
    }

    /// Retorna la época actual de renovación post-cuántica SPQR
    pub fn spqr_epoch(&self) -> u32 {
        (self.ns + self.nr) / SPQR_PERIOD
    }

    pub fn turns_since_pq(&self) -> u32 {
        self.turns_since_pq
    }

    pub fn message_counters(&self) -> (u32, u32, u32) {
        (self.ns, self.nr, self.pn)
    }

    pub fn deal_room_commitment(&self) -> Option<[u8; 32]> {
        self.deal_room_commitment
    }

    pub fn expires_at_timestamp(&self) -> Option<u64> {
        self.expires_at_timestamp
    }

    pub fn policy_flags(&self) -> u32 {
        self.policy_flags
    }

    /// Cifra un mensaje inyectando un timestamp determinista
    pub fn encrypt_with_time(&mut self, plaintext: &[u8], now: u64) -> Result<RatchetMessage, ChaquantError> {
        self.set_mock_time(now);
        self.encrypt(plaintext)
    }

    /// Descifra un mensaje inyectando un timestamp determinista
    pub fn decrypt_with_time(&mut self, msg: &RatchetMessage, now: u64) -> Result<Vec<u8>, ChaquantError> {
        self.set_mock_time(now);
        self.decrypt(msg)
    }

    /// Cifra un mensaje saliente con el trinquete triple
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<RatchetMessage, ChaquantError> {
        // Validación obligatoria de vigencia TTL y no-destrucción
        self.check_ttl()?;

        let ck = self.sending_chain_key.ok_or_else(|| {
            ChaquantError::RatchetDesync("Sending chain key not initialized".into())
        })?;

        let (new_ck, message_key) = kdf_ck(&ck)?;
        self.sending_chain_key = Some(new_ck);

        // Evaluar paso de renovación SPQR (Post-Cuántica periódica)
        let mut pq_step = None;
        self.turns_since_pq += 1;
        if self.turns_since_pq >= SPQR_PERIOD {
            if let Some(ref remote_ek_bytes) = self.remote_kem_encaps_key {
                if let Ok(ek_arr) = <[u8; EK_LEN]>::try_from(remote_ek_bytes.as_slice()) {
                    if let Ok(kem_ek) = EncapsKey::try_from_bytes(ek_arr) {
                        if let Ok((shared_secret, ciphertext)) = kem_ek.try_encaps() {
                            let ss_bytes = SerDes::into_bytes(shared_secret);
                            let ct_bytes = SerDes::into_bytes(ciphertext);
                            // Inyectar entropía cuántica en la clave raíz
                            self.root_key = kdf_rk_pq(&self.root_key, &ss_bytes)?;
                            pq_step = Some(PqRatchetStep::Encapsulated(ct_bytes.to_vec()));
                            self.turns_since_pq = 0;
                        }
                    }
                }
            } else {
                // Si aún no tenemos la clave KEM del par, anunciamos una nueva local
                if let Ok((kem_ek, kem_dk)) = ml_kem_1024::KG::try_keygen() {
                    let ek_bytes: [u8; EK_LEN] = kem_ek.into_bytes();
                    self.local_kem_decaps_key = Some(kem_dk);
                    pq_step = Some(PqRatchetStep::AdvertiseKey(ek_bytes.to_vec()));
                    self.turns_since_pq = 0;
                }
            }
        }

        let header = RatchetHeader {
            dh_public: *self.dh_public.as_bytes(),
            n: self.ns,
            pn: self.pn,
            pq_step,
        };

        self.ns += 1;

        // Cifrar con AES-256-GCM asociando la cabecera completa como AAD
        let aad = serde_json::to_vec(&header)
            .map_err(|e| ChaquantError::SerializationError(e.to_string()))?;

        let encrypted_payload = encrypt_aes_256_gcm(&message_key, plaintext, &aad)?;

        Ok(RatchetMessage {
            header,
            encrypted_payload,
        })
    }

    /// Descifra un mensaje entrante, soportando entrega desordenada estocástica
    pub fn decrypt(&mut self, msg: &RatchetMessage) -> Result<Vec<u8>, ChaquantError> {
        // Validación obligatoria de vigencia TTL y no-destrucción
        self.check_ttl()?;

        let aad = serde_json::to_vec(&msg.header)
            .map_err(|e| ChaquantError::SerializationError(e.to_string()))?;

        // 1. Verificar si la clave ya está almacenada en el buffer de claves salteadas
        let key_id = (msg.header.dh_public, msg.header.n);
        if let Some(skipped_mk) = self.skipped_message_keys.remove(&key_id) {
            return decrypt_aes_256_gcm(&skipped_mk, &msg.encrypted_payload, &aad);
        }

        let remote_dh = X25519Public::from(msg.header.dh_public);

        // 2. Si el emisor rotó su clave DH, avanzar el trinquete DH
        let is_new_dh = self
            .remote_dh_public
            .map(|cur| cur.as_bytes() != remote_dh.as_bytes())
            .unwrap_or(true);

        if is_new_dh {
            // Guardar cualquier clave salteada de la cadena anterior
            self.skip_message_keys(msg.header.pn)?;
            self.dh_ratchet(&remote_dh)?;
        }

        // 3. Procesar el paso SPQR si viene presente
        if let Some(ref step) = msg.header.pq_step {
            match step {
                PqRatchetStep::AdvertiseKey(ek_bytes) => {
                    self.remote_kem_encaps_key = Some(ek_bytes.clone());
                }
                PqRatchetStep::Encapsulated(ct_bytes) => {
                    if let Some(ref dk) = self.local_kem_decaps_key {
                        if let Ok(ct_arr) = <[u8; CT_LEN]>::try_from(ct_bytes.as_slice()) {
                            if let Ok(ct) = CipherText::try_from_bytes(ct_arr) {
                                if let Ok(shared_secret) = dk.try_decaps(&ct) {
                                    let ss_bytes = SerDes::into_bytes(shared_secret);
                                    self.root_key = kdf_rk_pq(&self.root_key, &ss_bytes)?;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Guardar claves salteadas dentro de la cadena receptora actual
        self.skip_message_keys(msg.header.n)?;

        // 5. Avanzar la cadena receptora para obtener la clave del mensaje
        let ck = self.receiving_chain_key.ok_or_else(|| {
            ChaquantError::RatchetDesync("Receiving chain key not available".into())
        })?;

        let (new_ck, message_key) = kdf_ck(&ck)?;
        self.receiving_chain_key = Some(new_ck);
        self.nr += 1;

        decrypt_aes_256_gcm(&message_key, &msg.encrypted_payload, &aad)
    }

    fn skip_message_keys(&mut self, until: u32) -> Result<(), ChaquantError> {
        if self.nr + (MAX_SKIPPED_KEYS as u32) < until {
            return Err(ChaquantError::RatchetDesync(
                "Excessive skipped keys threshold exceeded".into(),
            ));
        }

        if let Some(mut ck) = self.receiving_chain_key {
            let remote_dh_bytes = self.remote_dh_public.unwrap().to_bytes();
            while self.nr < until {
                let (next_ck, mk) = kdf_ck(&ck)?;
                ck = next_ck;
                self.skipped_message_keys.insert((remote_dh_bytes, self.nr), mk);
                self.nr += 1;
            }
            self.receiving_chain_key = Some(ck);
        }
        Ok(())
    }

    fn dh_ratchet(&mut self, remote_dh: &X25519Public) -> Result<(), ChaquantError> {
        self.pn = self.ns;
        self.ns = 0;
        self.nr = 0;
        self.remote_dh_public = Some(*remote_dh);

        // DH de recepción
        let dh_recv = self.dh_secret.diffie_hellman(remote_dh);
        let (rk1, recv_ck) = kdf_rk(&self.root_key, dh_recv.as_bytes())?;
        self.receiving_chain_key = Some(recv_ck);

        // Generar nuevo par DH local y avanzar DH de envío
        let rng = OsRng;
        self.dh_secret = X25519Secret::random_from_rng(rng);
        self.dh_public = X25519Public::from(&self.dh_secret);

        let dh_send = self.dh_secret.diffie_hellman(remote_dh);
        let (rk2, send_ck) = kdf_rk(&rk1, dh_send.as_bytes())?;
        self.root_key = rk2;
        self.sending_chain_key = Some(send_ck);

        Ok(())
    }
}

/// Implementación de Drop para limpieza automática irreversible de RAM al salir de ámbito
impl Drop for SpqrSession {
    fn drop(&mut self) {
        self.destroy();
    }
}

// Funciones KDF estándar de trinquete con HKDF-SHA3-256
fn kdf_rk(rk: &[u8; 32], dh_out: &[u8; 32]) -> Result<([u8; 32], [u8; 32]), ChaquantError> {
    let hk = Hkdf::<Sha3_256>::new(Some(rk), dh_out);
    let mut okm = [0u8; 64];
    hk.expand(b"ChaquantRatchetRK", &mut okm)
        .map_err(|e| ChaquantError::CryptoError(format!("HKDF RK expand failed: {:?}", e)))?;

    let mut new_rk = [0u8; 32];
    let mut new_ck = [0u8; 32];
    new_rk.copy_from_slice(&okm[0..32]);
    new_ck.copy_from_slice(&okm[32..64]);
    Ok((new_rk, new_ck))
}

fn kdf_rk_pq(rk: &[u8; 32], pq_ss: &[u8; 32]) -> Result<[u8; 32], ChaquantError> {
    let hk = Hkdf::<Sha3_256>::new(Some(rk), pq_ss);
    let mut new_rk = [0u8; 32];
    hk.expand(b"ChaquantSPQR-Injection", &mut new_rk)
        .map_err(|e| ChaquantError::CryptoError(format!("HKDF SPQR expand failed: {:?}", e)))?;
    Ok(new_rk)
}

fn kdf_ck(ck: &[u8; 32]) -> Result<([u8; 32], [u8; 32]), ChaquantError> {
    let hk = Hkdf::<Sha3_256>::new(Some(ck), &[0x01]);
    let mut new_ck = [0u8; 32];
    hk.expand(b"ChaquantChainKeyNext", &mut new_ck)
        .map_err(|e| ChaquantError::CryptoError(e.to_string()))?;

    let hk_msg = Hkdf::<Sha3_256>::new(Some(ck), &[0x02]);
    let mut message_key = [0u8; 32];
    hk_msg
        .expand(b"ChaquantMessageKey", &mut message_key)
        .map_err(|e| ChaquantError::CryptoError(e.to_string()))?;

    Ok((new_ck, message_key))
}
