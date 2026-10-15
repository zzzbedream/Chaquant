use std::hint::black_box;
use chaquant_core::crypto::{CryptographicDestructionReceipt, IdentityKeyPair};
use chaquant_core::error::ChaquantError;
use chaquant_core::fec::FecEngine;
use chaquant_core::ratchet::SpqrSession;
use chaquant_core::telemetry::SecurityPostureMetrics;
use x25519_dalek::{PublicKey as X25519Public, StaticSecret as X25519Secret};

/// Helper para crear una pareja de sesiones activas Alice y Bob
fn create_test_session_pair() -> (SpqrSession, SpqrSession) {
    let master_secret = [0x42u8; 32];
    let bob_dh_secret = X25519Secret::from([0x77u8; 32]);
    let bob_dh_public = *X25519Public::from(&bob_dh_secret).as_bytes();

    let alice = SpqrSession::init_initiator(master_secret, bob_dh_public)
        .expect("Alice initialization failed");
    let bob = SpqrSession::init_responder(master_secret, bob_dh_secret);

    (alice, bob)
}

/// Test 8 (ET-02 / ET-04): Destrucción irreversible de material criptográfico en RAM (Zeroize + Drop)
#[test]
fn test_zeroize_memory_destruction() {
    let (mut alice, mut bob) = create_test_session_pair();

    // Intercambiar un mensaje para asegurar claves activas
    let msg1 = alice.encrypt(b"Top Secret Deal Document").expect("Encryption failed");
    let decrypted = bob.decrypt(&msg1).expect("Decryption failed");
    assert_eq!(decrypted, b"Top Secret Deal Document");

    // Inyectar claves salteadas simuladas para verificar limpieza exhaustiva del buffer
    let fake_dh = [0x99u8; 32];
    let fake_mk1 = [0xAAu8; 32];
    let fake_mk2 = [0xBBu8; 32];
    alice.insert_skipped_key_for_test(fake_dh, 1, fake_mk1);
    alice.insert_skipped_key_for_test(fake_dh, 2, fake_mk2);
    assert_eq!(alice.skipped_keys_count(), 2);

    // Ejecutar destrucción explícita
    alice.destroy();

    // Verificaciones con black_box
    black_box(&alice);
    assert!(alice.is_destroyed(), "Session must be marked destroyed");
    assert_eq!(
        alice.root_key_bytes(),
        &[0u8; 32],
        "Root key must be completely zeroized"
    );
    assert_eq!(
        alice.skipped_keys_count(),
        0,
        "Skipped message keys map must be cleared"
    );

    // Operaciones posteriores deben ser rechazadas
    let encrypt_res = alice.encrypt(b"Post-destruction message");
    assert!(encrypt_res.is_err(), "Encrypt must fail after destruction");

    let decrypt_res = alice.decrypt(&msg1);
    assert!(decrypt_res.is_err(), "Decrypt must fail after destruction");

    // Validar comportamiento de Drop automático
    {
        let (mut temp_alice, _) = create_test_session_pair();
        let _ = temp_alice.encrypt(b"Ephemeral message");
        // temp_alice sale de ámbito aquí, invocando Drop -> destroy()
    }
}

/// Test 9 (ET-02 / ET-03): Control de Expiración TTL de Ephemeral Channel en encrypt() y decrypt()
#[test]
fn test_ephemeral_channel_ttl_and_policy_enforcement() {
    let (mut alice, mut bob) = create_test_session_pair();

    let channel_commitment = [0xDDu8; 32];
    let ttl_expiration_timestamp: u64 = 5000;
    let policy_flags: u32 = 0x03; // e.g. TTL_STRICT | WATERMARK_REQUIRED

    alice.set_deal_room_policy(channel_commitment, ttl_expiration_timestamp, policy_flags);
    bob.set_deal_room_policy(channel_commitment, ttl_expiration_timestamp, policy_flags);

    // 1. Antes del vencimiento (t = 4000) -> Transmisión normal permitida
    let msg_valid = alice
        .encrypt_with_time(b"Confidential Channel Payload Draft", 4000)
        .expect("Encryption should succeed before TTL expiration");

    let payload_recovered = bob
        .decrypt_with_time(&msg_valid, 4000)
        .expect("Decryption should succeed before TTL expiration");
    assert_eq!(payload_recovered, b"Confidential Channel Payload Draft");

    // 2. Superado el TTL (t = 5001) -> Bloqueo obligatorio en encrypt()
    let encrypt_expired = alice.encrypt_with_time(b"Late message attempt", 5001);
    match encrypt_expired {
        Err(ChaquantError::SessionExpired) => {
            // Comportamiento esperado
        }
        other => panic!("Expected Err(SessionExpired) in encrypt, got {:?}", other),
    }

    // 3. Superado el TTL (t = 5001) -> Bloqueo obligatorio en decrypt()
    let decrypt_expired = bob.decrypt_with_time(&msg_valid, 5001);
    match decrypt_expired {
        Err(ChaquantError::SessionExpired) => {
            // Comportamiento esperado
        }
        other => panic!("Expected Err(SessionExpired) in decrypt, got {:?}", other),
    }
}

/// Test 10 (ET-02 / ET-04): Certificado Canónico de Destrucción Legal con firma ML-DSA-87
#[test]
fn test_canonical_destruction_receipt_signing() {
    let identity = IdentityKeyPair::generate().expect("Identity generation failed");

    let mut receipt = CryptographicDestructionReceipt::new(
        "sess-chan-9942",
        "0x9876543210abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "0xdeadbeefc001cafe000000000000000000000000000000000000000000000001",
        "0xnode_protocol_mesh_authority_hash_01",
        1773000000,
        "auditor@zk-security.org",
    );

    // 1. Validar serialización JSON canónica (claves ordenadas alfabéticamente)
    let canonical_json = receipt.canonical_json().expect("Canonical serialization failed");
    assert!(canonical_json.contains("\"deal_room_commitment\":"));
    assert!(canonical_json.contains("\"siloed_nullifier\":"));
    assert!(canonical_json.contains("\"enterprise_tenant_hash\":"));

    let digest = receipt.calculate_canonical_digest().expect("Digest calculation failed");
    assert_ne!(digest, [0u8; 32]);

    // 2. Firmar con ML-DSA-87
    receipt
        .sign_with_dsa87(&identity.dsa_signing_key)
        .expect("ML-DSA-87 signing failed");

    assert!(receipt.canonical_document_hash.is_some());
    assert!(receipt.signature_dsa87.is_some());

    // 3. Verificar firma criptográfica exitosa
    let is_valid = receipt
        .verify_signature(&identity.dsa_verifying_key)
        .expect("Signature verification failed");
    assert!(is_valid, "Valid ML-DSA-87 signature must verify successfully");

    // 4. Intentar manipulación del certificado y confirmar detección de fraude
    receipt.siloed_nullifier = "0xfake_tampered_nullifier".into();
    let is_valid_tampered = receipt
        .verify_signature(&identity.dsa_verifying_key)
        .expect("Signature verification failed");
    assert!(
        !is_valid_tampered,
        "Tampered receipt must fail signature verification"
    );
}

/// Test 11 (ET-02 / ET-04): Telemetría de Postura de Seguridad (SecurityPostureMetrics)
#[test]
fn test_security_posture_metrics() {
    let (mut alice, mut bob) = create_test_session_pair();
    let fec = FecEngine::new(10, 4, 1024).expect("FEC engine init failed");

    alice.set_deal_room_policy([0x11u8; 32], 10000, 0x01);
    alice.set_mock_time(2000);

    // Simular intercambio de 12 mensajes para avanzar al menos una época SPQR
    for i in 0..12 {
        let msg = alice
            .encrypt(format!("Sync packet #{}", i).as_bytes())
            .expect("Encrypt failed");
        let _ = bob.decrypt(&msg).expect("Decrypt failed");
    }

    let metrics = SecurityPostureMetrics::collect(&alice, Some(&fec));

    assert!(metrics.spqr_epoch >= 1, "SPQR epoch should have advanced");
    assert_eq!(metrics.pq_entropy_bits, 1024, "PQ entropy should be 1024 bits");
    assert_eq!(metrics.fec_overhead_ratio, 0.4, "FEC redundancy should be 4/10 = 0.4");
    assert!(metrics.session_active, "Session should be active");
    assert!(!metrics.is_destroyed, "Session should not be destroyed");
    assert_eq!(metrics.ttl_remaining_secs, Some(8000), "Remaining TTL should be 10000 - 2000 = 8000");

    // Destruir sesión y verificar degradación inmediata de métricas
    alice.destroy();
    let post_destroy_metrics = SecurityPostureMetrics::collect(&alice, Some(&fec));
    assert!(post_destroy_metrics.is_destroyed);
    assert!(!post_destroy_metrics.session_active);
    assert_eq!(post_destroy_metrics.pq_entropy_bits, 0);
}
