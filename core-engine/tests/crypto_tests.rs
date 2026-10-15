use chaquant_core::crypto::{
    decrypt_aes_256_gcm, encrypt_aes_256_gcm, pqxdh_initiate, pqxdh_respond, BobPrekeyState,
    IdentityKeyPair,
};

#[test]
fn test_pqxdh_handshake_and_aes_payload() {
    // 1. Crear identidades de Alice y Bob
    let alice_identity = IdentityKeyPair::generate().expect("Alice identity keygen");
    let bob_identity = IdentityKeyPair::generate().expect("Bob identity keygen");

    // 2. Bob publica su PrekeyBundle con firma ML-DSA-87 y clave ML-KEM-1024
    let bob_prekeys = BobPrekeyState::generate(&bob_identity).expect("Bob prekey bundle");

    // 3. Alice inicia el apretón de manos PQXDH
    let (alice_master_secret, handshake_msg) =
        pqxdh_initiate(&alice_identity, &bob_prekeys.bundle).expect("Alice initiate PQXDH");

    // 4. Bob procesa el mensaje de apretón de manos
    let bob_master_secret =
        pqxdh_respond(&bob_identity, &bob_prekeys, &handshake_msg).expect("Bob respond PQXDH");

    // 5. Validar que ambos derivan exactamente el mismo secreto de 256 bits
    assert_eq!(
        alice_master_secret, bob_master_secret,
        "Master secrets between Alice and Bob MUST match perfectly!"
    );

    // 6. Probar cifrado y descifrado AES-256-GCM
    let plaintext = b"Hello Bob! Maximum privacy Web3 messaging with post-quantum security.";
    let aad = b"pairwise-session-12345";

    let encrypted = encrypt_aes_256_gcm(&alice_master_secret, plaintext, aad)
        .expect("Alice encrypts message");

    let decrypted = decrypt_aes_256_gcm(&bob_master_secret, &encrypted, aad)
        .expect("Bob decrypts message");

    assert_eq!(plaintext.to_vec(), decrypted);
}
