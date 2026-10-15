# CHAQUANT PROTOCOL • FORMAL AUDIT SCOPE & SECURITY SPECIFICATION
**Document ID:** CHAQUANT-AUDIT-2026-v1.0  
**Target Auditors:** Open Technology Fund (OTF Security Lab), Aztec Foundation Security Reviewers, Nym Cryptography Team, Independent Security Researchers  
**License:** MIT OR Apache-2.0

---

## 1. System Overview & Core Threat Model

Chaquant Protocol is an open-source, post-quantum sovereign communication and verifiable forensic erasure protocol. The threat model assumes:

1. **Global Passive Adversary (GPA):** The adversary can monitor all ingress and egress network traffic across internet exchange points (IXPs) and cellular carriers.
2. **Harvest Now, Decrypt Later (HNDL) Threat:** Adversaries record encrypted payloads today to decrypt them using quantum computing (Shor's algorithm) within 3 to 10 years.
3. **Active Network Censorship & Degradation:** Middleboxes, DPI hardware, and state firewalls drop up to 30% of packets, inject RST flags, or perform deep payload timing analysis.
4. **Physical Device Seizure & Post-Execution Forensics:** Adversaries physically seize mobile devices and use forensic hardware extraction tools (e.g., Cellebrite, GrayKey, JTAG NAND chip-off) to recover flash storage remnants.
5. **Malicious or Compromised Server Infrastructure:** Mixnodes and relay nodes may be operated by hostile entities attempting to identify participants or tamper with message delivery.

---

## 2. Cryptographic & Component Audit Inventory

```
+---------------------------------------------------------------------------------------------------------+
|                                    TARGET MODULE INVENTORY FOR AUDIT                                    |
+------------------------------+---------------------------+----------------------------------------------+
| MODULE / REPO PATH           | LANGUAGE / TOOLCHAIN      | PRIMARY RESPONSIBILITY & CRYPTO PRIMITIVE   |
+------------------------------+---------------------------+----------------------------------------------+
| core-engine/src/crypto/      | Rust 2021                 | Identity key generation; NIST FIPS 204       |
|   keys.rs                    | (fips203, fips204)        | ML-DSA-87 and NIST FIPS 203 ML-KEM-1024.     |
+------------------------------+---------------------------+----------------------------------------------+
| core-engine/src/crypto/      | Rust 2021                 | Post-Quantum Extended Triple Diffie-Hellman  |
|   pqxdh.rs                   | (x25519-dalek, fips203)   | (PQXDH): Hybrid key agreement.               |
+------------------------------+---------------------------+----------------------------------------------+
| core-engine/src/crypto/      | Rust 2021                 | Sparse Post-Quantum Ratchet (SPQR):          |
|   ratchet/spqr.rs            | (zeroize, aes-gcm)        | Forward Secrecy & Break-in Recovery.         |
+------------------------------+---------------------------+----------------------------------------------+
| core-engine/src/crypto/      | Rust 2021                 | Canonical JSON serialization and FIPS 204    |
|   compliance.rs              | (fips204, sha3)           | ML-DSA-87 signing of destruction receipts.   |
+------------------------------+---------------------------+----------------------------------------------+
| core-engine/src/fec/         | Rust 2021                 | Erasure coding: 10 data fragments + 4 parity |
|   reed_solomon.rs            | (reed-solomon-erasure)    | fragments with anti-poisoning hash trees.    |
+------------------------------+---------------------------+----------------------------------------------+
| core-engine/src/nym/         | Rust 2021                 | Uniform 1024-byte binary Sphinx framing and  |
|   sphinx_packet.rs           | (zeroize)                 | Poisson cover traffic generation.            |
+------------------------------+---------------------------+----------------------------------------------+
| contracts/src/               | Noir v0.60.0              | Dual PrivateSet state machine and app-siloed |
|   main.nr & session_note.nr  | (Barretenberg UltraHonk)  | nullifier generation for Aztec L2.           |
+------------------------------+---------------------------+----------------------------------------------+
| mobile/src/storage/          | TypeScript                | SQLCipher database, Duress PIN wipe, and     |
|   db.ts                      | (react-native-sqlcipher)  | hardware enclave key deletion.               |
+------------------------------+---------------------------+----------------------------------------------+
```

---

## 3. Mathematical Security Invariants Under Audit

### Invariant I-01: Constant-Time Execution & Memory Zeroization
- **Rule:** Every buffer containing private key material (`ML-KEM-1024` private key, `ML-DSA-87` private key, `X25519` static/ephemeral secret, `SPQR` chain keys, and AES-256 root secrets) MUST implement the `Zeroize` and `ZeroizeOnDrop` traits.
- **Verification:** Drop routines are audited via LLVM assembly inspection to ensure compiler dead-code elimination does not bypass `memset_s` or equivalent zeroization.

### Invariant I-02: Hybrid Key Exchange Non-Degradation
- **Rule:** In `core-engine/src/crypto/pqxdh.rs`, the derived shared secret $K_{master}$ combines classical $K_{classical} = \text{X25519}(sk, pk)$ and post-quantum $K_{pqc} = \text{ML-KEM-1024.Decapsulate}(sk_{pqc}, ct_{pqc})$ via HKDF-SHA3:
  $$K_{master} = \text{HKDF-Extract}(\text{salt}, K_{classical} \parallel K_{pqc})$$
- **Guarantee:** If either `X25519` OR `ML-KEM-1024` is broken, the master key remains computationally secure against the remaining active primitive.

### Invariant I-03: Zero-Retransmission Erasure Coding (FEC 10+4)
- **Rule:** In `core-engine/src/fec/reed_solomon.rs`, any payload $M$ split into 10 data fragments generates exactly 4 Cauchy Reed-Solomon parity fragments over $GF(2^8)$.
- **Guarantee:** Any subset of 10 fragments out of 14 is mathematically sufficient to reconstruct $M$ with zero ARQ retransmission timing leakage.
- **Anti-Poisoning:** Each fragment contains an independent SHA3-256 leaf hash verified against a root commitment to prevent Byzantine packet injection.

### Invariant I-04: Fixed Sphinx Packet Entropy
- **Rule:** In `core-engine/src/nym/sphinx_packet.rs`, all emitted network packets are padded with pseudorandom stream bytes to an immutable length of exactly 1024 bytes.
- **Guarantee:** Network observers cannot distinguish between a handshake initiation, a text message, a binary document fragment, or a Poisson cover dummy packet.

### Invariant I-05: Non-Repudiable Erasure via Siloed Nullifiers
- **Rule:** In `contracts/src/main.nr` and `session_note.nr`, revoking a session invokes:
  $$\text{nullifier} = \text{Poseidon2}(\text{nsk\_app}, \text{note\_hash})$$
- **Guarantee:** 
  1. The Aztec Kernel circuit deterministically appends the siloed nullifier to the global Nullifier Tree.
  2. Anyone can audit non-inclusion or membership via `getNullifierMembershipWitness`.
  3. No observer can link the siloed nullifier back to the user's public address or viewing key.

### Invariant I-06: Duress Forensics Defense (Anti-Cellebrite)
- **Rule:** When the duress PIN is entered in `mobile/src/storage/db.ts`:
  1. Calls hardware security module: `KeyStore.deleteEntry("chaquant_master_kek")`.
  2. Unlinks and overwrites filesystem inodes: `chaquant_secure.db`, `chaquant_secure.db-wal`, `chaquant_secure.db-shm`.
  3. Purges RAM allocations via `Zeroize`.
  4. Activates decoy interface.
- **Guarantee:** Any subsequent NAND flash chip-off or software extraction recovers only high-entropy pseudorandom white noise.

---

## 4. Test Harness & Continuous Verification Evidence

Audit teams can verify the full 11/11 cryptographic test suites locally:

```bash
# Clone and verify under release optimization
git clone https://github.com/lcifuentes/chaquant.git
cd chaquant
cargo test --manifest-path core-engine/Cargo.toml --release -- --nocapture
```

Test Results Matrix:
- `crypto_tests::test_pqxdh_handshake_and_aes_payload` -> **PASS**
- `e2e_flow_tests::test_e2e_complete_protocol_flow` -> **PASS**
- `enterprise_tests::test_canonical_destruction_receipt_signing` -> **PASS**
- `enterprise_tests::test_deal_room_ttl_and_policy_enforcement` -> **PASS**
- `enterprise_tests::test_security_posture_metrics` -> **PASS**
- `enterprise_tests::test_zeroize_memory_destruction` -> **PASS**
- `ratchet_tests::test_spqr_out_of_order_nym_stochastic_delivery` -> **PASS**
- `ratchet_tests::test_spqr_ratchet_conversation` -> **PASS**
- `transport_fec_tests::test_blind_push_notifications` -> **PASS**
- `transport_fec_tests::test_fragment_poisoning_mitigation` -> **PASS**
- `transport_fec_tests::test_reed_solomon_fec_and_drop_resilience` -> **PASS**
