use std::collections::BTreeMap;
use fips204::ml_dsa_87::{self, PrivateKey as DsaPrivateKey, PublicKey as DsaPublicKey};
use fips204::traits::{Signer, Verifier};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};

use crate::error::ChaquantError;

/// Prueba Matemática de Supresión y Destrucción Forense de Datos (ET-11)
/// Emite un recibo determinista verificable mediante firma post-cuántica NIST FIPS 204 (ML-DSA-87)
/// y anclaje de nulificador siloed en Aztec Network L2.
///
/// Casos de uso dual:
/// 1. Defensa Forense: Prueba criptográfica de destrucción irrevocable ante incautación física de dispositivos
///    (protección de fuentes periodísticas, activistas de DD.HH., CSIRTs de infraestructura crítica).
/// 2. Cumplimiento Regulatorio: Certificación matemática del Derecho al Olvido (GDPR Art. 17, DORA, CCPA).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct CryptographicDestructionReceipt {
    pub session_id: String,
    pub deal_room_commitment: String,
    pub siloed_nullifier: String,
    pub enterprise_tenant_hash: String,
    pub revoked_at_timestamp: u64,
    pub destroyed_by_identity: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canonical_document_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature_dsa87: Option<String>,
}

impl CryptographicDestructionReceipt {
    pub fn new(
        session_id: impl Into<String>,
        deal_room_commitment: impl Into<String>,
        siloed_nullifier: impl Into<String>,
        enterprise_tenant_hash: impl Into<String>,
        revoked_at_timestamp: u64,
        destroyed_by_identity: impl Into<String>,
    ) -> Self {
        Self {
            session_id: session_id.into(),
            deal_room_commitment: deal_room_commitment.into(),
            siloed_nullifier: siloed_nullifier.into(),
            enterprise_tenant_hash: enterprise_tenant_hash.into(),
            revoked_at_timestamp,
            destroyed_by_identity: destroyed_by_identity.into(),
            canonical_document_hash: None,
            signature_dsa87: None,
        }
    }

    /// Serializa los datos esenciales del recibo en formato JSON canónico determinista
    /// (claves ordenadas alfabéticamente en BTreeMap, sin espacios ni campos de firma).
    pub fn canonical_json(&self) -> Result<String, ChaquantError> {
        let mut map = BTreeMap::new();
        let timestamp_str = self.revoked_at_timestamp.to_string();

        map.insert("deal_room_commitment", self.deal_room_commitment.as_str());
        map.insert("destroyed_by_identity", self.destroyed_by_identity.as_str());
        map.insert("enterprise_tenant_hash", self.enterprise_tenant_hash.as_str());
        map.insert("revoked_at_timestamp", timestamp_str.as_str());
        map.insert("session_id", self.session_id.as_str());
        map.insert("siloed_nullifier", self.siloed_nullifier.as_str());

        serde_json::to_string(&map)
            .map_err(|e| ChaquantError::SerializationError(format!("Canonical JSON serialization failed: {}", e)))
    }

    /// Calcula el digest SHA3-256 del JSON canónico
    pub fn calculate_canonical_digest(&self) -> Result<[u8; 32], ChaquantError> {
        let canonical = self.canonical_json()?;
        let mut hasher = Sha3_256::new();
        hasher.update(canonical.as_bytes());
        let digest_result = hasher.finalize();
        let mut hash_arr = [0u8; 32];
        hash_arr.copy_from_slice(&digest_result);
        Ok(hash_arr)
    }

    /// Firma el digest canónico con la clave privada ML-DSA-87 (FIPS 204)
    pub fn sign_with_dsa87(&mut self, signing_key: &DsaPrivateKey) -> Result<(), ChaquantError> {
        let digest = self.calculate_canonical_digest()?;
        let sig = signing_key
            .try_sign(&digest, b"ChaquantLegalDestructionCert")
            .map_err(|e| ChaquantError::CryptoError(format!("ML-DSA-87 signing error: {:?}", e)))?;

        self.canonical_document_hash = Some(hex::encode(digest));
        self.signature_dsa87 = Some(hex::encode(&sig));
        Ok(())
    }

    /// Verifica la firma ML-DSA-87 del certificado contra la clave pública del firmante
    pub fn verify_signature(&self, verifying_key: &DsaPublicKey) -> Result<bool, ChaquantError> {
        let sig_hex = self.signature_dsa87.as_ref().ok_or_else(|| {
            ChaquantError::CryptoError("Certificate does not contain an ML-DSA-87 signature".into())
        })?;

        let sig_bytes = hex::decode(sig_hex)
            .map_err(|e| ChaquantError::CryptoError(format!("Invalid signature hex: {}", e)))?;

        let sig_arr: [u8; ml_dsa_87::SIG_LEN] = sig_bytes
            .as_slice()
            .try_into()
            .map_err(|_| ChaquantError::CryptoError("Invalid ML-DSA-87 signature length".into()))?;

        let digest = self.calculate_canonical_digest()?;

        let is_valid = verifying_key.verify(&digest, &sig_arr, b"ChaquantLegalDestructionCert");
        Ok(is_valid)
    }
}
