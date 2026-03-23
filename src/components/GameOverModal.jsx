/**
 * GameOverModal — Shows when party is defeated.
 * Offers options to revive and retry or leave the campaign.
 */
import useStore from '../store/useStore'

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, fontFamily: "'Cinzel', serif",
  },
  modal: {
    background: '#0a0805', border: '2px solid #8b3a3a',
    width: 'min(600px, 90vw)', padding: '40px',
    textAlign: 'center', boxShadow: '0 0 40px rgba(0,0,0,0.9)',
    borderRadius: 4,
  },
  title: {
    fontSize: 48, color: '#cc3333', fontWeight: 700,
    marginBottom: 16, textShadow: '0 2px 8px rgba(0,0,0,0.8)',
  },
  subtitle: {
    fontSize: 18, color: '#a89070', marginBottom: 24,
  },
  message: {
    fontSize: 14, color: '#d0c8b8', lineHeight: 1.6,
    marginBottom: 32, opacity: 0.9,
  },
  buttonGroup: {
    display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
  },
  button: {
    padding: '12px 28px', fontSize: 14, fontFamily: "'Cinzel', serif",
    fontWeight: 700, letterSpacing: 1, borderRadius: 2,
    cursor: 'pointer', border: '1px solid',
    transition: 'all 0.2s',
  },
  reviveBtn: {
    background: '#2a1f0e', color: '#d4af37',
    borderColor: '#d4af37',
  },
  leaveBtn: {
    background: '#1a1520', color: '#a89070',
    borderColor: '#4a3e2a',
  },
}

export default function GameOverModal({ onRevive, onLeave }) {
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.title}>💀 DEFEAT 💀</div>
        <div style={S.subtitle}>The party has fallen in combat</div>

        <div style={S.message}>
          All members of your party have been defeated. The world falls silent...
          <br/>
          <br/>
          But fate may yet grant you a second chance.
        </div>

        <div style={S.buttonGroup}>
          <button
            style={{ ...S.button, ...S.reviveBtn }}
            onMouseEnter={e => e.target.style.opacity = '0.8'}
            onMouseLeave={e => e.target.style.opacity = '1'}
            onClick={onRevive}
          >
            Resurrect Party
          </button>
          <button
            style={{ ...S.button, ...S.leaveBtn }}
            onMouseEnter={e => e.target.style.opacity = '0.8'}
            onMouseLeave={e => e.target.style.opacity = '1'}
            onClick={onLeave}
          >
            Leave Campaign
          </button>
        </div>
      </div>
    </div>
  )
}
