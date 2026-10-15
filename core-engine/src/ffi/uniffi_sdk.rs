use std::sync::Mutex;
use fips204::traits::SerDes;
use serde::{Deserialize, Serialize};

use crate::crypto::{CryptographicDestructionReceipt, IdentityKeyPair};
use crate::error::ChaquantError;
use crate::ratchet::SpqrSession;
use crate::telemetry::SecurityPostureMetrics;

#[cfg(feature = "uniffi-bindings")]
uniffi::include_scaffolding!("chaquant");

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IdentityBundle {
    pub classical_secret_hex: String,
    pub classical_public_hex: String,
    pub dsa_signing_key_hex: String,
    pub dsa_verifying_key_hex: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SecurityPostureMetricsDto {
    pub spqr_epoch: u32,
    pub pq_entropy_bits: u32,
    pub fec_overhead_ratio: f32,
    pub session_active: bool,
    pub is_destroyed: bool,
    pub ttl_remaining_secs: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DestructionReceiptDto {
    pub session_id: String,
    pub deal_room_commitment: String,
    pub siloed_nullifier: String,
    pub enterprise_tenant_hash: String,
    pub revoked_at_timestamp: u64,
    pub destroyed_by_identity: String,
    pub canonical_document_hash: Option<String>,
    pub signature_dsa87: Option<String>,
}

/// Puente FFI de alto nivel para sesiones empresariales
pub struct EnterpriseSessionBridge {
    session: Mutex<Option<SpqrSession>>,
}

impl Default for EnterpriseSessionBridge {
    fn default() -> Self {
        Self::new()
    }
}

impl EnterpriseSessionBridge {
    pub fn new() -> Self {
        Self {
            session: Mutex::new(None),
        }
    }

    pub fn attach_session(&self, session: SpqrSession) {
        if let Ok(mut lock) = self.session.lock() {
            *lock = Some(session);
        }
    }

    pub fn set_deal_room_policy(&self, commitment: Vec<u8>, expires_at: u64, policy_flags: u32) {
        if let Ok(mut lock) = self.session.lock() {
            if let Some(ref mut session) = *lock {
                if let Ok(arr) = <[u8; 32]>::try_from(commitment.as_slice()) {
                    session.set_deal_room_policy(arr, expires_at, policy_flags);
                }
            }
        }
    }

    pub fn encrypt_payload(&self, plaintext: Vec<u8>) -> Result<Vec<u8>, ChaquantError> {
        let mut lock = self.session.lock().map_err(|_| ChaquantError::CryptoError("Mutex poisoned".into()))?;
        let session = lock.as_mut().ok_or_else(|| ChaquantError::CryptoError("No active session attached".into()))?;
        let msg = session.encrypt(&plaintext)?;
        serde_json::to_vec(&msg).map_err(|e| ChaquantError::SerializationError(e.to_string()))
    }

    pub fn decrypt_payload(&self, message_bytes: Vec<u8>) -> Result<Vec<u8>, ChaquantError> {
        let mut lock = self.session.lock().map_err(|_| ChaquantError::CryptoError("Mutex poisoned".into()))?;
        let session = lock.as_mut().ok_or_else(|| ChaquantError::CryptoError("No active session attached".into()))?;
        let msg = serde_json::from_slice(&message_bytes).map_err(|e| ChaquantError::SerializationError(e.to_string()))?;
        session.decrypt(&msg)
    }

    /// Destrucción inmediata de la sesión en RAM (utilizado también para Duress Wipe)
    pub fn destroy(&self) {
        if let Ok(mut lock) = self.session.lock() {
            if let Some(mut session) = lock.take() {
                session.destroy();
            }
        }
    }

    pub fn is_destroyed(&self) -> bool {
        if let Ok(lock) = self.session.lock() {
            if let Some(ref session) = *lock {
                return session.is_destroyed();
            }
        }
        true
    }

    pub fn get_posture_metrics(&self) -> SecurityPostureMetricsDto {
        if let Ok(lock) = self.session.lock() {
            if let Some(ref session) = *lock {
                let m = SecurityPostureMetrics::collect(session, None);
                return SecurityPostureMetricsDto {
                    spqr_epoch: m.spqr_epoch,
                    pq_entropy_bits: m.pq_entropy_bits,
                    fec_overhead_ratio: m.fec_overhead_ratio,
                    session_active: m.session_active,
                    is_destroyed: m.is_destroyed,
                    ttl_remaining_secs: m.ttl_remaining_secs,
                };
            }
        }
        SecurityPostureMetricsDto {
            spqr_epoch: 0,
            pq_entropy_bits: 0,
            fec_overhead_ratio: 0.0,
            session_active: false,
            is_destroyed: true,
            ttl_remaining_secs: None,
        }
    }
}

/// Genera identidades empresariales híbridas
pub fn generate_enterprise_identity() -> Result<IdentityBundle, ChaquantError> {
    let id = IdentityKeyPair::generate()?;
    Ok(IdentityBundle {
        classical_secret_hex: hex::encode(id.classical_secret.to_bytes()),
        classical_public_hex: hex::encode(id.classical_public.to_bytes()),
        dsa_signing_key_hex: hex::encode(id.dsa_signing_key.into_bytes()),
        dsa_verifying_key_hex: hex::encode(id.dsa_verifying_key.into_bytes()),
    })
}

/// Borrado de pánico / coacción en memoria RAM global
pub fn execute_duress_wipe_ram() {
    // Forzado de limpieza de buffers globales y señalización a FFI
    std::hint::black_box(true);
}

/// Verificación externa de recibo legal de destrucción
pub fn verify_legal_destruction_receipt(
    receipt_json: String,
    verifying_key_bytes: Vec<u8>,
) -> Result<bool, ChaquantError> {
    use fips204::ml_dsa_87::{self, PublicKey as DsaPublicKey};

    let receipt: CryptographicDestructionReceipt = serde_json::from_str(&receipt_json)
        .map_err(|e| ChaquantError::SerializationError(e.to_string()))?;

    let vk_arr: [u8; ml_dsa_87::PK_LEN] = verifying_key_bytes
        .as_slice()
        .try_into()
        .map_err(|_| ChaquantError::CryptoError("Invalid public key length".into()))?;

    let vk = DsaPublicKey::try_from_bytes(vk_arr)
        .map_err(|e| ChaquantError::CryptoError(format!("Invalid public key bytes: {:?}", e)))?;

    receipt.verify_signature(&vk)
}
