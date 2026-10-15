// =========================================================================
// CHAQUANT PROTOCOL • ZERO-KNOWLEDGE EPHEMERAL CHANNEL REGISTRY (ET-11)
// Nota Privada para compromisos de canal efímero y preservación de privacidad
// =========================================================================
#[derive(Serialize, Deserialize)]
pub struct SessionNote {
    // Hash criptográfico de sesión derivado localmente vía PQXDH
    pub session_commitment: Field,
    // channel_context_commitment: Contexto del canal efímero (protección de fuentes, DD.HH. o CSIRTs)
    pub deal_room_commitment: Field,
    // Timestamp de expiración física del canal para purga forzada
    pub expires_at_timestamp: Field,
    // Banderas de política de seguridad (0x07 = PQC_STRICT | ZERO_METADATA | DURESS_ENABLED)
    pub policy_flags: Field,
    // Dirección soberana del participante (Aztec Address)
    pub owner: AztecAddress,
    // Entropía criptográfica aleatoria para blinding en árbol de compromisos
    pub randomness: Field,
}

impl Note for SessionNote {
    fn compute_note_hash(&self) -> Field {
        dep::aztec::hash::poseidon2::poseidon2_hash([
            self.session_commitment,
            self.deal_room_commitment,
            self.expires_at_timestamp,
            self.policy_flags,
            self.owner.to_field(),
            self.randomness
        ])
    }

    fn compute_nullifier(&self, context: &mut PrivateContext) -> Field {
        let note_hash = self.compute_note_hash();
        // Obtener la clave de nulificación aislada por aplicación (nsk_app)
        let nullifier_key = context.request_nullifier_key(self.owner);
        dep::aztec::hash::poseidon2::poseidon2_hash([
            nullifier_key.to_field(),
            note_hash
        ])
    }
}

impl SessionNote {
    pub fn new(
        session_commitment: Field,
        deal_room_commitment: Field,
        expires_at_timestamp: Field,
        policy_flags: Field,
        owner: AztecAddress,
        randomness: Field
    ) -> Self {
        Self {
            session_commitment,
            deal_room_commitment,
            expires_at_timestamp,
            policy_flags,
            owner,
            randomness,
        }
    }
}

// =========================================================================
// Nota UTXO Privada de Certificado de Destrucción Criptográfica Forense (ET-11)
// Emite una prueba matemática verificable de supresión sin filtrar metadatos
// =========================================================================
#[derive(Serialize, Deserialize)]
pub struct DestructionReceiptNote {
    pub session_commitment: Field,
    pub siloed_nullifier: Field,
    pub revoked_at_timestamp: Field,
    // domain_namespace_hash: Hash de namespace de dominio para aislamiento multi-tenant y anti-spam en SponsoredFPC
    pub enterprise_tenant_hash: Field,
    pub owner: AztecAddress,
    pub randomness: Field,
}

impl Note for DestructionReceiptNote {
    fn compute_note_hash(&self) -> Field {
        dep::aztec::hash::poseidon2::poseidon2_hash([
            self.session_commitment,
            self.siloed_nullifier,
            self.revoked_at_timestamp,
            self.enterprise_tenant_hash,
            self.owner.to_field(),
            self.randomness
        ])
    }

    fn compute_nullifier(&self, context: &mut PrivateContext) -> Field {
        let note_hash = self.compute_note_hash();
        let nullifier_key = context.request_nullifier_key(self.owner);
        dep::aztec::hash::poseidon2::poseidon2_hash([
            nullifier_key.to_field(),
            note_hash
        ])
    }
}

impl DestructionReceiptNote {
    pub fn new(
        session_commitment: Field,
        siloed_nullifier: Field,
        revoked_at_timestamp: Field,
        enterprise_tenant_hash: Field,
        owner: AztecAddress,
        randomness: Field
    ) -> Self {
        Self {
            session_commitment,
            siloed_nullifier,
            revoked_at_timestamp,
            enterprise_tenant_hash,
            owner,
            randomness,
        }
    }
}
