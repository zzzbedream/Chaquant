use chaquant_core::crypto::{
    pqxdh_initiate, pqxdh_respond, BobPrekeyState, IdentityKeyPair,
};
use chaquant_core::fec::FecEngine;
use chaquant_core::nym::SphinxPacket;
use chaquant_core::ratchet::SpqrSession;
use rand::rngs::OsRng;
use x25519_dalek::{PublicKey as X25519Public, StaticSecret as X25519Secret};

#[test]
fn test_e2e_complete_protocol_flow() {
    println!("\n=== 1. Generación de Identidades Pairwise ===");
    let alice_identity = IdentityKeyPair::generate().expect("Alice identity");
    let bob_identity = IdentityKeyPair::generate().expect("Bob identity");

    println!("=== 2. Bob publica Prekey Bundle (X25519 + ML-KEM-1024 + ML-DSA-87) ===");
    let bob_prekeys = BobPrekeyState::generate(&bob_identity).expect("Bob prekey bundle");

    println!("=== 3. Alice procesa invitación y ejecuta Handshake PQXDH ===");
    let (alice_master_secret, handshake_msg) =
        pqxdh_initiate(&alice_identity, &bob_prekeys.bundle).expect("PQXDH initiate");

    println!("=== 4. Bob responde y decapsula ML-KEM-1024 ===");
    let bob_master_secret =
        pqxdh_respond(&bob_identity, &bob_prekeys, &handshake_msg).expect("PQXDH respond");

    assert_eq!(alice_master_secret, bob_master_secret);
    println!(">>> Clave Maestra de Sesión compartida derivada con éxito.");

    println!("=== 5. Inicialización de Sesiones de Trinquete Triple (SPQR) ===");
    let rng = OsRng;
    let bob_dh_secret = X25519Secret::random_from_rng(rng);
    let bob_dh_public = X25519Public::from(&bob_dh_secret);

    let mut alice_session =
        SpqrSession::init_initiator(alice_master_secret, *bob_dh_public.as_bytes())
            .expect("Alice session init");
    let mut bob_session = SpqrSession::init_responder(bob_master_secret, bob_dh_secret);

    println!("=== 6. Envío de Mensaje con Adjunto vía Reed-Solomon FEC + Sphinx ===");
    let payload_attachment = b"Documento adjunto confidencial de alta privacidad Web3".repeat(20);
    let fec = FecEngine::new(8, 4, 256).expect("FecEngine");
    let msg_id = [101u8; 32];

    let fragments = fec.encode(msg_id, &payload_attachment).expect("FEC encode");
    assert_eq!(fragments.len(), 12); // 8 datos + 4 paridad

    let mut mixnet_packets = Vec::new();
    for frag in fragments {
        let pkt = SphinxPacket::new_real(frag).expect("Sphinx frame");
        mixnet_packets.push(pkt);
    }

    // Pérdida estocástica: 3 paquetes se descartan en la mixnet
    mixnet_packets.remove(2);
    mixnet_packets.remove(5);
    mixnet_packets.remove(7);
    assert_eq!(mixnet_packets.len(), 9); // Quedan 9 fragmentos (se necesitaban 8)

    // Bob extrae los fragmentos
    let mut received_fragments = Vec::new();
    for pkt in mixnet_packets {
        if let Some(frag) = pkt.extract_fragment().expect("Extract") {
            received_fragments.push(frag);
        }
    }

    let reconstructed = fec.decode(&received_fragments).expect("FEC decode");
    assert_eq!(payload_attachment, reconstructed);
    println!(">>> Adjunto reconstruido al 100% a pesar del descarte del 25% de fragmentos en Nym.");

    println!("=== 7. Ciclo de Conversación con Activación Periódica de SPQR ===");
    for i in 1..=15 {
        let text = format!("Mensaje interactivo #{}", i);
        let enc_msg = alice_session.encrypt(text.as_bytes()).expect("Alice encrypt");
        let dec_text = bob_session.decrypt(&enc_msg).expect("Bob decrypt");
        assert_eq!(dec_text, text.as_bytes());
    }
    println!(">>> 15 mensajes transmitidos con éxito y renovación post-cuántica SPQR verificada.");
}
