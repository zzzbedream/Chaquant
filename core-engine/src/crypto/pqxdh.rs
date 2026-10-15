use fips203::ml_kem_1024::{CipherText, EncapsKey, CT_LEN, EK_LEN};
use fips203::traits::{Decaps, Encaps, SerDes};
use hkdf::Hkdf;
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha3::Sha3_256;
use x25519_dalek::{PublicKey as X25519Public, StaticSecret as X25519Secret};

use crate::crypto::keys::{BobPrekeyState, IdentityKeyPair, PrekeyBundle};
use crate::error::ChaquantError;

pub const PQXDH_SALT: &[u8] = b"CHAQUANT-PQXDH-V1-SALT";
pub const PQXDH_INFO: &[u8] = b"ChaquantMasterSessionSecret";
pub const KEM_SS_LEN: usize = 32;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PqxdhHandshakeMessage {
    pub initiator_identity_key_classical: [u8; 32],
    pub initiator_ephemeral_key_classical: [u8; 32],
    pub kem_ciphertext_bytes: Vec<u8>,
}

/// Ejecuta el rol de iniciador (Alice) en el apretón de manos PQXDH
pub fn pqxdh_initiate(
    alice_identity: &IdentityKeyPair,
    bob_bundle: &PrekeyBundle,
) -> Result<([u8; 32], PqxdhHandshakeMessage), ChaquantError> {
    // 1. Validar firma ML-DSA-87 de Bob
    if !bob_bundle.verify_signature()? {
        return Err(ChaquantError::HandshakeError(
            "Bob's ML-DSA-87 signature over prekey bundle is invalid!".into(),
        ));
    }

    let rng = OsRng;
    let alice_ephemeral_secret = X25519Secret::random_from_rng(rng);
    let alice_ephemeral_public = X25519Public::from(&alice_ephemeral_secret);

    let bob_identity_public = X25519Public::from(bob_bundle.identity_key_classical);
    let bob_signed_prekey_public = X25519Public::from(bob_bundle.signed_prekey_classical);

    // 2. Calcular los tres Diffie-Hellman clásicos
    let dh1 = alice_identity.classical_secret.diffie_hellman(&bob_signed_prekey_public);
    let dh2 = alice_ephemeral_secret.diffie_hellman(&bob_identity_public);
    let dh3 = alice_ephemeral_secret.diffie_hellman(&bob_signed_prekey_public);

    // 3. Encapsular secreto compartido en ML-KEM-1024
    let ek_array: [u8; EK_LEN] = bob_bundle
        .kem_encapsulation_key_bytes
        .as_slice()
        .try_into()
        .map_err(|_| ChaquantError::HandshakeError("Invalid ML-KEM-1024 public key length".into()))?;

    let kem_ek = EncapsKey::try_from_bytes(ek_array)
        .map_err(|e| ChaquantError::HandshakeError(format!("Invalid ML-KEM key bytes: {:?}", e)))?;

    let (shared_secret_kem, ciphertext_kem) = kem_ek
        .try_encaps()
        .map_err(|e| ChaquantError::HandshakeError(format!("ML-KEM encapsulation failed: {:?}", e)))?;

    let ss_bytes = SerDes::into_bytes(shared_secret_kem);
    let ct_bytes = SerDes::into_bytes(ciphertext_kem);

    // 4. Derivar la clave maestra de sesión mediante HKDF-SHA3-256
    let mut ikm = Vec::with_capacity(32 * 3 + KEM_SS_LEN);
    ikm.extend_from_slice(dh1.as_bytes());
    ikm.extend_from_slice(dh2.as_bytes());
    ikm.extend_from_slice(dh3.as_bytes());
    ikm.extend_from_slice(&ss_bytes);

    let hk = Hkdf::<Sha3_256>::new(Some(PQXDH_SALT), &ikm);
    let mut master_secret = [0u8; 32];
    hk.expand(PQXDH_INFO, &mut master_secret)
        .map_err(|e| ChaquantError::HandshakeError(format!("HKDF expand failed: {:?}", e)))?;

    let handshake_msg = PqxdhHandshakeMessage {
        initiator_identity_key_classical: *alice_identity.classical_public.as_bytes(),
        initiator_ephemeral_key_classical: *alice_ephemeral_public.as_bytes(),
        kem_ciphertext_bytes: ct_bytes.to_vec(),
    };

    Ok((master_secret, handshake_msg))
}

/// Ejecuta el rol de respondedor (Bob) en el apretón de manos PQXDH
pub fn pqxdh_respond(
    bob_identity: &IdentityKeyPair,
    bob_prekey_state: &BobPrekeyState,
    msg: &PqxdhHandshakeMessage,
) -> Result<[u8; 32], ChaquantError> {
    let alice_identity_public = X25519Public::from(msg.initiator_identity_key_classical);
    let alice_ephemeral_public = X25519Public::from(msg.initiator_ephemeral_key_classical);

    // 1. Calcular los tres Diffie-Hellman correspondientes
    let dh1 = bob_prekey_state.signed_prekey_secret.diffie_hellman(&alice_identity_public);
    let dh2 = bob_identity.classical_secret.diffie_hellman(&alice_ephemeral_public);
    let dh3 = bob_prekey_state.signed_prekey_secret.diffie_hellman(&alice_ephemeral_public);

    // 2. Decapsular ML-KEM-1024 con la clave privada de Bob
    let ct_array: [u8; CT_LEN] = msg
        .kem_ciphertext_bytes
        .as_slice()
        .try_into()
        .map_err(|_| ChaquantError::HandshakeError("Invalid ML-KEM ciphertext length".into()))?;

    let ciphertext = CipherText::try_from_bytes(ct_array)
        .map_err(|e| ChaquantError::HandshakeError(format!("Invalid ciphertext bytes: {:?}", e)))?;

    let shared_secret_kem = bob_prekey_state
        .kem_decapsulation_key
        .try_decaps(&ciphertext)
        .map_err(|e| ChaquantError::HandshakeError(format!("ML-KEM decapsulation failed: {:?}", e)))?;

    let ss_bytes = SerDes::into_bytes(shared_secret_kem);

    // 3. Derivar exactamente la misma clave maestra de sesión
    let mut ikm = Vec::with_capacity(32 * 3 + KEM_SS_LEN);
    ikm.extend_from_slice(dh1.as_bytes());
    ikm.extend_from_slice(dh2.as_bytes());
    ikm.extend_from_slice(dh3.as_bytes());
    ikm.extend_from_slice(&ss_bytes);

    let hk = Hkdf::<Sha3_256>::new(Some(PQXDH_SALT), &ikm);
    let mut master_secret = [0u8; 32];
    hk.expand(PQXDH_INFO, &mut master_secret)
        .map_err(|e| ChaquantError::HandshakeError(format!("HKDF expand failed: {:?}", e)))?;

    Ok(master_secret)
}
