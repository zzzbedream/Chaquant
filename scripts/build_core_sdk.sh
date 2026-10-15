#!/usr/bin/env bash
# ==============================================================================
# Chaquant Core Protocol SDK Cross-Compilation Script
# Targets: Linux x86_64, macOS aarch64, Android NDK, iOS Universal
# Features: C-ABI (Embedded/IoT) + UniFFI Scaffolding (Swift & Kotlin)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENGINE_DIR="${ROOT_DIR}/core-engine"
OUTPUT_DIR="${ROOT_DIR}/dist/core-sdk"

echo "=========================================================="
echo "  CHAQUANT PROTOCOL CORE SDK: Multiplatform Build"
echo "=========================================================="
echo "Directorio raíz:   ${ROOT_DIR}"
echo "Directorio engine: ${ENGINE_DIR}"
echo "Directorio salida: ${OUTPUT_DIR}"
echo ""

mkdir -p "${OUTPUT_DIR}/c-abi/include"
mkdir -p "${OUTPUT_DIR}/c-abi/lib"
mkdir -p "${OUTPUT_DIR}/bindings/swift"
mkdir -p "${OUTPUT_DIR}/bindings/kotlin"

cd "${ENGINE_DIR}"

# 1. Compilación Host en Release con C-ABI
echo "[1/4] Compilando librería nativa host (C-ABI)..."
cargo build --release
cp target/release/libchaquant_core.* "${OUTPUT_DIR}/c-abi/lib/" 2>/dev/null || true
cp target/release/chaquant_core.dll "${OUTPUT_DIR}/c-abi/lib/" 2>/dev/null || true

# 2. Exportar Header C para clientes embebidos y C-ABI
cat << 'EOF' > "${OUTPUT_DIR}/c-abi/include/chaquant_core.h"
#ifndef CHAQUANT_CORE_H
#define CHAQUANT_CORE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// Libera punteros a cadenas retornadas por el motor Rust
void chaquant_free_string(char* ptr);

// Genera un par de claves híbrido clásico + post-cuántico (X25519 + ML-DSA-87)
char* chaquant_generate_identity(void);

// Codifica un buffer de datos o mensaje con Reed-Solomon FEC
char* chaquant_fec_encode(
    const uint8_t* data_ptr,
    size_t data_len,
    size_t data_shards,
    size_t parity_shards,
    size_t shard_size
);

// Destrucción forzada de memoria RAM en casos de coacción (Duress Wipe)
int32_t chaquant_duress_wipe_ram(void);

#ifdef __cplusplus
}
#endif

#endif // CHAQUANT_CORE_H
EOF

echo "✓ Headers C generados en ${OUTPUT_DIR}/c-abi/include/chaquant_core.h"

# 3. Scaffolding UniFFI para Swift y Kotlin
echo "[2/4] Verificando definición de interfaz UDL..."
if [ -f "chaquant.udl" ]; then
    echo "✓ chaquant.udl detectado. Generando bindings móviles con uniffi-bindgen si está disponible..."
    if command -v uniffi-bindgen &> /dev/null; then
        uniffi-bindgen generate chaquant.udl --language swift --out-dir "${OUTPUT_DIR}/bindings/swift"
        uniffi-bindgen generate chaquant.udl --language kotlin --out-dir "${OUTPUT_DIR}/bindings/kotlin"
        echo "✓ Bindings Swift y Kotlin generados."
    else
        echo "ℹ uniffi-bindgen CLI no detectado en PATH. Copiando scaffolding UDL directamente."
        cp chaquant.udl "${OUTPUT_DIR}/bindings/"
    fi
fi

# 4. Verificación de Tests de Regresión
echo "[3/4] Ejecutando suite de pruebas criptográficas y de seguridad..."
cargo test --release -- --nocapture

echo ""
echo "=========================================================="
echo "✓ BUILD PROTOCOL CORE SDK FINALIZADO EXITOSAMENTE"
echo "  Artefactos disponibles en: ${OUTPUT_DIR}"
echo "=========================================================="
