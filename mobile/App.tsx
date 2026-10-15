import React, { useState } from 'react';
import { ChatScreen } from './src/screens/ChatScreen';
import { InviteModal } from './src/screens/InviteModal';
import { CULTURAL_THEME, I18N } from './src/theme/cultural';
import { TITAN_SANDBOX_SESSION_ID, TITAN_SANDBOX_PEER_ID, TITAN_SANDBOX_ROOM_NAME } from './src/demo/sandbox_bot';

export const App: React.FC = () => {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  // ET-07: Pre-cargar de forma predeterminada la sala Sandbox para evitar rechazos por pantalla vacía
  const [activeSessionId, setActiveSessionId] = useState<string | null>(TITAN_SANDBOX_SESSION_ID);
  const [activePeerId, setActivePeerId] = useState<string>(TITAN_SANDBOX_PEER_ID);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);

  const t = I18N[lang];
  const { colors, networks } = CULTURAL_THEME;

  const handleSessionEstablished = (sessionId: string, peerId: string) => {
    setActiveSessionId(sessionId);
    setActivePeerId(peerId);
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'es' ? 'en' : 'es'));
  };

  return (
    <div style={styles.appContainer}>
      {activeSessionId ? (
        <ChatScreen
          sessionId={activeSessionId}
          peerEphemeralId={activePeerId}
          lang={lang}
          onBack={() => setActiveSessionId(null)}
          onToggleLang={toggleLanguage}
        />
      ) : (
        <div style={styles.homeContainer}>
          {/* Encabezado con Iconografía Selk'nam */}
          <div style={styles.homeHeader}>
            <div style={styles.topControlRow}>
              <div style={styles.culturalEmblem}>
                <span style={styles.emblemGlyph}>▲</span>
                <span style={styles.emblemCenter}>◈</span>
                <span style={styles.emblemGlyph}>▼</span>
              </div>
              <button onClick={toggleLanguage} style={styles.langToggleBtn}>
                {lang === 'es' ? '🌐 ES | English' : '🌐 EN | Español'}
              </button>
            </div>

            <div style={styles.titleBlock}>
              <h1 style={styles.appTitle}>{t.appTitle}</h1>
              <p style={styles.appSubtitle}>{t.appSubtitle}</p>
            </div>

            {/* Banner de Redes Ancestrales Activas */}
            <div style={styles.networkGrid}>
              {networks.map((net) => (
                <div key={net.id} style={styles.networkBadgeCard}>
                  <div style={styles.badgeTopRow}>
                    <span
                      style={{
                        ...styles.statusDot,
                        backgroundColor: net.badgeColor,
                      }}
                    />
                    <span style={{ ...styles.networkName, color: net.badgeColor }}>
                      {net.indigenousName}
                    </span>
                  </div>
                  <span style={styles.subsystemText}>{net.technicalSubsystem}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Sesiones / Modo Sandbox Pre-cargado */}
          <div style={styles.sessionArea}>
            {/* Tarjeta de Acceso Rápido al Sandbox Bot de Evaluación */}
            <div style={styles.sandboxCard}>
              <div style={styles.sandboxCardHeader}>
                <span style={styles.sandboxPulse}>⚡</span>
                <span style={styles.sandboxCardTitle}>Canal Soberano Aegis — Sandbox de Resiliencia</span>
              </div>
              <p style={styles.sandboxCardDesc}>
                Entorno interactivo pre-cargado para Comités de Grants (OTF, AWS, Aztec, Nym) y Revisores de Tiendas (Guideline 2.1).
              </p>
              <div style={styles.contractIndicator}>
                <span>Aztec L2 Notary:</span>
                <code>0x27f1c99a...109b</code>
              </div>
              <button
                onClick={() => {
                  setActiveSessionId(TITAN_SANDBOX_SESSION_ID);
                  setActivePeerId(TITAN_SANDBOX_PEER_ID);
                }}
                style={styles.enterSandboxBtn}
              >
                Ingresar a Sala de Demostración ➜
              </button>
            </div>
          </div>

          {/* Botón de Nueva Sesión con paleta Tierra del Fuego */}
          <div style={styles.footerAction}>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              style={styles.newChatBtn}
            >
              {t.btnNewSession}
            </button>
          </div>
        </div>
      )}

      <InviteModal
        isOpen={isInviteModalOpen}
        lang={lang}
        onClose={() => setIsInviteModalOpen(false)}
        onSessionEstablished={handleSessionEstablished}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    maxWidth: '480px',
    margin: '0 auto',
    height: '100vh',
    maxHeight: '860px',
    backgroundColor: CULTURAL_THEME.colors.bgPrimary,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
    borderRadius: '20px',
    overflow: 'hidden',
    border: `1px solid ${CULTURAL_THEME.colors.borderOchre}`,
    position: 'relative',
  },
  homeContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '24px 20px',
    boxSizing: 'border-box',
    justifyContent: 'space-between',
    color: CULTURAL_THEME.colors.textPrimary,
    backgroundImage: `radial-gradient(circle at 50% 0%, rgba(198, 125, 52, 0.12) 0%, transparent 60%)`,
  },
  homeHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  topControlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  culturalEmblem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: CULTURAL_THEME.colors.ochreFuego,
    fontSize: '13px',
    letterSpacing: '2px',
    fontWeight: 700,
  },
  emblemGlyph: {
    opacity: 0.7,
  },
  emblemCenter: {
    color: CULTURAL_THEME.colors.clayRed,
    fontSize: '15px',
  },
  langToggleBtn: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: CULTURAL_THEME.colors.textSecondary,
    border: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
    borderRadius: '12px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  titleBlock: {
    textAlign: 'center',
  },
  appTitle: {
    margin: '0',
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
    background: `linear-gradient(135deg, ${CULTURAL_THEME.colors.ochreFuego} 0%, ${CULTURAL_THEME.colors.desertGold} 50%, ${CULTURAL_THEME.colors.glacierIce} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  appSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: CULTURAL_THEME.colors.patagoniaSlate,
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  networkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginTop: '6px',
  },
  networkBadgeCard: {
    backgroundColor: CULTURAL_THEME.colors.bgSecondary,
    border: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  badgeTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    boxShadow: '0 0 6px currentColor',
  },
  networkName: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.3px',
  },
  subsystemText: {
    fontSize: '10px',
    color: CULTURAL_THEME.colors.textMuted,
    lineHeight: '1.2',
  },
  sessionArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 0',
  },
  emptyCard: {
    backgroundColor: CULTURAL_THEME.colors.bgSecondary,
    border: `1px solid ${CULTURAL_THEME.colors.borderOchre}`,
    borderRadius: '16px',
    padding: '24px 20px',
    textAlign: 'center',
    maxWidth: '360px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  ceremonialLines: {
    color: CULTURAL_THEME.colors.ochreFuego,
    fontSize: '12px',
    letterSpacing: '4px',
    marginBottom: '12px',
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: '15px',
    fontWeight: 700,
    margin: '0 0 8px 0',
    color: CULTURAL_THEME.colors.textPrimary,
  },
  emptyDescription: {
    fontSize: '12px',
    lineHeight: '1.5',
    color: CULTURAL_THEME.colors.textSecondary,
    margin: '0 0 16px 0',
  },
  contractIndicator: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '10px',
    color: CULTURAL_THEME.colors.textMuted,
    backgroundColor: CULTURAL_THEME.colors.bgElevated,
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${CULTURAL_THEME.colors.borderSubtle}`,
  },
  footerAction: {
    paddingTop: '12px',
  },
  newChatBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: CULTURAL_THEME.colors.ochreFuego,
    color: '#0C0E14',
    border: 'none',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    cursor: 'pointer',
    boxShadow: `0 4px 18px rgba(198, 125, 52, 0.35)`,
    transition: 'all 0.2s ease',
  },
  sandboxCard: {
    backgroundColor: '#1E293B',
    border: '1px solid #38BDF8',
    borderRadius: '16px',
    padding: '20px 18px',
    textAlign: 'left',
    maxWidth: '380px',
    width: '100%',
    boxShadow: '0 8px 30px rgba(56, 189, 248, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sandboxCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sandboxPulse: {
    fontSize: '18px',
  },
  sandboxCardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#F8FAFC',
  },
  sandboxCardDesc: {
    fontSize: '11px',
    lineHeight: '1.45',
    color: '#94A3B8',
    margin: 0,
  },
  enterSandboxBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '4px',
    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
  },
};
