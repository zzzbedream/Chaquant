use reed_solomon_erasure::galois_8::ReedSolomon;
use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};

use crate::error::ChaquantError;

pub const DEFAULT_SHARD_SIZE: usize = 1024; // Tamaño uniforme por fragmento Sphinx
pub const DEFAULT_PARITY_RATIO_NUM: usize = 4; // 4 shards de paridad por cada 10 de datos (~40% redundancia)
pub const DEFAULT_DATA_RATIO_DEN: usize = 10;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct FecFragment {
    pub message_id: [u8; 32],
    pub shard_index: usize,
    pub data_shards: usize,
    pub parity_shards: usize,
    pub original_len: usize,
    pub shard_hash: [u8; 32],
    pub payload: Vec<u8>,
}

impl FecFragment {
    /// Valida que el hash del fragmento coincida para prevenir Fragment Poisoning
    pub fn verify_integrity(&self) -> bool {
        let computed = Sha3_256::digest(&self.payload);
        computed.as_slice() == self.shard_hash
    }
}

pub struct FecEngine {
    data_shards: usize,
    parity_shards: usize,
    shard_size: usize,
    rs: ReedSolomon,
}

impl FecEngine {
    pub fn new(data_shards: usize, parity_shards: usize, shard_size: usize) -> Result<Self, ChaquantError> {
        let rs = ReedSolomon::new(data_shards, parity_shards)
            .map_err(|e| ChaquantError::FecError(format!("Reed-Solomon init failed: {:?}", e)))?;

        Ok(Self {
            data_shards,
            parity_shards,
            shard_size,
            rs,
        })
    }

    /// Divide y codifica un payload en fragmentos con redundancia FEC
    pub fn encode(&self, message_id: [u8; 32], data: &[u8]) -> Result<Vec<FecFragment>, ChaquantError> {
        let original_len = data.len();
        let total_shards = self.data_shards + self.parity_shards;
        let total_data_cap = self.data_shards * self.shard_size;

        if original_len > total_data_cap {
            return Err(ChaquantError::FecError(format!(
                "Payload size {} exceeds shard capacity {}",
                original_len, total_data_cap
            )));
        }

        // Crear shards con padding de ceros
        let mut shards: Vec<Vec<u8>> = Vec::with_capacity(total_shards);
        for i in 0..self.data_shards {
            let start = i * self.shard_size;
            let mut shard = vec![0u8; self.shard_size];
            if start < original_len {
                let end = (start + self.shard_size).min(original_len);
                shard[0..(end - start)].copy_from_slice(&data[start..end]);
            }
            shards.push(shard);
        }

        for _ in 0..self.parity_shards {
            shards.push(vec![0u8; self.shard_size]);
        }

        self.rs
            .encode(&mut shards)
            .map_err(|e| ChaquantError::FecError(format!("Reed-Solomon encode failed: {:?}", e)))?;

        let mut fragments = Vec::with_capacity(total_shards);
        for (idx, shard_data) in shards.into_iter().enumerate() {
            let hash = Sha3_256::digest(&shard_data);
            fragments.push(FecFragment {
                message_id,
                shard_index: idx,
                data_shards: self.data_shards,
                parity_shards: self.parity_shards,
                original_len,
                shard_hash: hash.into(),
                payload: shard_data,
            });
        }

        Ok(fragments)
    }

    /// Reconstruye el payload a partir de un subconjunto de fragmentos recibidos (tolerando pérdidas)
    pub fn decode(&self, fragments: &[FecFragment]) -> Result<Vec<u8>, ChaquantError> {
        if fragments.is_empty() {
            return Err(ChaquantError::FecError("No fragments provided".into()));
        }

        let total_shards = self.data_shards + self.parity_shards;
        let original_len = fragments[0].original_len;

        // Validar integridad de cada fragmento individual (filtro anti-envenenamiento)
        let mut shard_slots: Vec<Option<Vec<u8>>> = vec![None; total_shards];
        let mut valid_count = 0;

        for frag in fragments {
            if !frag.verify_integrity() {
                // Fragmento adulterado: se descarta
                continue;
            }
            if frag.shard_index < total_shards && shard_slots[frag.shard_index].is_none() {
                shard_slots[frag.shard_index] = Some(frag.payload.clone());
                valid_count += 1;
            }
        }

        if valid_count < self.data_shards {
            return Err(ChaquantError::FecError(format!(
                "Insufficient valid fragments: received {}, need at least {}",
                valid_count, self.data_shards
            )));
        }

        self.rs
            .reconstruct(&mut shard_slots)
            .map_err(|e| ChaquantError::FecError(format!("Reed-Solomon reconstruct failed: {:?}", e)))?;

        // Reensamblar los shards de datos
        let mut recovered_data = Vec::with_capacity(self.data_shards * self.shard_size);
        for shard_data in shard_slots.iter().take(self.data_shards).flatten() {
            recovered_data.extend_from_slice(shard_data);
        }

        recovered_data.truncate(original_len);
        Ok(recovered_data)
    }

    pub fn redundancy_ratio(&self) -> f32 {
        self.parity_shards as f32 / self.data_shards as f32
    }

    pub fn data_shards(&self) -> usize {
        self.data_shards
    }

    pub fn parity_shards(&self) -> usize {
        self.parity_shards
    }
}
