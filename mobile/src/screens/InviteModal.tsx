import React, { useState } from 'react';
import { CULTURAL_THEME, I18N } from '../theme/cultural';

export interface InviteModalProps {
  isOpen: boolean;
  lang?: 'es' | 'en';
  onClose: () => void;
  onSessionEstablished: (sessionId: string, peerEphemeralId: string) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  lang = 'es',
  onClose,
  onSessionEstablished,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloadingBundle, setIsDownloadingBundle] = useState<boolean>(false);

  const t = I18N[lang];
  const { colors } = CULTURAL_THEME;

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    // 1. El motor local sube el bundle completo (6.2 KB) cifrado a un buzón efímero de Nym
    // 2. Genera el puntero ligero de un solo uso (~120 bytes)
    setTimeout(() => {
      const lightweightPointer = {
        v: 1,
        net: 'red_ona_aztec_testnet',
        contract: '0x27f1c99a8b947c61e892d1b0987f65a4e32d109b',
        mbId: '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        k: '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        exp: Date.now() + 172800000, // 48 horas
      };
      setQrPayload(JSON.stringify(lightweightPointer));
      setIsGenerating(false);
    }, 300);
  };

  const handleScanMock = () => {
    setIsDownloadingBundle(true);
    // Simula la descarga y decodificación del bundle completo de 6.2 KB desde la Red Kawésqar (Nym)
    setTimeout(() => {
      setIsDownloadingBundle(false);
      const simulatedSessionId = 'session_selknam_' + Math.random().toString(36).substring(2, 9);
      onSessionEstablished(simulatedSessionId, 'contraparte_ona_pq');
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        {/* Encabezado con glifo Selk'nam */}
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <span style={styles.glyph}>◈</span>
            <h2 style={styles.title}>{t.inviteTitle}</h2>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ×
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab('generate')}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'generate' ? `2px solid ${colors.ochreFuego}` : 'none',
              color: activeTab === 'generate' ? colors.ochreFuego : colors.textMuted,
            }}
          >
            {t.tabGenerate}
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'scan' ? `2px solid ${colors.glacierCyan}` : 'none',
              color: activeTab === 'scan' ? colors.glacierCyan : colors.textMuted,
            }}
          >
            {t.tabScan}
          </button>
        </div>

        {/* Contenido de la Pestaña */}
        <div style={styles.body}>
          {activeTab === 'generate' ? (
            <div style={styles.tabContent}>
              <p style={styles.explanationText}>{t.genExplanation}</p>

              {qrPayload ? (
                <div style={styles.qrContainer}>
                  <div style={styles.qrMockFrame}>
                    <div style={styles.qrCenterIcon}>▲ ◈ ▼</div>
                    <div style={styles.qrBadge}>Red Ona / Kawésqar</div>
                  </div>
                  <div style={styles.pointerMeta}>
                    <span style={styles.pointerLabel}>Puntero Ligero (124 Bytes):</span>
                    <code style={styles.pointerCode}>{qrPayload.substring(0, 56)}...</code>
                  </div>
                </div>
              ) : (
                <div style={styles.emptyActionBox}>
                  <button
                    onClick={handleGenerateInvite}
                    disabled={isGenerating}
                    style={styles.actionBtnPrimary}
                  >
                    {isGenerating ? 'Generando en Red Ona...' : t.btnGeneratePointer}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.tabContent}>
              <p style={styles.explanationText}>{t.scanExplanation}</p>
              <div style={styles.scannerMockBox}>
                <div style={styles.scannerTarget}>
                  <span style={styles.scannerCornerTL}>┏</span>
                  <span style={styles.scannerCornerTR}>┓</span>
                  <span style={styles.scannerCornerBL}>┗</span>
                  <span style={styles.scannerCornerBR}>┛</span>
                  <div style={styles.scannerLine} />
                </div>
              </div>

              <button
                onClick={handleScanMock}
                disabled={isDownloadingBundle}
                style={styles.actionBtnSecondary}
              >
                {isDownloadingBundle ? t.downloadingBundle : t.btnSimulateScan}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 10, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000,
    backdropFilter: 'blur(6px)',
  },
  modalCard: {
    backgroundColor: CULTURAL_THEME.colors.bgSecondary,
    border: `1px solid ${CULTURAL_THEME.colors.borderOchre}`,
    borderRadius: '18px',
    width: '100%',
    maxWidth: '400px',
    overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  glyph: {
    color: CULTURAL_THEME.colors.ochreFuego,
    fontSize: '14px',
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: CULTURAL_THEME.colors.textPrimary,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: CULTURAL_THEME.colors.textMuted,
    fontSize: '22px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  tabBar: {
    display: 'flex',
    borderBottom: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
  },
  tabBtn: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  body: {
    padding: '20px',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  explanationText: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '1.5',
    color: CULTURAL_THEME.colors.textSecondary,
  },
  emptyActionBox: {
    padding: '16px 0',
  },
  actionBtnPrimary: {
    width: '100%',
    padding: '12px',
    backgroundColor: CULTURAL_THEME.colors.ochreFuego,
    color: '#0C0E14',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: `0 4px 14px rgba(198, 125, 52, 0.35)`,
  },
  actionBtnSecondary: {
    width: '100%',
    padding: '12px',
    backgroundColor: CULTURAL_THEME.colors.glacierCyan,
    color: '#0C0E14',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: `0 4px 14px rgba(72, 169, 184, 0.35)`,
  },
  qrContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  qrMockFrame: {
    width: '180px',
    height: '180px',
    backgroundColor: '#0C0E14',
    border: `2px dashed ${CULTURAL_THEME.colors.ochreFuego}`,
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  qrCenterIcon: {
    color: CULTURAL_THEME.colors.ochreFuego,
    fontSize: '20px',
    letterSpacing: '4px',
  },
  qrBadge: {
    fontSize: '10px',
    color: CULTURAL_THEME.colors.patagoniaSlate,
    fontWeight: 600,
  },
  pointerMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '100%',
  },
  pointerLabel: {
    fontSize: '10px',
    color: CULTURAL_THEME.colors.textMuted,
  },
  pointerCode: {
    fontSize: '10px',
    backgroundColor: CULTURAL_THEME.colors.bgElevated,
    padding: '6px 8px',
    borderRadius: '6px',
    color: CULTURAL_THEME.colors.ochreFuego,
    wordBreak: 'break-all',
  },
  scannerMockBox: {
    height: '160px',
    backgroundColor: '#0C0E14',
    borderRadius: '12px',
    border: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scannerTarget: {
    width: '110px',
    height: '110px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerCornerTL: { position: 'absolute', top: 0, left: 0, color: CULTURAL_THEME.colors.glacierCyan, fontSize: '18px' },
  scannerCornerTR: { position: 'absolute', top: 0, right: 0, color: CULTURAL_THEME.colors.glacierCyan, fontSize: '18px' },
  scannerCornerBL: { position: 'absolute', bottom: 0, left: 0, color: CULTURAL_THEME.colors.glacierCyan, fontSize: '18px' },
  scannerCornerBR: { position: 'absolute', bottom: 0, right: 0, color: CULTURAL_THEME.colors.glacierCyan, fontSize: '18px' },
  scannerLine: {
    width: '90%',
    height: '2px',
    backgroundColor: CULTURAL_THEME.colors.glacierCyan,
    boxShadow: `0 0 8px ${CULTURAL_THEME.colors.glacierCyan}`,
  },
};
