use std::ffi::CString;
use std::os::raw::c_char;

use fips204::traits::SerDes;
use serde::{Deserialize, Serialize};

use crate::crypto::IdentityKeyPair;
use crate::fec::FecEngine;

#[derive(Serialize, Deserialize)]
pub struct IdentityJson {
    pub classical_secret_hex: String,
    pub classical_public_hex: String,
    pub dsa_signing_key_hex: String,
    pub dsa_verifying_key_hex: String,
}

/// Libera la memoria de cualquier string asignado en Rust y retornado a FFI
///
/// # Safety
/// El puntero `ptr` debe haber sido obtenido previamente mediante una función de este módulo
/// (`to_c_string` o `error_c_string`) y no debe haber sido liberado con anterioridad.
#[no_mangle]
pub unsafe extern "C" fn chaquant_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
}

/// Genera un nuevo par de claves de identidad clásico + post-cuántico (X25519 + ML-DSA-87)
#[no_mangle]
pub extern "C" fn chaquant_generate_identity() -> *mut c_char {
    match IdentityKeyPair::generate() {
        Ok(id) => {
            let json = IdentityJson {
                classical_secret_hex: hex::encode(id.classical_secret.to_bytes()),
                classical_public_hex: hex::encode(id.classical_public.to_bytes()),
                dsa_signing_key_hex: hex::encode(id.dsa_signing_key.into_bytes()),
                dsa_verifying_key_hex: hex::encode(id.dsa_verifying_key.into_bytes()),
            };
            to_c_string(&json)
        }
        Err(e) => error_c_string(&e.to_string()),
    }
}

/// Codifica un buffer de datos con Reed-Solomon FEC en fragmentos Sphinx
///
/// # Safety
/// `data_ptr` debe ser un puntero válido y legible a un buffer contiguo de al menos `data_len` bytes.
#[no_mangle]
pub unsafe extern "C" fn chaquant_fec_encode(
    data_ptr: *const u8,
    data_len: usize,
    data_shards: usize,
    parity_shards: usize,
    shard_size: usize,
) -> *mut c_char {
    if data_ptr.is_null() || data_len == 0 {
        return error_c_string("Invalid input buffer");
    }

    let slice = unsafe { std::slice::from_raw_parts(data_ptr, data_len) };
    let fec = match FecEngine::new(data_shards, parity_shards, shard_size) {
        Ok(f) => f,
        Err(e) => return error_c_string(&e.to_string()),
    };

    let msg_id = [0x55u8; 32];
    match fec.encode(msg_id, slice) {
        Ok(fragments) => to_c_string(&fragments),
        Err(e) => error_c_string(&e.to_string()),
    }
}

/// Ejecuta la destrucción forzada de memoria en el motor para protocolos de coacción (Duress Wipe)
#[no_mangle]
pub extern "C" fn chaquant_duress_wipe_ram() -> i32 {
    execute_duress_wipe_ram();
    0 // Éxito
}

// Helpers internos para conversión FFI segura
fn to_c_string<T: Serialize>(val: &T) -> *mut c_char {
    let json_str = serde_json::to_string(val).unwrap_or_else(|_| "{}".into());
    CString::new(json_str).unwrap().into_raw()
}

fn error_c_string(msg: &str) -> *mut c_char {
    let err_obj = serde_json::json!({ "error": msg });
    CString::new(err_obj.to_string()).unwrap().into_raw()
}

pub mod uniffi_sdk;
pub use uniffi_sdk::*;
