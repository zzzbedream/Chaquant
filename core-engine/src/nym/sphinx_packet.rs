use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};

use crate::error::ChaquantError;
use crate::fec::FecFragment;

pub const SPHINX_PAYLOAD_SIZE: usize = 1536; // MTU de carga útil estándar en Sphinx

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum PacketType {
    RealData,
    CoverTrafficDummy,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct SphinxPacket {
    pub packet_type: PacketType,
    pub payload_bytes: Vec<u8>,
    pub padding: Vec<u8>,
}

impl SphinxPacket {
    /// Empaqueta un fragmento FEC en un paquete Sphinx de longitud uniforme estricta
    pub fn new_real(fragment: FecFragment) -> Result<Self, ChaquantError> {
        let binary_payload = serialize_fragment(&fragment);

        if binary_payload.len() > SPHINX_PAYLOAD_SIZE {
            return Err(ChaquantError::TransportError(format!(
                "Binary fragment size {} exceeds Sphinx packet size {}",
                binary_payload.len(),
                SPHINX_PAYLOAD_SIZE
            )));
        }

        let padding_needed = SPHINX_PAYLOAD_SIZE - binary_payload.len();
        let mut padding = vec![0u8; padding_needed];
        OsRng.fill_bytes(&mut padding);

        Ok(Self {
            packet_type: PacketType::RealData,
            payload_bytes: binary_payload,
            padding,
        })
    }

    /// Genera un paquete de tráfico de cobertura (dummy) estadísticamente indistinguible
    pub fn new_cover_traffic() -> Self {
        let mut dummy_bytes = vec![0u8; SPHINX_PAYLOAD_SIZE];
        OsRng.fill_bytes(&mut dummy_bytes);

        Self {
            packet_type: PacketType::CoverTrafficDummy,
            payload_bytes: dummy_bytes,
            padding: Vec::new(),
        }
    }

    pub fn is_dummy(&self) -> bool {
        matches!(self.packet_type, PacketType::CoverTrafficDummy)
    }

    pub fn extract_fragment(&self) -> Result<Option<FecFragment>, ChaquantError> {
        match self.packet_type {
            PacketType::RealData => {
                let frag = deserialize_fragment(&self.payload_bytes)?;
                Ok(Some(frag))
            }
            PacketType::CoverTrafficDummy => Ok(None),
        }
    }
}

// Serialización binaria compacta de fragmentos para ajustarse a los límites de MTU de Sphinx
fn serialize_fragment(f: &FecFragment) -> Vec<u8> {
    let mut out = Vec::with_capacity(80 + f.payload.len());
    out.extend_from_slice(&f.message_id);
    out.extend_from_slice(&(f.shard_index as u32).to_be_bytes());
    out.extend_from_slice(&(f.data_shards as u32).to_be_bytes());
    out.extend_from_slice(&(f.parity_shards as u32).to_be_bytes());
    out.extend_from_slice(&(f.original_len as u32).to_be_bytes());
    out.extend_from_slice(&f.shard_hash);
    out.extend_from_slice(&(f.payload.len() as u32).to_be_bytes());
    out.extend_from_slice(&f.payload);
    out
}

fn deserialize_fragment(bytes: &[u8]) -> Result<FecFragment, ChaquantError> {
    if bytes.len() < 84 {
        return Err(ChaquantError::SerializationError("Packet buffer too short".into()));
    }
    let mut msg_id = [0u8; 32];
    msg_id.copy_from_slice(&bytes[0..32]);

    let shard_index = u32::from_be_bytes(bytes[32..36].try_into().unwrap()) as usize;
    let data_shards = u32::from_be_bytes(bytes[36..40].try_into().unwrap()) as usize;
    let parity_shards = u32::from_be_bytes(bytes[40..44].try_into().unwrap()) as usize;
    let original_len = u32::from_be_bytes(bytes[44..48].try_into().unwrap()) as usize;

    let mut shard_hash = [0u8; 32];
    shard_hash.copy_from_slice(&bytes[48..80]);

    let payload_len = u32::from_be_bytes(bytes[80..84].try_into().unwrap()) as usize;
    if bytes.len() < 84 + payload_len {
        return Err(ChaquantError::SerializationError("Truncated fragment payload".into()));
    }
    let payload = bytes[84..84 + payload_len].to_vec();

    Ok(FecFragment {
        message_id: msg_id,
        shard_index,
        data_shards,
        parity_shards,
        original_len,
        shard_hash,
        payload,
    })
}
