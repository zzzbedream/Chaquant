/**
 * CHAQUANT PROTOCOL • CLIENT-SIDE SCRIPT
 * - Soporte Bilingüe Simultáneo (ES / EN)
 * - Canvas Selk'nam Generativo (Líneas y Puntos Ceremoniales del Hain)
 * - Modal de Contacto Técnico y Soporte de Integración FOSS
 */

// Diccionario de Traducción Simultáneo Bilingüe
const translations = {
  es: {
    'nav.problem': 'El Problema',
    'nav.pillars': '3 Pilares',
    'nav.usecases': 'Casos de Uso',
    'nav.deployment': 'Despliegue',
    'nav.audit': 'Auditoría',
    'nav.privacy': 'Privacidad',
    'nav.docs': 'Docs Técnicas',
    'ticker.ona': 'Red Ona (Aztec L2):',
    'ticker.kawesqar': 'Red Kawésqar (Nym Mixnet):',
    'ticker.lickan': 'Red Lickan Antay:',
    'ticker.yagan': 'Red Yagán:',
    'hero.badge': 'FOSS PUBLIC GOOD • CRIPTOGRAFÍA POST-CUÁNTICA NIST FIPS 203/204 • DUAL MIT/APACHE-2.0',
    'hero.titleLine1': 'Infraestructura Abierta',
    'hero.titleLine2': 'Post-Cuántica y Soberana',
    'hero.titleLine3': 'De Comunicación Humana',
    'hero.description':
      'Chaquant Protocol es un bien público de código abierto diseñado para comunicaciones de alto riesgo, periodistas de investigación, defensores de DD.HH. y resiliencia de infraestructuras críticas. Neutraliza la recolección global de metadatos (HNDL), sobrevive un 28.5% de pérdida de paquetes sin fugas de retransmisión TCP y certifica la destrucción matemática de información mediante Nulificadores Siloed en Aztec Layer-2.',
    'hero.ctaPrimary': 'Ver Código en GitHub',
    'hero.ctaSecondary': '11/11 Tests Rust Pasando (<0.05s)',
    'hero.ctaTertiary': 'Dossier Técnico & Benchmarks',
    'problem.tag': 'LOS 4 VECTORES DE AMENAZA',
    'problem.heading': 'Las fallas estructurales de la mensajería tradicional',
    'problem.lead':
      'Signal, WhatsApp y Telegram ofrecen cifrado de transporte, pero colapsan ante cuatro vectores de vigilancia estatal y computación cuántica.',
    'problem.card1Title': 'Cosechar Ahora, Descifrar Después (HNDL)',
    'problem.card1Desc':
      'Actores estatales interceptan y almacenan pasivamente el tráfico TLS y ECC (Curve25519). Cuando los ordenadores cuánticos alcancen la escala suficiente, Shor romperá ese material retrospectivamente, exponiendo décadas de comunicaciones.',
    'problem.card2Title': 'Recolección Global de Metadatos',
    'problem.card2Desc':
      'El cifrado de contenidos no oculta las direcciones IP, los tamaños de paquetes ni los grafos de relación social. Los adversarios pasivos reconstruyen redes enteras de activistas y fuentes sin descifrar un solo mensaje.',
    'problem.card3Title': 'Fugas por Degradación y Retransmisión',
    'problem.card3Desc':
      'Bajo interferencia activa o censura (DPI), las retransmisiones TCP/ARQ delatan patrones de tráfico temporales. Chaquant implementa Reed-Solomon FEC (10+4), reconstruyendo el contenido sin pedir retransmisión aunque se pierda el 28.5% de los paquetes.',
    'pillars.tag': 'ARQUITECTURA DE PRIVACIDAD ABSOLUTA',
    'pillars.heading': 'Tres pilares de defensa matemática insuperable',
    'pillars.lead':
      'Inspirados en la resistencia de los pueblos originarios de Chile y respaldados por la vanguardia de la criptografía Zero-Knowledge y Post-Cuántica.',
    'pillars.p1Title': 'Resistencia Cuántica Incondicional (NIST FIPS 203 & 204)',
    'pillars.p1Desc':
      'Reemplazamos los algoritmos vulnerables por el estándar del NIST de última generación: ML-KEM-1024 (Kyber) para encapsulación de claves y ML-DSA-87 (Dilithium) para firmas digitales. Nuestro trinquete SPQR inyecta entropía cuántica periódica, garantizando secreto perfecto hacia adelante y auto-sanación tras compromiso sin sobrecargar la red móvil.',
    'pillars.p2Title': 'Invisibilidad de Metadatos con Nym Mixnet',
    'pillars.p2Desc':
      'Cifrar el texto no basta si el canal delata los interlocutores. La Red Kawésqar envía cada mensaje a través de una Mixnet descentralizada de 3 saltos utilizando paquetes Sphinx de longitud uniforme (1024 bytes). El tráfico se mezcla con retardos estocásticos de Poisson y se inyecta tráfico de cobertura artificial para imposibilitar el análisis de flujo.',
    'pillars.p3Title': 'Soberanía de Datos con Aztec Network L2 y Bóveda Local',
    'pillars.p3Desc':
      'La identidad criptográfica y la gestión de sesiones se anclan en Aztec Network L2 mediante contratos inteligentes escritos en Noir. Las sesiones se revocan instantáneamente emitiendo nulificadores aislados sin revelar identidades en la blockchain. La información local se almacena en el cliente mediante PXE y SQLCipher con purga inmediata en RAM (ZeroizeOnDrop).',
    'usecases.tag': 'APLICACIONES DE ALTO IMPACTO',
    'usecases.heading': 'Diseñado para entornos de máxima hostilidad',
    'usecases.lead':
      'Infraestructura de comunicaciones soberana donde una filtración de identidad o metadatos amenaza la integridad física o la soberanía tecnológica.',
    'usecases.u1Title': 'Protección de Fuentes y DD.HH.',
    'usecases.u1Desc':
      'Periodistas de investigación, defensores de derechos humanos y whistleblowers en zonas de conflicto. Resistencia matemática frente a spyware comercial (Pegasus), interceptación telefónica y extracción física mediante hardware forense (UFED).',
    'usecases.u1Pill': 'Inmunidad Anti-Vigilancia Masiva',
    'usecases.u2Title': 'Infraestructuras Críticas y CSIRTs',
    'usecases.u2Desc':
      'Canal de coordinación fuera de banda (out-of-band) para equipos de respuesta a incidentes de seguridad nacional (CSIRT), redes eléctricas y telecomunicaciones durante ataques de denegación o brechas de red interna.',
    'usecases.u2Pill': 'Canal Fuera de Banda Desacoplado',
    'usecases.u3Title': 'I+D Criptográfico y Gobernanza',
    'usecases.u3Desc':
      'Laboratorios científicos, comités de gobernanza descentralizada y desarrolladores de protocolos abiertos con necesidad de salvaguardar material de investigación frente a campañas de almacenamiento a largo plazo (HNDL).',
    'usecases.u3Pill': 'Resistencia HNDL a 20+ Años',
    'deployment.tag': 'DESPLIEGUE AUTÓNOMO Y BIEN PÚBLICO',
    'deployment.heading': '100% Código Abierto, Sin Servidores Centrales Ni Custodia',
    'deployment.lead':
      'Licencia dual MIT / Apache-2.0. Despliegue su propio nodo soberano de Mixnet y Relay efímero en RAM, o integre el motor en Rust con sus aplicaciones.',
    'deployment.c1Name': 'Nodo Soberano Mesh',
    'deployment.c1Sub': 'Aztec L2 PXE + Nym Mixnet Gateway + RAM Relay',
    'deployment.c1Btn': 'Ver docker-compose.selfhosted.yml',
    'deployment.featured': 'CLIENTE SOBERANO',
    'deployment.c2Name': 'Aplicación Móvil',
    'deployment.c2Sub': 'Bóveda SQLCipher + Biometría + Blind Push',
    'deployment.c2Btn': 'Explorar Código Móvil',
    'deployment.c3Name': 'Protocol Core SDK',
    'deployment.c3Sub': 'Compilación Cruzada para Linux, macOS, Android e iOS',
    'deployment.c3Btn': 'Ver Script de Compilación',
    'audit.tag': 'VERIFICACIÓN Y RIGOR TÉCNICO',
    'audit.heading': 'Auditoría en tres capas verificada',
    'audit.lead':
      'La privacidad absoluta no es una promesa de marketing, es un teorema matemático respaldado por pruebas de código y contratos en red.',
    'audit.c1Title': 'Vectores Oficiales NIST',
    'audit.c1Desc':
      'El motor criptográfico en Rust (`chaquant-core`) implementa los estándares FIPS 203 y FIPS 204 con verificación estricta de vectores de prueba y parámetros de curva fija sin fallback a cifrados débiles.',
    'audit.c2Title': 'Mixnet Nym & Reed-Solomon FEC',
    'audit.c2Desc':
      'Encapsulación uniforme Sphinx en tramas fijas de 1024 bytes. Código de borrado Reed-Solomon (10+4) probado contra descarte intencional de paquetes y retardos estocásticos de Poisson.',
    'audit.c3Title': 'Contratos Aztec L2',
    'audit.c3Desc':
      'Contratos `PairwiseSessionRegistry.nr` y `SessionNote.nr` probados con pruebas UltraHonk y desplegados en Aztec Testnet con emisión de nulificadores aislados sin correlación.',
    'final.title': 'Construyendo el futuro de la privacidad humana',
    'final.desc':
      'Chaquant Protocol es un bien público abierto. Explora el código, ejecuta los tests o despliega un nodo soberano comunitario.',
    'final.btn': 'Colaborar en GitHub',
    'footer.tagline':
      'Inspirado en la dignidad y resistencia de los pueblos originarios de Chile (Selk\'nam, Kawésqar, Lickan Antay, Yagán). Diseñado para la soberanía absoluta de las comunicaciones humanas.',
    'footer.networks': 'Redes del Protocolo',
    'footer.resources': 'Recursos Técnicos',
    'modal.title': 'Contacto Técnico & Integración',
    'modal.desc':
      'Para investigadores, desarrolladores o equipos de seguridad que requieran soporte técnico en el despliegue de nodos o integración del SDK.',
    'modal.name': 'Nombre / Identificador',
    'modal.email': 'Correo de Contacto',
    'modal.company': 'Organización / Proyecto',
    'modal.plan': 'Área de Interés',
    'modal.submit': 'Enviar Consulta Técnica',
  },
  en: {
    'nav.problem': 'The Problem',
    'nav.pillars': '3 Pillars',
    'nav.usecases': 'Use Cases',
    'nav.deployment': 'Deployment',
    'nav.audit': 'Security Audit',
    'nav.privacy': 'Privacy',
    'nav.docs': 'Tech Docs',
    'ticker.ona': 'Ona Network (Aztec L2):',
    'ticker.kawesqar': 'Kawésqar Network (Nym Mixnet):',
    'ticker.lickan': 'Lickan Antay Network:',
    'ticker.yagan': 'Yagán Network:',
    'hero.badge': 'FOSS PUBLIC GOOD • NIST FIPS 203/204 POST-QUANTUM CRYPTOGRAPHY • DUAL MIT/APACHE-2.0',
    'hero.titleLine1': 'Open Infrastructure',
    'hero.titleLine2': 'Post-Quantum & Sovereign',
    'hero.titleLine3': 'For Human Communication',
    'hero.description':
      'Chaquant Protocol is a FOSS public good engineered for high-risk communications, investigative journalism, human rights defenders, and critical infrastructure resilience. Eliminates metadata harvesting (HNDL), survives 28.5% packet drop without TCP retransmission leaks, and guarantees mathematical proof of data destruction via Aztec Layer-2 Siloed Nullifiers.',
    'hero.ctaPrimary': 'View Source on GitHub',
    'hero.ctaSecondary': '11/11 Rust Tests Passing (<0.05s)',
    'hero.ctaTertiary': 'Technical Dossier & Benchmarks',
    'problem.tag': 'THE 4 THREAT VECTORS',
    'problem.heading': 'Structural Failures of Legacy Secure Messaging',
    'problem.lead':
      'Signal, WhatsApp, and Telegram provide transport-layer encryption, but fail under four modern vectors of nation-state surveillance and quantum computing.',
    'problem.card1Title': 'Harvest Now, Decrypt Later (HNDL)',
    'problem.card1Desc':
      'State adversaries passively intercept and store classical TLS and ECC traffic today. When cryptographically relevant quantum computers arrive, Shor’s algorithm will retroactively expose decades of communications.',
    'problem.card2Title': 'Global Metadata Harvesting',
    'problem.card2Desc':
      'Content encryption does not obscure IP addresses, packet timings, or communication graphs. Passive observers reconstruct complete social networks without ever breaking payload ciphers.',
    'problem.card3Title': 'Degradation & Retransmission Leaks',
    'problem.card3Desc':
      'Under active Deep Packet Inspection, TCP/ARQ retransmissions leak timing signatures. Chaquant implements Reed-Solomon FEC (10+4), reconstructing full payloads without ARQ retransmission leaks under 28.5% packet drop.',
    'pillars.tag': 'ABSOLUTE PRIVACY ARCHITECTURE',
    'pillars.heading': 'Three Pillars of Insuperable Mathematical Defense',
    'pillars.lead':
      'Inspired by the ancestral resistance of Chile’s indigenous peoples, backed by cutting-edge Zero-Knowledge proofs and Post-Quantum lattice cryptography.',
    'pillars.p1Title': 'Unconditional Quantum Resistance (NIST FIPS 203 & 204)',
    'pillars.p1Desc':
      'We replace vulnerable algorithms with the latest ratified NIST standard: ML-KEM-1024 (Kyber) for key encapsulation and ML-DSA-87 (Dilithium) for digital signatures. Our SPQR ratchet injects quantum entropy periodically for forward secrecy and post-compromise self-healing without mobile network bloat.',
    'pillars.p2Title': 'Metadata Invisibility via Nym Mixnet',
    'pillars.p2Desc':
      'Encrypting text is meaningless if traffic metadata betrays participants. The Kawésqar Network routes every packet through a 3-hop decentralized mixnet using fixed 1024-byte Sphinx frames, Poisson delays, and artificial cover traffic.',
    'pillars.p3Title': 'Data Sovereignty with Aztec Network L2 & Local Vault',
    'pillars.p3Desc':
      'Cryptographic identity and session states are anchored on Aztec Network L2 using Noir smart contracts. Sessions are revoked instantly by emitting app-siloed nullifiers without revealing on-chain identities. Data resides solely in local SQLCipher storage with RAM zeroization on drop.',
    'usecases.tag': 'HIGH-IMPACT APPLICATIONS',
    'usecases.heading': 'Engineered for High-Adversity Threat Environments',
    'usecases.lead':
      'Sovereign communications infrastructure where an identity or metadata breach threatens physical safety or national technological sovereignty.',
    'usecases.u1Title': 'Source Protection & Human Rights Defenders',
    'usecases.u1Desc':
      'Investigative journalists, human rights defenders, and whistleblowers in conflict zones. Mathematical defense against commercial spyware (Pegasus), telecom wiretapping, and physical forensics (UFED).',
    'usecases.u1Pill': 'Anti-Mass Surveillance Immunity',
    'usecases.u2Title': 'Critical Infrastructure & National CSIRTs',
    'usecases.u2Desc':
      'Out-of-band coordination channel for national Computer Security Incident Response Teams (CSIRTs), electrical grids, and telecommunications during cyber warfare and internal network breaches.',
    'usecases.u2Pill': 'Decoupled Out-of-Band Channel',
    'usecases.u3Title': 'Cryptographic R&D & Decentralized Governance',
    'usecases.u3Desc':
      'Scientific research laboratories, decentralized governance councils, and open protocol builders requiring long-term data security against Harvest Now Decrypt Later campaigns.',
    'usecases.u3Pill': '20+ Year HNDL Resilience',
    'deployment.tag': 'AUTONOMOUS DEPLOYMENT & PUBLIC GOOD',
    'deployment.heading': '100% Open Source, Zero Central Servers, Zero Custody',
    'deployment.lead':
      'Dual MIT / Apache-2.0 license. Spin up a self-hosted Mixnet and RAM-only ephemeral relay, or integrate the Rust engine directly with your client applications.',
    'deployment.c1Name': 'Self-Hosted Sovereign Node',
    'deployment.c1Sub': 'Aztec L2 PXE + Nym Mixnet Gateway + RAM Relay',
    'deployment.c1Btn': 'View docker-compose.selfhosted.yml',
    'deployment.featured': 'SOVEREIGN CLIENT',
    'deployment.c2Name': 'Mobile Client',
    'deployment.c2Sub': 'SQLCipher Vault + Biometrics + Blind Push',
    'deployment.c2Btn': 'Explore Mobile Code',
    'deployment.c3Name': 'Protocol Core SDK',
    'deployment.c3Sub': 'Cross-Compilation for Linux, macOS, Android & iOS',
    'deployment.c3Btn': 'View Build Script',
    'audit.tag': 'TECHNICAL RIGOR & VERIFICATION',
    'audit.heading': 'Three-Layer Verified Security Audit',
    'audit.lead':
      'Absolute privacy is not a marketing catchphrase; it is a mathematical theorem backed by executable code, automated test suites, and on-chain ZK state.',
    'audit.c1Title': 'Official NIST Vectors',
    'audit.c1Desc':
      'The Rust core engine (`chaquant-core`) implements FIPS 203 and FIPS 204 with strict parameter adherence, automated test vectors, and zero legacy fallback.',
    'audit.c2Title': 'Nym Mixnet & Reed-Solomon FEC',
    'audit.c2Desc':
      'Uniform 1024-byte Sphinx encapsulation. Reed-Solomon erasure coding (10+4) validated against intentional packet drops and stochastic Poisson delays.',
    'audit.c3Title': 'Aztec L2 Smart Contracts',
    'audit.c3Desc':
      '`PairwiseSessionRegistry.nr` and `SessionNote.nr` verified with UltraHonk proofs and deployed on Aztec Testnet with siloed nullifiers.',
    'final.title': 'Building the Future of Sovereign Human Privacy',
    'final.desc':
      'Chaquant Protocol is a FOSS public good. Explore the code, run the cryptographic test suites, or host a community node.',
    'final.btn': 'Contribute on GitHub',
    'footer.tagline':
      'Inspired by the dignity and resilience of Chile’s indigenous peoples (Selk\'nam, Kawésqar, Lickan Antay, Yagán). Engineered for sovereign human communication.',
    'footer.networks': 'Protocol Networks',
    'footer.resources': 'Technical Resources',
    'modal.title': 'Technical Contact & Integration',
    'modal.desc':
      'For researchers, developers, or security teams requiring technical guidance for node deployment or SDK integration.',
    'modal.name': 'Name / Handle',
    'modal.email': 'Contact Email',
    'modal.company': 'Organization / Project',
    'modal.plan': 'Area of Interest',
    'modal.submit': 'Submit Technical Inquiry',
  },
};

let currentLang = 'es';

function updateLanguage(lang) {
  currentLang = lang;
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  const langLabel = document.getElementById('lang-label');
  if (langLabel) {
    langLabel.textContent = lang === 'es' ? 'EN' : 'ES';
  }
}

// Canvas Selk'nam Generativo
function initSelknamCanvas() {
  const canvas = document.getElementById('selknam-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const lines = [];
  const lineCount = 28;

  for (let i = 0; i < lineCount; i++) {
    lines.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 60 + Math.random() * 120,
      speedY: 0.2 + Math.random() * 0.4,
      width: 1 + Math.random() * 2,
      opacity: 0.15 + Math.random() * 0.25,
      type: Math.random() > 0.6 ? 'vertical' : 'triangle',
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    lines.forEach((l) => {
      ctx.strokeStyle = `rgba(198, 125, 52, ${l.opacity})`;
      ctx.fillStyle = `rgba(168, 50, 38, ${l.opacity * 0.8})`;
      ctx.lineWidth = l.width;

      if (l.type === 'vertical') {
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x, l.y + l.length);
        ctx.stroke();

        // Puntos ceremoniales del Hain
        ctx.beginPath();
        ctx.arc(l.x, l.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Triángulos rituales Selk'nam
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x - 8, l.y + 16);
        ctx.lineTo(l.x + 8, l.y + 16);
        ctx.closePath();
        ctx.stroke();
      }

      l.y += l.speedY;
      if (l.y > height) {
        l.y = -l.length;
        l.x = Math.random() * width;
      }
    });

    requestAnimationFrame(draw);
  }

  draw();
}

// Modal de Contacto Técnico & Integración
function openDemoModal(planName) {
  const modal = document.getElementById('demo-modal');
  if (modal) {
    modal.style.display = 'flex';
    if (planName) {
      const select = document.getElementById('demo-plan');
      if (select) {
        select.value = planName;
      }
    }
  }
}

function closeDemoModal() {
  const modal = document.getElementById('demo-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function handleDemoSubmit(e) {
  e.preventDefault();
  const feedback = document.getElementById('demo-feedback');
  const form = document.getElementById('demo-form');

  if (feedback && form) {
    feedback.style.display = 'block';
    feedback.className = 'modal-feedback success';
    feedback.innerHTML =
      currentLang === 'es'
        ? '✓ Consulta técnica recibida. Nos pondremos en contacto para coordinar la integración.'
        : '✓ Technical inquiry received. Our engineers will follow up with integration details.';
    form.reset();
    setTimeout(() => {
      closeDemoModal();
      feedback.style.display = 'none';
    }, 2800);
  }
}

// Inicialización Global
document.addEventListener('DOMContentLoaded', () => {
  initSelknamCanvas();

  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const nextLang = currentLang === 'es' ? 'en' : 'es';
      updateLanguage(nextLang);
    });
  }

  // Cerrar modal con click en fondo
  const modal = document.getElementById('demo-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeDemoModal();
      }
    });
  }

  // Smooth scroll para todos los enlaces internos
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
});
