use aes_gcm::{
    aead::{Aead, KeyInit, Payload as AeadPayload},
    Aes256Gcm, Nonce,
};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};

use crate::error::ChaquantError;

pub const NONCE_LEN: usize = 12;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct EncryptedPayload {
    pub nonce: [u8; NONCE_LEN],
    pub ciphertext: Vec<u8>,
}

/// Cifra una carga útil (texto o binario) con AES-256-GCM
pub fn encrypt_aes_256_gcm(
    key: &[u8; 32],
    plaintext: &[u8],
    associated_data: &[u8],
) -> Result<EncryptedPayload, ChaquantError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| ChaquantError::CryptoError(format!("Invalid AES key: {:?}", e)))?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let payload = AeadPayload {
        msg: plaintext,
        aad: associated_data,
    };

    let ciphertext = cipher
        .encrypt(nonce, payload)
        .map_err(|e| ChaquantError::CryptoError(format!("AES encryption failed: {:?}", e)))?;

    Ok(EncryptedPayload {
        nonce: nonce_bytes,
        ciphertext,
    })
}

/// Descifra y autentica una carga útil con AES-256-GCM
pub fn decrypt_aes_256_gcm(
    key: &[u8; 32],
    payload: &EncryptedPayload,
    associated_data: &[u8],
) -> Result<Vec<u8>, ChaquantError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| ChaquantError::CryptoError(format!("Invalid AES key: {:?}", e)))?;

    let nonce = Nonce::from_slice(&payload.nonce);
    let aead_payload = AeadPayload {
        msg: &payload.ciphertext,
        aad: associated_data,
    };

    cipher
        .decrypt(nonce, aead_payload)
        .map_err(|e| ChaquantError::CryptoError(format!("AES decryption / tag verification failed: {:?}", e)))
}
