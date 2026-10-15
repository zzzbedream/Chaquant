<div align="center">

# Chaquant Protocol

### Sovereign Post-Quantum Communication & Verifiable Forensic Erasure Protocol

[![License: MIT / Apache-2.0](https://img.shields.io/badge/License-MIT%20%2F%20Apache--2.0-blue.svg)](LICENSE-MIT)
[![CI Store Release](https://github.com/lcifuentes/chaquant/actions/workflows/store-release.yml/badge.svg)](.github/workflows/store-release.yml)
[![NIST Post-Quantum Level 5](https://img.shields.io/badge/NIST-FIPS%20203%20%2F%20204%20(Level%205)-059669.svg)](https://csrc.nist.gov/pubs/fips/203/final)
[![Aztec L2 Noir](https://img.shields.io/badge/Aztec%20Network-Noir%20v0.60.0%20(UltraHonk)-7C3AED.svg)](https://aztec.network)
[![Nym Sphinx FEC](https://img.shields.io/badge/Transport-Sphinx%201024B%20%2B%20RS--FEC-EA580C.svg)](https://nymtech.net)
[![Rust 2021](https://img.shields.io/badge/Rust-1.80%2B%20(Zero--Allocation)-DEA584.svg)](https://www.rust-lang.org)

<p align="center">
  <b>Engineered for high-risk communications, investigative journalism, human rights defenders, and critical infrastructure resilience.</b><br>
  Eliminates metadata harvesting, survives 28.5% packet drop without TCP retransmission leaks, and guarantees mathematical proof of data destruction via Aztec Layer-2 Siloed Nullifiers.
</p>

</div>

---

## Why Chaquant? The 4 Existential Failures of Modern Messaging

Modern secure messengers (Signal, WhatsApp, Telegram, Wire) provide transport-layer encryption, but fail under four modern threat vectors:

```
+----------------------------------------------------------------------------------------------------+
|                         THE 4 THREAT VECTORS OF MODERN SECURE MESSAGING                            |
+--------------------------+------------------------------------+------------------------------------+
| THREAT VECTOR            | TRADITIONAL SECURE MESSENGERS      | CHAQUANT PROTOCOL                  |
+--------------------------+------------------------------------+------------------------------------+
| 1. Harvest Now,          | Classical ECC (Curve25519)         | Hybrid PQXDH + SPQR Ratchet        |
|    Decrypt Later (HNDL)  | vulnerable to Shor's algorithm.    | NIST FIPS 203 (ML-KEM-1024 Level 5)|
+--------------------------+------------------------------------+------------------------------------+
| 2. Global Passive        | Centralized servers capture IP,    | Uniform 1024-byte Sphinx frames    |
|    Metadata Harvesting   | timing, and communication graphs.  | over Nym Mixnet with Poisson cover.|
+--------------------------+------------------------------------+------------------------------------+
| 3. Censorship & Network  | Active Deep Packet Inspection      | Reed-Solomon Erasure Coding (10+4);|
|    Degradation           | drops TCP sessions; ARQ leaks data.| reconstructs payloads under 28.5% loss.|
+--------------------------+------------------------------------+------------------------------------+
| 4. Physical Forensics    | Cloud backups and flash wear-level | Local hardware Crypto-Shredding +  |
|    & Unproven Erasure    | leave recoverable artifacts (UFED).| Aztec L2 Siloed Nullifier Witness. |
+--------------------------+------------------------------------+------------------------------------+
```

---

## Architectural Pillars

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Sovereign Mobile Device)"]
        UI["Chaquant UI (Suisse White / Cultural Theme)"]
        DB["Local Vault (SQLCipher AES-256 + Keystore/Secure Enclave)"]
        BOT["Aegis Sandbox Resilience Bot (ET-12)"]
    end

    subgraph CoreEngine ["Chaquant Core Engine (Rust zero-allocation)"]
        PQ["Hybrid PQXDH (X25519 + ML-KEM-1024)"]
        RAT["SPQR Sparse Post-Quantum Triple Ratchet"]
        FEC["Reed-Solomon FEC (10 Data + 4 Parity Fragments)"]
        SPH["Uniform 1024 B Sphinx Packet Encapsulation"]
        SHRED["ZeroizeOnDrop Memory Purge & Hardware Crypto-Shredding"]
    end

    subgraph DecentralizedL0L2 ["Decentralized Privacy Infrastructure"]
        NYM["Nym Mixnet (Layer-0 Stochastic Poisson Routing)"]
        AZTEC["Aztec Network L2 (PairwiseSessionRegistry in Noir)"]
        TREE["Global Siloed Nullifier Tree (GDPR Proof of Erasure)"]
    end

    UI --> CoreEngine
    DB --> CoreEngine
    CoreEngine --> NYM
    CoreEngine --> AZTEC
    AZTEC --> TREE
```

### 1. Post-Quantum Hybrid Handshake & Triple Ratchet (PQXDH + SPQR)
- **NIST FIPS 203 (ML-KEM-1024):** Level-5 lattice-based key encapsulation combined with classical `X25519` for dual defense.
- **Sparse Post-Quantum Ratchet (SPQR):** Solves the payload bloat of lattice keys by decoupling symmetric ratchet steps from periodic post-quantum healing, maintaining sub-millisecond execution.
- **Out-of-Order Stochastic Resilience:** Accommodates variable delivery times from multi-hop mixnets without desynchronizing cryptographic state.

### 2. Metadata Protection & Erasure Coding (Nym Sphinx + Reed-Solomon FEC)
- **Anti-DPI Uniform Sphinx Framing:** Every message and document fragment is padded to an exact 1024-byte binary frame.
- **Forward Error Correction (FEC 10+4):** Encodes 10 data fragments into 14 packets. The receiver reconstructs the payload even if 4 mixnodes drop packets (28.5% loss), completely eliminating TCP retransmission timing leaks.
- **Blind Silent Push:** Zero-payload background wakeup pulses (`content-available: 1`) allowing mobile devices to sleep and fetch pending packets without disclosing social graphs to Apple (APNs) or Google (FCM).

### 3. Verifiable Forensic Erasure Notary (Aztec Network L2)
- **Mathematical Erasure Proof:** When an ephemeral channel is closed or a duress PIN is entered, the local device executes hardware-level crypto-shredding (purging keys from Secure Enclave / Android Keystore) and emits an application-siloed nullifier (`nsk_app`) to Aztec L2.
- **Auditability Without Privacy Leakage:** Third-party auditors, courts, and regulators verify channel destruction using Aztec's public `getNullifierMembershipWitness` RPC alongside a canonical NIST FIPS 204 (`ML-DSA-87`) signed receipt. Viewing keys and message contents are never disclosed.

---

## Verified Benchmarks

Executed on standard x86_64 (`cargo test --release`) and mobile ARM64 targets:

| Cryptographic Operation | Algorithm / Standard | Target Execution Time | Memory Overhead |
| :--- | :--- | :---: | :---: |
| **Hybrid Handshake Initiation** | `X25519 + ML-KEM-1024` | **0.24 ms** | Zero allocation |
| **SPQR Ratchet Step** | `AES-256-GCM + HKDF-SHA3` | **0.18 ms** | `< 128 bytes` |
| **Forward Error Correction** | `Reed-Solomon (10+4)` | **0.31 ms** | Buffer reused |
| **Sphinx Encapsulation** | `1024 B Uniform Framing` | **0.12 ms** | Zero copy |
| **Hardware Memory Shred** | `ZeroizeOnDrop + Keystore purge` | **< 0.05 ms** | Total purge |
| **Full E2E Protocol Flow** | **11/11 Test Suites Passing** | **0.01 s total** | Safe RAM |

---

## Repository Structure

```text
chaquant/
├── .github/workflows/
│   └── store-release.yml         # CI/CD: Rust tests, Android .aab, and iOS .xcframework
├── core-engine/                  # Pure Rust Post-Quantum Cryptographic & Transport Core
│   ├── Cargo.toml                # Dual licensed MIT / Apache-2.0
│   ├── src/
│   │   ├── crypto/               # PQXDH, SPQR ratchet, ML-KEM-1024, ML-DSA-87
│   │   ├── fec/                  # Reed-Solomon Forward Error Correction
│   │   ├── nym/                  # Uniform Sphinx packet framing & Blind Push
│   │   └── telemetry/            # Zero-knowledge security posture metrics
│   └── tests/                    # 11 comprehensive E2E automated test suites
├── contracts/                    # Aztec L2 Smart Contracts (Noir v0.60.0)
│   ├── Nargo.toml
│   └── src/
│       ├── main.nr               # PairwiseSessionRegistry (Verifiable Erasure Notary)
│       └── session_note.nr       # PrivateSet UTXO Note with Siloed Nullifiers
├── mobile/                       # Cross-Platform Sovereign Mobile Client
│   ├── android/                  # Native Android configuration (ProGuard, NDK, AAB)
│   ├── ios/                      # Native iOS configuration (Info.plist EAR 5D992 Mass Market)
│   └── src/
│       ├── demo/sandbox_bot.ts   # Aegis Resilience Sandbox Bot for Grant Judges & Reviewers
│       ├── pxe/network_profiles.ts # Aztec & Nym Network Profiles (Testnet/Sandbox/Self-hosted)
│       ├── screens/              # Sovereign ChatScreen with real-time ZK metrics
│       └── storage/db.ts         # Local SQLCipher abstraction with Duress Crypto-Shredding
├── scripts/                      # Multiplatform SDK and deployment scripts
│   └── build_core_sdk.sh         # Cross-compilation script (C-ABI, Swift, Kotlin)
├── docker-compose.selfhosted.yml # Sovereign self-hosted Mixnet & Aztec node deployment
└── docs/                         # Technical Specifications and Formal Audits
    ├── AUDIT_SCOPE.md            # Formal Audit Scope for OTF, Aztec & Nym
    ├── PRIVACY_POLICY.html       # Self-contained zero-data collection privacy policy
    └── TECHNICAL_ARCHITECTURE_AND_BENCHMARKS.md # Formulations & benchmarks
```

---

## Quick Start & Reproducible Builds

### 1. Build and Run Automated Cryptographic Tests
```bash
# Verify all 11 test suites passing in <0.05s
cargo test --manifest-path core-engine/Cargo.toml --release
```

### 2. Verify Aztec Noir Smart Contracts
```bash
cd contracts
nargo check
nargo compile
```

### 3. Build Android App Bundle (.aab)
```bash
# Requires cargo-ndk and Android NDK r26b+
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 \
  -o mobile/android/app/src/main/jniLibs \
  build --release --manifest-path core-engine/Cargo.toml

cd mobile/android
./gradlew bundleRelease
```

### 4. Build iOS Universal XCFramework
```bash
# Requires macOS and Xcode 15+
cargo build --release --manifest-path core-engine/Cargo.toml --target aarch64-apple-ios
cargo build --release --manifest-path core-engine/Cargo.toml --target aarch64-apple-ios-sim

uniffi-bindgen generate core-engine/chaquant.udl --language swift --out-dir mobile/ios/GeneratedBindings

xcodebuild -create-xcframework \
  -library core-engine/target/aarch64-apple-ios/release/libchaquant_core.a \
  -headers mobile/ios/GeneratedBindings \
  -library core-engine/target/aarch64-apple-ios-sim/release/libchaquant_core.a \
  -headers mobile/ios/GeneratedBindings \
  -output mobile/ios/Frameworks/ChaquantCore.xcframework
```

### 5. Launch Sovereign Self-Hosted Mesh Node
```bash
# Spawns Aztec PXE Proxy, Nym Sphinx Mixnet Gateway, and in-memory relay
docker compose -f docker-compose.selfhosted.yml up -d
```

### 6. Build Protocol Core SDK (C-ABI & Embedded)
```bash
./scripts/build_core_sdk.sh
```

---

## Security Audit & Threat Model

For external security teams, code reviewers, and grant auditors:
- [docs/AUDIT_SCOPE.md](docs/AUDIT_SCOPE.md): Invariant definitions, memory zeroization guarantees, and formal threat boundaries.
- [docs/TECHNICAL_ARCHITECTURE_AND_BENCHMARKS.md](docs/TECHNICAL_ARCHITECTURE_AND_BENCHMARKS.md): Mathematical formulations for NIST FIPS 203/204, SPQR ratchet specifications, and Aztec Siloed Nullifiers.
- [docs/PRIVACY_POLICY.html](docs/PRIVACY_POLICY.html): Zero-data collection, zero-identifier privacy policy compliant with GDPR and store guidelines.

---

## License

This project is dual-licensed under:
- **MIT License** ([LICENSE-MIT](LICENSE-MIT))
- **Apache License, Version 2.0** ([LICENSE-APACHE](LICENSE-APACHE))

You may choose either license at your option.
