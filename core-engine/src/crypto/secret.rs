use std::fmt;
use std::ops::Deref;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Wrapper newtype que protege secretos criptográficos en memoria RAM.
/// Implementa Zeroize y ZeroizeOnDrop para garantizar borrado físico de la memoria.
#[derive(Clone, PartialEq, Eq, Zeroize, ZeroizeOnDrop)]
pub struct SecretBytes(pub [u8; 32]);

impl SecretBytes {
    pub const fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }

    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }

    pub fn to_bytes(&self) -> [u8; 32] {
        self.0
    }

    pub fn is_zero(&self) -> bool {
        self.0.iter().all(|&b| b == 0)
    }
}

impl Deref for SecretBytes {
    type Target = [u8; 32];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl From<[u8; 32]> for SecretBytes {
    fn from(bytes: [u8; 32]) -> Self {
        Self::new(bytes)
    }
}

impl Default for SecretBytes {
    fn default() -> Self {
        Self([0u8; 32])
    }
}

impl fmt::Debug for SecretBytes {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SecretBytes([*** REDACTED ***])")
    }
}
