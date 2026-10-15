use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};

use crate::error::ChaquantError;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct BlindPushToken {
    /// Token opaco generado por el receptor y compartido solo con el relayer
    pub recipient_app_blinded_id: [u8; 32],
    /// Marca de tiempo redondeada a la época de 1 hora para evitar correlación precisa
    pub epoch_timestamp: u64,
    /// Salt de entropía única
    pub nonce: [u8; 16],
}

impl BlindPushToken {
    pub fn generate_for_recipient(blinded_id: [u8; 32], current_time_secs: u64) -> Self {
        let mut nonce = [0u8; 16];
        OsRng.fill_bytes(&mut nonce);
        // Redondeo de tiempo a bloques de 3600 segundos (1 hora)
        let epoch_timestamp = (current_time_secs / 3600) * 3600;

        Self {
            recipient_app_blinded_id: blinded_id,
            epoch_timestamp,
            nonce,
        }
    }

    /// Genera la señal de pulso ciego (Ping sin metadatos ni payload)
    pub fn create_pulse_digest(&self) -> [u8; 32] {
        let mut hasher = Sha3_256::new();
        hasher.update(self.recipient_app_blinded_id);
        hasher.update(self.epoch_timestamp.to_le_bytes());
        hasher.update(self.nonce);
        hasher.finalize().into()
    }

    /// Valida que el pulso coincida con el registro del receptor sin exponer remitente
    pub fn verify_pulse(&self, pulse_digest: &[u8; 32]) -> Result<bool, ChaquantError> {
        let expected = self.create_pulse_digest();
        Ok(&expected == pulse_digest)
    }
}
