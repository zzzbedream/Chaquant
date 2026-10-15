/**
 * Sistema de Diseño Cultural Tierra-Austral (Chaquant)
 * Inspirado en la iconografía ancestral de los pueblos originarios de Chile:
 * - Selk'nam (Onas): Geometría ritual del Hain (líneas verticales, triángulos, contrastes ocre/arcilla/blanco).
 * - Kawésqar: Navegación por canales y fiordos australes (turquesa glaciar, niebla profunda).
 * - Lickan Antay (Atacameños): Fortaleza de piedra, cobre y sol de altura.
 * - Yagán: Arqueología del fuego en el fin del mundo y resistencia extrema.
 */

export interface NetworkLayerInfo {
  id: string;
  indigenousName: string;
  peopleName: string;
  technicalSubsystem: string;
  descriptionEs: string;
  descriptionEn: string;
  status: 'active' | 'syncing' | 'offline';
  badgeColor: string;
}

export const CULTURAL_THEME = {
  colors: {
    // Fondos volcánicos y australes
    bgPrimary: '#0C0E14',
    bgSecondary: '#131722',
    bgElevated: '#1A202E',
    bgCard: '#151A26',
    
    // Paleta Tierra-Austral (Pigmentos naturales del Hain y la Patagonia)
    ochreFuego: '#C67D34',       // Ocre fueguino ceremonial
    clayRed: '#A83226',          // Arcilla roja Hain
    clayRedDark: '#661C14',      // Sombra de greda
    glacierCyan: '#48A9B8',      // Turquesa fiordo Kawésqar
    glacierIce: '#E2F1F5',       // Blanco hielo glaciar
    desertGold: '#D8973C',       // Cobre y oro Lickan Antay
    patagoniaSlate: '#8592A6',   // Gris pizarra austral
    
    // Bordes y acentos con brillo sutil
    borderOchre: 'rgba(198, 125, 52, 0.28)',
    borderGlacier: 'rgba(72, 169, 184, 0.28)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    
    // Textos
    textPrimary: '#F2F6FA',
    textSecondary: '#9EABC0',
    textMuted: '#5C677D',
    
    // Estados funcionales
    success: '#3FB950',
    warning: '#D29922',
    danger: '#F85149',
  },

  // Capas del protocolo nombradas con pueblos originarios de Chile
  networks: [
    {
      id: 'aztec-l2',
      indigenousName: 'Red Ona',
      peopleName: "Selk'nam (Tierra del Fuego)",
      technicalSubsystem: 'Aztec L2 zkRollup & Estado ZK',
      descriptionEs: 'Registro soberano con pruebas UltraHonk y nulificadores aislados.',
      descriptionEn: 'Sovereign zero-knowledge registry with UltraHonk proofs and siloed nullifiers.',
      status: 'active',
      badgeColor: '#C67D34',
    },
    {
      id: 'nym-mixnet',
      indigenousName: 'Red Kawésqar',
      peopleName: 'Kawésqar (Canales Patagónicos)',
      technicalSubsystem: 'Nym Mixnet Transporte Anónimo',
      descriptionEs: 'Enrutamiento en cebolla Sphinx por 3 saltos con retardo estocástico.',
      descriptionEn: 'Sphinx onion routing over 3 mixnet hops with Poisson stochastic delays.',
      status: 'active',
      badgeColor: '#48A9B8',
    },
    {
      id: 'pq-engine',
      indigenousName: 'Red Lickan Antay',
      peopleName: 'Lickan Antay (Atacameños del Norte)',
      technicalSubsystem: 'Criptografía Post-Cuántica NIST FIPS 203/204',
      descriptionEs: 'Blindaje cuántico incondicional con ML-KEM-1024, ML-DSA-87 y SPQR.',
      descriptionEn: 'Unconditional quantum-safe shield via ML-KEM-1024, ML-DSA-87, and SPQR ratchet.',
      status: 'active',
      badgeColor: '#D8973C',
    },
    {
      id: 'local-vault',
      indigenousName: 'Red Yagán',
      peopleName: 'Yagán (Cabo de Hornos y Archipiélagos)',
      technicalSubsystem: 'Bóveda Local PXE & SQLCipher',
      descriptionEs: 'Ejecución del lado del cliente sin servidores ni telemetría externa.',
      descriptionEn: 'Zero-telemetry client-side PXE execution and encrypted local vault.',
      status: 'active',
      badgeColor: '#A83226',
    },
  ] as NetworkLayerInfo[],

  // Glifos geométricos abstractos inspirados en las pinturas del Hain
  glyphs: {
    triangleUp: '▲',
    triangleDown: '▼',
    diamond: '◈',
    hexagon: '⬡',
    horizontalDivider: '━ ◈ ━',
    ceremonialStripes: '||| ◈ |||',
  },
};

export const I18N = {
  es: {
    appTitle: 'Chaquant',
    appSubtitle: 'Mensajería Web3 Soberana Post-Cuántica',
    networkTitle: 'Redes Ancestrales Activas',
    activeSessions: 'Sesiones Activas',
    noActiveSessions: 'No hay sesiones pairwise activas.',
    emptyExplanation:
      'Tus comunicaciones son efímeras y matemáticamente impenetrables. Genera o escanea un puntero ligero para abrir un canal cuántico.',
    btnNewSession: '+ Nueva Sesión Pairwise (Red Ona / Kawésqar)',
    connectedToTestnet: 'Aztec Testnet Conectado (Contrato 0x27f1...109b)',
    backBtn: '← Volver',
    connectedPeer: 'Contacto Seguro',
    pqShieldActive: 'Blindaje Cuántico Activo (ML-KEM / ML-DSA)',
    coverTrafficSaver: 'Tráfico de Cobertura: Ahorro Batería',
    coverTrafficParanoia: 'Tráfico de Cobertura: Paranoia Máxima (Poisson)',
    revokeSession: 'Revocar en Aztec L2',
    revokedStatus: 'Sesión Nulificada / Destruida',
    typeMessagePlaceholder: 'Mensaje cifrado con SPQR y Sphinx...',
    sendBtn: 'Transmitir',
    inMixnet: 'Enrutando por fiordos (Mixnet)...',
    delivered: 'Entregado (0 metadatos filtrados)',
    inviteTitle: 'Invitación Pairwise (Red Ona)',
    tabGenerate: 'Generar Puntero',
    tabScan: 'Recibir Invitación',
    genExplanation:
      'Se genera un puntero ligero (~120 bytes). El Prekey Bundle completo (6.2 KB) se transmite por la Red Kawésqar de forma ciega.',
    scanExplanation:
      'Escanea el puntero efímero de tu contraparte corporativa para sincronizar el intercambio criptográfico PQXDH.',
    btnGeneratePointer: 'Generar Puntero Ciego',
    btnSimulateScan: 'Simular Recepción de Puntero',
    downloadingBundle: 'Descargando Prekey Bundle por Nym Mixnet...',
    closeBtn: 'Cerrar',
  },
  en: {
    appTitle: 'Chaquant',
    appSubtitle: 'Sovereign Post-Quantum Web3 Messaging',
    networkTitle: 'Active Ancestral Networks',
    activeSessions: 'Active Sessions',
    noActiveSessions: 'No active pairwise sessions.',
    emptyExplanation:
      'Your communications are ephemeral and mathematically impenetrable. Generate or scan a lightweight pointer to open a quantum-safe channel.',
    btnNewSession: '+ New Pairwise Session (Ona / Kawésqar Net)',
    connectedToTestnet: 'Aztec Testnet Connected (Contract 0x27f1...109b)',
    backBtn: '← Back',
    connectedPeer: 'Secure Peer',
    pqShieldActive: 'Post-Quantum Shield Active (ML-KEM / ML-DSA)',
    coverTrafficSaver: 'Cover Traffic: Battery Saver',
    coverTrafficParanoia: 'Cover Traffic: Maximum Paranoia (Poisson)',
    revokeSession: 'Revoke on Aztec L2',
    revokedStatus: 'Session Nullified / Destroyed',
    typeMessagePlaceholder: 'Type message encrypted with SPQR & Sphinx...',
    sendBtn: 'Transmit',
    inMixnet: 'Routing across fiords (Mixnet)...',
    delivered: 'Delivered (0 metadata leaks)',
    inviteTitle: 'Pairwise Invite (Ona Network)',
    tabGenerate: 'Generate Pointer',
    tabScan: 'Receive Invite',
    genExplanation:
      'A lightweight pointer (~120 bytes) is generated. The full Prekey Bundle (6.2 KB) is transmitted blindly through the Kawésqar Network.',
    scanExplanation:
      'Scan your corporate peer’s ephemeral pointer to synchronize the PQXDH cryptographic handshake.',
    btnGeneratePointer: 'Generate Blind Pointer',
    btnSimulateScan: 'Simulate Receiving Pointer',
    downloadingBundle: 'Downloading Prekey Bundle via Nym Mixnet...',
    closeBtn: 'Close',
  },
};
