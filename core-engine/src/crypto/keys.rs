use fips203::ml_kem_1024::{self, DecapsKey};
use fips203::traits::{KeyGen as KemKeyGen, SerDes as KemSerDes};
use fips204::ml_dsa_87::{self, PrivateKey as DsaPrivateKey, PublicKey as DsaPublicKey};
use fips204::traits::{KeyGen as DsaKeyGen, SerDes as DsaSerDes, Signer, Verifier};
use rand::rngs::OsRng;
use x25519_dalek::{PublicKey as X25519Public, StaticSecret as X25519Secret};

use crate::error::ChaquantError;

/// Par de claves de identidad clásica y post-cuántica
pub struct IdentityKeyPair {
    pub classical_secret: X25519Secret,
    pub classical_public: X25519Public,
    pub dsa_signing_key: DsaPrivateKey,
    pub dsa_verifying_key: DsaPublicKey,
}

impl IdentityKeyPair {
    pub fn generate() -> Result<Self, ChaquantError> {
        let rng = OsRng;
        let classical_secret = X25519Secret::random_from_rng(rng);
        let classical_public = X25519Public::from(&classical_secret);

        let (dsa_verifying_key, dsa_signing_key) = ml_dsa_87::KG::try_keygen()
            .map_err(|e| ChaquantError::CryptoError(format!("ML-DSA keygen failed: {:?}", e)))?;

        Ok(Self {
            classical_secret,
            classical_public,
            dsa_signing_key,
            dsa_verifying_key,
        })
    }
}

/// Paquete de Preclaves para el apretón de manos PQXDH
#[derive(Clone)]
pub struct PrekeyBundle {
    pub identity_key_classical: [u8; 32],
    pub signed_prekey_classical: [u8; 32],
    pub dsa_verifying_key_bytes: Vec<u8>,
    pub signature_bytes: Vec<u8>,
    pub kem_encapsulation_key_bytes: Vec<u8>,
}

impl PrekeyBundle {
    pub fn verify_signature(&self) -> Result<bool, ChaquantError> {
        let vk_array: [u8; ml_dsa_87::PK_LEN] = self.dsa_verifying_key_bytes.as_slice().try_into()
            .map_err(|_| ChaquantError::CryptoError("Invalid ML-DSA-87 public key length".into()))?;
        
        let verifying_key = DsaPublicKey::try_from_bytes(vk_array)
            .map_err(|e| ChaquantError::CryptoError(format!("Invalid ML-DSA public key bytes: {:?}", e)))?;

        let sig_array: [u8; ml_dsa_87::SIG_LEN] = self.signature_bytes.as_slice().try_into()
            .map_err(|_| ChaquantError::CryptoError("Invalid ML-DSA-87 signature length".into()))?;

        let mut signed_data = Vec::with_capacity(32 + self.kem_encapsulation_key_bytes.len());
        signed_data.extend_from_slice(&self.signed_prekey_classical);
        signed_data.extend_from_slice(&self.kem_encapsulation_key_bytes);

        let valid = verifying_key.verify(&signed_data, &sig_array, &[]);
        Ok(valid)
    }
}

/// Estado del respondedor (Bob) para descifrar el apretón de manos inicial
pub struct BobPrekeyState {
    pub signed_prekey_secret: X25519Secret,
    pub kem_decapsulation_key: DecapsKey,
    pub bundle: PrekeyBundle,
}

impl BobPrekeyState {
    pub fn generate(identity: &IdentityKeyPair) -> Result<Self, ChaquantError> {
        let rng = OsRng;
        let signed_prekey_secret = X25519Secret::random_from_rng(rng);
        let signed_prekey_public = X25519Public::from(&signed_prekey_secret);

        let (kem_ek, kem_dk) = ml_kem_1024::KG::try_keygen()
            .map_err(|e| ChaquantError::CryptoError(format!("ML-KEM keygen failed: {:?}", e)))?;

        let kem_ek_bytes: [u8; ml_kem_1024::EK_LEN] = kem_ek.into_bytes();

        let mut signed_data = Vec::with_capacity(32 + kem_ek_bytes.len());
        signed_data.extend_from_slice(signed_prekey_public.as_bytes());
        signed_data.extend_from_slice(&kem_ek_bytes);

        let signature = identity.dsa_signing_key.try_sign(&signed_data, &[])
            .map_err(|e| ChaquantError::CryptoError(format!("ML-DSA signing failed: {:?}", e)))?;

        let bundle = PrekeyBundle {
            identity_key_classical: *identity.classical_public.as_bytes(),
            signed_prekey_classical: *signed_prekey_public.as_bytes(),
            dsa_verifying_key_bytes: identity.dsa_verifying_key.clone().into_bytes().to_vec(),
            signature_bytes: signature.to_vec(),
            kem_encapsulation_key_bytes: kem_ek_bytes.to_vec(),
        };

        Ok(Self {
            signed_prekey_secret,
            kem_decapsulation_key: kem_dk,
            bundle,
        })
    }
}
