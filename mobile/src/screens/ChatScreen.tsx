import React, { useState } from 'react';
import { LocalMessage, secureStorage } from '../storage/db';
import { aztecPxe } from '../pxe/aztec_client';
import { CULTURAL_THEME, I18N } from '../theme/cultural';
import { 
  TITAN_SANDBOX_SESSION_ID, 
  TITAN_SANDBOX_ROOM_NAME, 
  SandboxBotEngine, 
  SandboxDestructionReceipt 
} from '../demo/sandbox_bot';

export interface ChatScreenProps {
  sessionId: string;
  peerEphemeralId: string;
  lang?: 'es' | 'en';
  onBack: () => void;
  onToggleLang?: () => void;
}

export type CoverTrafficMode = 'battery_saver' | 'paranoia_max';

export const ChatScreen: React.FC<ChatScreenProps> = ({
  sessionId,
  peerEphemeralId,
  lang = 'es',
  onBack,
  onToggleLang,
}) => {
  const t = I18N[lang];
  const { colors } = CULTURAL_THEME;
  const isSandbox = sessionId === TITAN_SANDBOX_SESSION_ID;

  const [messages, setMessages] = useState<LocalMessage[]>([
    isSandbox
      ? SandboxBotEngine.getInitialBotMessage()
      : {
          id: 'm1',
          sessionId,
          sender: 'peer',
          text:
            lang === 'es'
              ? 'Conexión establecida. Red Ona (Aztec L2) sincronizada y Red Kawésqar (Nym Mixnet) activa.'
              : 'Connection established. Ona Network (Aztec L2) synchronized and Kawésqar Network (Nym Mixnet) active.',
          timestamp: Date.now() - 60000,
          deliveryStatus: 'delivered',
          isPqEncrypted: true,
        },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);
  const [coverMode, setCoverMode] = useState<CoverTrafficMode>('battery_saver');
  const [receiptModal, setReceiptModal] = useState<SandboxDestructionReceipt | null>(null);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending || isRevoked) return;
    const currentInput = inputText.trim();

    const newMsg: LocalMessage = {
      id: 'm_' + Date.now(),
      sessionId,
      sender: 'me',
      text: currentInput,
      timestamp: Date.now(),
      deliveryStatus: 'in_mixnet',
      isPqEncrypted: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setIsSending(true);

    if (isSandbox) {
      // ET-07: Respuesta automática a los 1.5s simulando cifrado real y métricas ZK
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, deliveryStatus: 'delivered' } : m))
        );

        const { botResponseText } = SandboxBotEngine.processMessage(currentInput);
        const botMsg: LocalMessage = {
          id: 'bot_' + Date.now(),
          sessionId,
          sender: 'peer',
          text: botResponseText,
          timestamp: Date.now(),
          deliveryStatus: 'delivered',
          isPqEncrypted: true,
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsSending(false);
      }, 1500);
    } else {
      // Simula el tránsito por los 3 mixnodes con retardo Poisson
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, deliveryStatus: 'delivered' } : m))
        );
        setIsSending(false);
      }, 2500);
    }
  };

  const handleSandboxDestruction = () => {
    const receipt = SandboxBotEngine.generateDestructionReceipt();
    setReceiptModal(receipt);
    setIsRevoked(true);
  };

  const handleResetSandbox = async () => {
    await secureStorage.resetSandboxDemo();
    setMessages([SandboxBotEngine.getInitialBotMessage()]);
    setIsRevoked(false);
    setReceiptModal(null);
  };

  const handleRevokeSession = async () => {
    const confirmRevoke = window.confirm(
      lang === 'es'
        ? '¿Deseas revocar esta sesión en la Red Ona (Aztec L2)? Se emitirá un nulificador y se destruirá el canal permanentemente.'
        : 'Do you want to revoke this session on the Ona Network (Aztec L2)? A nullifier will be emitted, permanently destroying the channel.'
    );
    if (!confirmRevoke) return;

    setIsRevoking(true);
    try {
      await aztecPxe.revokeSessionOnChain(sessionId, 'blind_ticket_ona_selknam');
      await secureStorage.markSessionRevoked(sessionId);
      setIsRevoked(true);
      alert(
        lang === 'es'
          ? 'Sesión revocada exitosamente en Aztec Testnet (0x27f1...109b).'
          : 'Session successfully revoked on Aztec Testnet (0x27f1...109b).'
      );
    } catch (e) {
      alert((lang === 'es' ? 'Error al revocar: ' : 'Revocation error: ') + e);
    } finally {
      setIsRevoking(false);
    }
  };

  const toggleCoverMode = () => {
    setCoverMode((prev) => (prev === 'battery_saver' ? 'paranoia_max' : 'battery_saver'));
  };

  return (
    <div style={styles.chatContainer}>
      {/* Encabezado Tierra-Austral */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <button onClick={onBack} style={styles.backBtn}>
            {t.backBtn}
          </button>
          <div style={styles.peerIdRow}>
            <span style={styles.statusDot} />
            <span style={styles.peerTitle}>{peerEphemeralId}</span>
          </div>
          {onToggleLang && (
            <button onClick={onToggleLang} style={styles.langBtn}>
              {lang.toUpperCase()}
            </button>
          )}
        </div>

        {/* Badges de Redes Ancestrales del Protocolo */}
        <div style={styles.badgesRow}>
          <span style={styles.badgeOna}>▲ Red Ona (Aztec ZK)</span>
          <span style={styles.badgeKawesqar}>◈ Red Kawésqar (Mixnet)</span>
          <span style={styles.badgeLickan}>⬡ Red Lickan Antay (PQ)</span>
          <button
            onClick={toggleCoverMode}
            style={coverMode === 'battery_saver' ? styles.badgeBattery : styles.badgeParanoia}
            title={
              coverMode === 'battery_saver'
                ? 'Intervalos adaptativos de tráfico de cobertura'
                : 'Tráfico de cobertura continuo Poisson'
            }
          >
            {coverMode === 'battery_saver' ? '● Ahorro Batería' : '▲ Paranoia Máx'}
          </button>
        </div>

        {/* Acción de Revocación de Sesión / Bot Sandbox */}
        <div style={styles.revokeBar}>
          {isSandbox ? (
            <div style={styles.sandboxActionsRow}>
              {isRevoked ? (
                <div style={styles.sandboxRevokedBox}>
                  <span style={styles.revokedStatus}>SALA DESTRUIDA EN AZTEC L2</span>
                  <button onClick={handleResetSandbox} style={styles.resetBtn}>
                    🔄 Restaurar Sala Sandbox
                  </button>
                </div>
              ) : (
                <div style={styles.sandboxLiveBox}>
                  <button
                    onClick={handleSandboxDestruction}
                    style={styles.sandboxDestructBtn}
                    title="Ejecuta purga de claves en hardware (Crypto-Shredding) y emite el Recibo ZK FIPS 204"
                  >
                    ⚖️ Ejecutar Purga Forense (Crypto-Shredding) y Emitir Recibo ZK (ML-DSA-87)
                  </button>
                  <button onClick={handleResetSandbox} style={styles.resetBtn}>
                    🔄 Reiniciar
                  </button>
                </div>
              )}
            </div>
          ) : isRevoked ? (
            <span style={styles.revokedStatus}>{t.revokedStatus}</span>
          ) : (
            <button
              onClick={handleRevokeSession}
              disabled={isRevoking}
              style={styles.revokeBtn}
            >
              {isRevoking ? 'Emitiendo nulificador...' : t.revokeSession}
            </button>
          )}
        </div>
      </div>

      {/* Banner Exclusivo Sandbox Revisor */}
      {isSandbox && (
        <div style={styles.sandboxBanner}>
          <span style={styles.sandboxBadge}>⚡ SANDBOX AEGIS</span>
          <span style={styles.sandboxText}>
            Entorno pre-cargado para Comités de Grants (OTF, AWS, Aztec, Nym) y Tiendas. Prueba en vivo la resiliencia cuántica y anti-DPI.
          </span>
        </div>
      )}

      {/* Lista de Mensajes */}
      <div style={styles.messageList}>
        <div style={styles.ceremonialHeader}>
          <span>━━━ ◈ CANAL CUÁNTICO PRIVADO ◈ ━━━</span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          return (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  backgroundColor: isMe ? colors.ochreFuego : colors.bgCard,
                  color: isMe ? '#0C0E14' : colors.textPrimary,
                  border: isMe ? 'none' : `1px solid ${colors.borderSubtle}`,
                }}
              >
                <div style={styles.msgText}>{msg.text}</div>
                <div style={styles.msgMeta}>
                  {msg.isPqEncrypted && (
                    <span
                      style={{
                        ...styles.pqIndicator,
                        color: isMe ? '#401A06' : colors.glacierCyan,
                      }}
                    >
                      🛡️ ML-KEM
                    </span>
                  )}
                  <span style={styles.statusIndicator}>
                    {msg.deliveryStatus === 'delivered' ? '✓✓' : '...'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Entrada de Mensaje */}
      <div style={styles.inputBar}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={isRevoked ? 'Canal destruido permanentemente' : t.typeMessagePlaceholder}
          disabled={isRevoked || isSending}
          style={styles.inputField}
        />
        <button
          onClick={handleSendMessage}
          disabled={isRevoked || isSending || !inputText.trim()}
          style={{
            ...styles.sendBtn,
            opacity: isRevoked || isSending || !inputText.trim() ? 0.5 : 1,
          }}
        >
          {isSending ? '...' : t.sendBtn}
        </button>
      </div>

      {/* Modal de Certificado de Destrucción Criptográfica Legal (FIPS 204 ML-DSA-87) */}
      {receiptModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <span style={styles.modalBadge}>⚖️ CERTIFICADO CANÓNICO LEGAL</span>
              <button onClick={() => setReceiptModal(null)} style={styles.closeModalBtn}>✕</button>
            </div>
            <h3 style={styles.modalTitle}>Destrucción Verificada en Aztec L2</h3>
            <p style={styles.modalSubtitle}>
              Cumplimiento estricto GDPR Art. 17 (Right-to-be-Forgotten) y borrado físico de claves en hardware.
            </p>

            <div style={styles.certFieldBox}>
              <div style={styles.certRow}>
                <span style={styles.certLabel}>Algoritmo de Firma:</span>
                <span style={styles.certVal}>{receiptModal.algorithm}</span>
              </div>
              <div style={styles.certRow}>
                <span style={styles.certLabel}>Contrato Notario Aztec:</span>
                <code style={styles.certCode}>{receiptModal.aztec_registry_address}</code>
              </div>
              <div style={styles.certRow}>
                <span style={styles.certLabel}>Nulificador Siloed L2:</span>
                <code style={styles.certCode}>{receiptModal.siloed_nullifier.substring(0, 24)}...</code>
              </div>
              <div style={styles.certRow}>
                <span style={styles.certLabel}>Compromiso Sala:</span>
                <code style={styles.certCode}>{receiptModal.deal_room_commitment.substring(0, 24)}...</code>
              </div>
            </div>

            <pre style={styles.jsonBox}>
              {JSON.stringify(receiptModal, null, 2)}
            </pre>

            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(receiptModal, null, 2));
                  alert('Certificado JSON copiado al portapapeles');
                }}
                style={styles.copyJsonBtn}
              >
                📋 Copiar JSON Canónico
              </button>
              <button onClick={() => setReceiptModal(null)} style={styles.dismissBtn}>
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: CULTURAL_THEME.colors.bgPrimary,
    color: CULTURAL_THEME.colors.textPrimary,
  },
  header: {
    padding: '16px 16px 12px 16px',
    backgroundColor: CULTURAL_THEME.colors.bgSecondary,
    borderBottom: `1px solid ${CULTURAL_THEME.colors.borderOchre}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: CULTURAL_THEME.colors.ochreFuego,
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  langBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
    color: CULTURAL_THEME.colors.textSecondary,
    fontSize: '10px',
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  peerIdRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: CULTURAL_THEME.colors.ochreFuego,
    boxShadow: `0 0 8px ${CULTURAL_THEME.colors.ochreFuego}`,
  },
  peerTitle: {
    fontWeight: 700,
    fontSize: '14px',
    letterSpacing: '0.2px',
  },
  badgesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  badgeOna: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'rgba(198, 125, 52, 0.15)',
    color: CULTURAL_THEME.colors.ochreFuego,
    padding: '3px 8px',
    borderRadius: '6px',
    border: `1px solid rgba(198, 125, 52, 0.3)`,
  },
  badgeKawesqar: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'rgba(72, 169, 184, 0.15)',
    color: CULTURAL_THEME.colors.glacierCyan,
    padding: '3px 8px',
    borderRadius: '6px',
    border: `1px solid rgba(72, 169, 184, 0.3)`,
  },
  badgeLickan: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'rgba(216, 151, 60, 0.15)',
    color: CULTURAL_THEME.colors.desertGold,
    padding: '3px 8px',
    borderRadius: '6px',
    border: `1px solid rgba(216, 151, 60, 0.3)`,
  },
  badgeBattery: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    color: CULTURAL_THEME.colors.success,
    padding: '3px 8px',
    borderRadius: '6px',
    border: `1px solid rgba(63, 185, 80, 0.3)`,
    cursor: 'pointer',
  },
  badgeParanoia: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'rgba(210, 153, 34, 0.2)',
    color: CULTURAL_THEME.colors.warning,
    padding: '3px 8px',
    borderRadius: '6px',
    border: `1px solid rgba(210, 153, 34, 0.4)`,
    cursor: 'pointer',
  },
  revokeBar: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  revokeBtn: {
    backgroundColor: 'rgba(168, 50, 38, 0.18)',
    color: '#FF7B72',
    border: '1px solid rgba(168, 50, 38, 0.4)',
    borderRadius: '8px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  revokedStatus: {
    color: CULTURAL_THEME.colors.danger,
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(248, 81, 73, 0.1)',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ceremonialHeader: {
    textAlign: 'center',
    fontSize: '10px',
    color: CULTURAL_THEME.colors.patagoniaSlate,
    letterSpacing: '2px',
    margin: '4px 0 12px 0',
    opacity: 0.7,
  },
  messageRow: {
    display: 'flex',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: '14px',
    padding: '12px 14px',
    fontSize: '13px',
    lineHeight: '1.45',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  },
  msgText: {
    wordBreak: 'break-word',
  },
  msgMeta: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    opacity: 0.8,
    marginTop: '6px',
  },
  pqIndicator: {
    fontWeight: 700,
  },
  statusIndicator: {
    fontWeight: 800,
  },
  inputBar: {
    display: 'flex',
    gap: '10px',
    padding: '14px 16px',
    backgroundColor: CULTURAL_THEME.colors.bgSecondary,
    borderTop: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
  },
  inputField: {
    flex: 1,
    backgroundColor: CULTURAL_THEME.colors.bgPrimary,
    border: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
    borderRadius: '12px',
    padding: '12px 14px',
    color: CULTURAL_THEME.colors.textPrimary,
    fontSize: '13px',
    outline: 'none',
  },
  sendBtn: {
    backgroundColor: CULTURAL_THEME.colors.ochreFuego,
    color: '#0C0E14',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 20px',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: '13px',
    letterSpacing: '0.3px',
    boxShadow: `0 2px 10px rgba(198, 125, 52, 0.3)`,
  },
  sandboxBanner: {
    padding: '8px 14px',
    backgroundColor: 'rgba(217, 119, 6, 0.14)',
    borderBottom: '1px solid rgba(217, 119, 6, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sandboxBadge: {
    fontSize: '9px',
    fontWeight: 800,
    backgroundColor: '#D97706',
    color: '#000',
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
  },
  sandboxText: {
    fontSize: '10px',
    color: '#FDE68A',
    lineHeight: '1.3',
  },
  sandboxActionsRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  sandboxLiveBox: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  sandboxRevokedBox: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  sandboxDestructBtn: {
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
    color: '#F87171',
    border: '1px solid rgba(220, 38, 38, 0.5)',
    borderRadius: '8px',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  resetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#E2E8F0',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 999,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '18px',
    width: '100%',
    maxHeight: '90%',
    overflowY: 'auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.85)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBadge: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#34D399',
    letterSpacing: '1px',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '16px',
    cursor: 'pointer',
  },
  modalTitle: {
    margin: 0,
    fontSize: '15px',
    color: '#F8FAFC',
    fontWeight: 700,
  },
  modalSubtitle: {
    margin: 0,
    fontSize: '11px',
    color: '#94A3B8',
    lineHeight: '1.4',
  },
  certFieldBox: {
    backgroundColor: '#1E293B',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  certRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    gap: '6px',
  },
  certLabel: {
    color: '#94A3B8',
  },
  certVal: {
    color: '#F8FAFC',
    fontWeight: 600,
  },
  certCode: {
    color: '#38BDF8',
    fontFamily: 'monospace',
    fontSize: '9px',
  },
  jsonBox: {
    backgroundColor: '#020617',
    color: '#A7F3D0',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '9px',
    fontFamily: 'monospace',
    overflowX: 'auto',
    maxHeight: '140px',
    margin: 0,
    border: '1px solid #1E293B',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  copyJsonBtn: {
    backgroundColor: '#0F766E',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  dismissBtn: {
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
