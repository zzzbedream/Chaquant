use chaquant_core::fec::FecEngine;
use chaquant_core::nym::{BlindPushToken, SphinxPacket};

#[test]
fn test_reed_solomon_fec_and_drop_resilience() {
    let data_shards = 10;
    let parity_shards = 4;
    let shard_size = 512;

    let fec = FecEngine::new(data_shards, parity_shards, shard_size).expect("FecEngine init");

    // Crear un payload representativo (ej. archivo adjunto de 4 KB)
    let original_data: Vec<u8> = (0..3500).map(|i| (i % 255) as u8).collect();
    let message_id = [77u8; 32];

    // Codificar en 14 fragmentos (10 datos + 4 paridad)
    let fragments = fec.encode(message_id, &original_data).expect("Encode fragments");
    assert_eq!(fragments.len(), 14);

    // Empaquetar en paquetes Sphinx
    let mut sphinx_packets = Vec::new();
    for frag in &fragments {
        let pkt = SphinxPacket::new_real(frag.clone()).expect("Sphinx packet");
        sphinx_packets.push(pkt);
    }

    // Inyectar un paquete de tráfico de cobertura para probar indistinguibilidad
    let cover_pkt = SphinxPacket::new_cover_traffic();
    assert!(cover_pkt.is_dummy());

    // SIMULACIÓN DE PÉRDIDAS EN MIXNET:
    // Descartamos 4 fragmentos (índices 1, 3, 7, 11). Quedan 10 fragmentos exactos.
    let mut received_fragments = Vec::new();
    for (idx, frag) in fragments.into_iter().enumerate() {
        if idx != 1 && idx != 3 && idx != 7 && idx != 11 {
            received_fragments.push(frag);
        }
    }

    assert_eq!(received_fragments.len(), 10);

    // Reconstruir con los 10 fragmentos restantes
    let reconstructed = fec.decode(&received_fragments).expect("Decode and reconstruct");
    assert_eq!(
        original_data, reconstructed,
        "Payload reconstructed with Reed-Solomon must match original 100%!"
    );
}

#[test]
fn test_fragment_poisoning_mitigation() {
    let fec = FecEngine::new(5, 3, 256).expect("FecEngine init");
    let original = b"Critical zero-knowledge payload data".to_vec();
    let msg_id = [12u8; 32];

    let mut fragments = fec.encode(msg_id, &original).expect("Encode");

    // Ataque: Adulterar el fragmento 0
    fragments[0].payload[0] ^= 0xFF;
    // La integridad falla para el fragmento adulterado
    assert!(!fragments[0].verify_integrity());

    // El decodificador descarta el fragmento adulterado y reconstruye con los 7 restantes
    let reconstructed = fec.decode(&fragments).expect("Decode with poisoned shard discarded");
    assert_eq!(original, reconstructed);
}

#[test]
fn test_blind_push_notifications() {
    let recipient_blinded_id = [88u8; 32];
    let now = 1700000000u64;

    let token = BlindPushToken::generate_for_recipient(recipient_blinded_id, now);
    let pulse = token.create_pulse_digest();

    assert!(token.verify_pulse(&pulse).expect("Verify pulse"));

    // Pulso corrupto o modificado debe ser rechazado
    let mut corrupt_pulse = pulse;
    corrupt_pulse[0] ^= 0x01;
    assert!(!token.verify_pulse(&corrupt_pulse).expect("Verify corrupt pulse"));
}
