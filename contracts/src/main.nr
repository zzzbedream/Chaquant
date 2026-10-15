mod session_note;

// =========================================================================
// CHAQUANT PROTOCOL • ZERO-KNOWLEDGE EPHEMERAL CHANNEL REGISTRY & VERIFIABLE ERASURE NOTARY
// Contrato inteligente en Noir para Aztec L2 Testnet / Mainnet (ET-11)
// Provee prueba matemática de destrucción sin custodia ni filtración de metadatos.
// =========================================================================
contract PairwiseSessionRegistry {
    use dep::aztec::prelude::*;
    use dep::aztec::encrypted_logs::encrypted_note_emission::encode_and_encrypt_note;
    use crate::session_note::{SessionNote, DestructionReceiptNote};

    #[storage]
    struct Storage<Context> {
        // Conjunto privado de notas UTXO con compromisos de canal efímero activos (6 campos)
        active_sessions: PrivateSet<SessionNote, Context>,
        // Conjunto privado de notas UTXO con certificados forenses de destrucción verificable
        destruction_receipts: PrivateSet<DestructionReceiptNote, Context>,
    }

    /// Registra un nuevo compromiso de canal efímero soberano (ET-11)
    /// deal_room_commitment: channel_context_commitment (contexto de seguridad / protección de fuentes)
    /// enterprise_tenant_hash: domain_namespace_hash (aislamiento multi-dominio y control anti-spam)
    #[private]
    fn register_session(
        session_commitment: Field,
        deal_room_commitment: Field,
        expires_at_timestamp: Field,
        policy_flags: Field,
        enterprise_tenant_hash: Field,
        randomness: Field
    ) {
        // Validación obligatoria de namespace de dominio / anti-spam en SponsoredFPC
        assert(enterprise_tenant_hash != 0, "Invalid domain namespace");

        let sender = context.msg_sender();
        let mut note = SessionNote::new(
            session_commitment,
            deal_room_commitment,
            expires_at_timestamp,
            policy_flags,
            sender,
            randomness
        );
        
        // Inserta la nota en el PrivateSet emitiendo el log cifrado para el PXE del usuario
        storage.active_sessions.insert(&mut note, true);
    }

    /// Revoca un canal emitiendo el nulificador siloed y genera la nota DestructionReceiptNote
    /// Retorna el siloed_nullifier para inclusión directa en el certificado forense off-chain
    #[private]
    fn revoke_session(
        session_commitment: Field,
        revoked_at_timestamp: Field,
        enterprise_tenant_hash: Field,
        receipt_randomness: Field
    ) -> Field {
        assert(enterprise_tenant_hash != 0, "Invalid domain namespace");
        let sender = context.msg_sender();

        // Filtro para ubicar la sesión activa correspondiente al compromiso
        let options = FilterOptions::new()
            .set_field(0, session_commitment)
            .set_field(4, sender.to_field());

        let notes = storage.active_sessions.get_notes(options);
        assert(notes.len() > 0, "No active session matching commitment found");

        let note = notes.get(0);
        
        // Calcular el siloed_nullifier antes o durante la remoción
        let siloed_nullifier = note.compute_nullifier(&mut context);

        // Remover la nota del conjunto activo (emite el nullifier en el árbol de Aztec)
        storage.active_sessions.remove(note);

        // Generar e insertar la nota UTXO de certificado de destrucción criptográfica
        let mut receipt_note = DestructionReceiptNote::new(
            session_commitment,
            siloed_nullifier,
            revoked_at_timestamp,
            enterprise_tenant_hash,
            sender,
            receipt_randomness
        );
        storage.destruction_receipts.insert(&mut receipt_note, true);

        // Devolver el siloed_nullifier exacto para que el auditor externo y el recibo legal lo certifiquen
        siloed_nullifier
    }

    /// Función no restringida (unconstrained) para consulta de sesión activa por el PXE
    unconstrained fn is_session_active(
        owner: AztecAddress,
        session_commitment: Field
    ) -> bool {
        let options = FilterOptions::new()
            .set_field(0, session_commitment)
            .set_field(4, owner.to_field());

        let notes = storage.active_sessions.get_notes(options);
        notes.len() > 0
    }

    /// Verificación de recibo de destrucción en el PXE local (requiere viewing key de la nota).
    /// NOTA DE AUDITORÍA EXTERNA: Para que un auditor tercero independiente verifique la revocación
    /// sin requerir viewing keys ni revelar identidad privada, el auditor valida:
    /// 1. La firma cuántica NIST FIPS 204 (ML-DSA-87) del JSON canónico (compliance.rs).
    /// 2. La inclusión del `siloed_nullifier` en el Árbol Público de Nulificadores de Aztec L2
    ///    a través de la RPC pública del secuenciador (`getNullifierMembershipWitness`).
    unconstrained fn verify_destruction_receipt(
        session_commitment: Field,
        siloed_nullifier: Field,
        enterprise_tenant_hash: Field
    ) -> bool {
        let options = FilterOptions::new()
            .set_field(0, session_commitment)
            .set_field(1, siloed_nullifier)
            .set_field(3, enterprise_tenant_hash);

        let receipts = storage.destruction_receipts.get_notes(options);
        receipts.len() > 0
    }
}
