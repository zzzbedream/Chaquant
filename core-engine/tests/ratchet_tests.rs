use rand::rngs::OsRng;
use x25519_dalek::{PublicKey as X25519Public, StaticSecret as X25519Secret};

use chaquant_core::ratchet::SpqrSession;

#[test]
fn test_spqr_ratchet_conversation() {
    let master_secret = [42u8; 32];

    let rng = OsRng;
    let bob_dh_secret = X25519Secret::random_from_rng(rng);
    let bob_dh_public = X25519Public::from(&bob_dh_secret);

    // Inicializar sesiones
    let mut alice = SpqrSession::init_initiator(master_secret, *bob_dh_public.as_bytes())
        .expect("Alice init");
    let mut bob = SpqrSession::init_responder(master_secret, bob_dh_secret);

    // 1. Alice envía a Bob
    let msg1 = alice.encrypt(b"Hello Bob! (Msg 1)").expect("Alice encrypt 1");
    let dec1 = bob.decrypt(&msg1).expect("Bob decrypt 1");
    assert_eq!(dec1, b"Hello Bob! (Msg 1)");

    // 2. Bob responde a Alice
    let msg2 = bob.encrypt(b"Hey Alice! (Msg 2)").expect("Bob encrypt 2");
    let dec2 = alice.decrypt(&msg2).expect("Alice decrypt 2");
    assert_eq!(dec2, b"Hey Alice! (Msg 2)");

    // 3. Conversación extendida para disparar el trinquete SPQR (periódico cada 10 mensajes)
    for i in 3..=25 {
        let text = format!("Continuous message #{}", i);
        let msg = alice.encrypt(text.as_bytes()).expect("Alice encrypt loop");
        let dec = bob.decrypt(&msg).expect("Bob decrypt loop");
        assert_eq!(dec, text.as_bytes());
    }
}

#[test]
fn test_spqr_out_of_order_nym_stochastic_delivery() {
    let master_secret = [99u8; 32];
    let rng = OsRng;
    let bob_dh_secret = X25519Secret::random_from_rng(rng);
    let bob_dh_public = X25519Public::from(&bob_dh_secret);

    let mut alice = SpqrSession::init_initiator(master_secret, *bob_dh_public.as_bytes())
        .expect("Alice init");
    let mut bob = SpqrSession::init_responder(master_secret, bob_dh_secret);

    // Alice genera 5 mensajes seguidos
    let msg1 = alice.encrypt(b"Message 1").expect("Encrypt 1");
    let msg2 = alice.encrypt(b"Message 2").expect("Encrypt 2");
    let msg3 = alice.encrypt(b"Message 3").expect("Encrypt 3");
    let msg4 = alice.encrypt(b"Message 4").expect("Encrypt 4");
    let msg5 = alice.encrypt(b"Message 5").expect("Encrypt 5");

    // Simulación Mixnet: Llegan en desorden: [Msg 4, Msg 2, Msg 5, Msg 1, Msg 3]
    let dec4 = bob.decrypt(&msg4).expect("Bob decrypts Msg 4 first!");
    assert_eq!(dec4, b"Message 4");

    let dec2 = bob.decrypt(&msg2).expect("Bob decrypts Msg 2 second!");
    assert_eq!(dec2, b"Message 2");

    let dec5 = bob.decrypt(&msg5).expect("Bob decrypts Msg 5 third!");
    assert_eq!(dec5, b"Message 5");

    let dec1 = bob.decrypt(&msg1).expect("Bob decrypts Msg 1 fourth!");
    assert_eq!(dec1, b"Message 1");

    let dec3 = bob.decrypt(&msg3).expect("Bob decrypts Msg 3 fifth!");
    assert_eq!(dec3, b"Message 3");
}
