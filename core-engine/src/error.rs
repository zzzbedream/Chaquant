use thiserror::Error;

#[derive(Error, Debug)]
pub enum ChaquantError {
    #[error("Cryptographic error: {0}")]
    CryptoError(String),

    #[error("PQXDH Handshake failed: {0}")]
    HandshakeError(String),

    #[error("SPQR Ratchet desynchronization: {0}")]
    RatchetDesync(String),

    #[error("Reed-Solomon FEC reconstruction failed: {0}")]
    FecError(String),

    #[error("Transport error: {0}")]
    TransportError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Session revoked in Aztec nullifier registry")]
    SessionRevoked,

    #[error("Session expired")]
    SessionExpired,

    #[error("Policy violation: {0}")]
    PolicyViolation(String),
}
