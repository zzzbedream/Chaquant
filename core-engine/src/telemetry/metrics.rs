use serde::{Deserialize, Serialize};

use crate::fec::FecEngine;
use crate::ratchet::SpqrSession;

/// Métricas de postura de seguridad criptográfica y transporte (ET-02 / ET-04)
/// Expuestas para auditoría, telemetría B2B y cálculo del Security Score móvil.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct SecurityPostureMetrics {
    /// Época de rotación post-cuántica SPQR (número de ciclos de 10 mensajes completados)
    pub spqr_epoch: u32,
    /// Bits de entropía cuántica del KEM (1024 bits para ML-KEM-1024)
    pub pq_entropy_bits: u32,
    /// Ratio de redundancia FEC aplicado a la carga útil
    pub fec_overhead_ratio: f32,
    /// Indica si la sesión está activa y puede transmitir
    pub session_active: bool,
    /// Indica si la sesión fue destruida irreversiblemente en RAM
    pub is_destroyed: bool,
    /// Segundos restantes antes de la expiración TTL de Deal Room (si aplica)
    pub ttl_remaining_secs: Option<u64>,
}

impl SecurityPostureMetrics {
    pub fn collect(session: &SpqrSession, fec: Option<&FecEngine>) -> Self {
        let is_destroyed = session.is_destroyed();
        let spqr_epoch = session.spqr_epoch();
        let pq_entropy_bits = if is_destroyed { 0 } else { 1024 };

        let fec_overhead_ratio = if let Some(fec_engine) = fec {
            fec_engine.redundancy_ratio()
        } else {
            0.0
        };

        let current_time = session.current_time();
        let ttl_remaining_secs = session.expires_at_timestamp().and_then(|exp| {
            if exp > current_time {
                Some(exp - current_time)
            } else {
                Some(0)
            }
        });

        let session_active = !is_destroyed && ttl_remaining_secs.map(|r| r > 0).unwrap_or(true);

        Self {
            spqr_epoch,
            pq_entropy_bits,
            fec_overhead_ratio,
            session_active,
            is_destroyed,
            ttl_remaining_secs,
        }
    }
}
