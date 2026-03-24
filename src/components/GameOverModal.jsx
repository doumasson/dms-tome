/**
 * GameOverModal — Shows when party is defeated.
 * Offers options to revive and retry or leave the campaign.
 */
import useStore from '../store/useStore'

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0, 0, 0, 0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, fontFamily: "'Cinzel', serif",
  },
  modal: {
    background: 'linear-gradient(180deg, #140a04 0%, #0a0805 100%)',
    border: '2px solid #8b3a3a',
    width: 'min(600px, 90vw)', padding: '40px',
    textAlign: 'center',
    boxShadow: '0 0 60px rgba(139,58,58,0.3), 0 8px 40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(200,80,80,0.1)',
    borderRadius: 10,
    position: 'relative',
  },
  title: {
    fontSize: 48, color: '#cc3333', fontWeight: 700,
    marginBottom: 16, textShadow: '0 2px 12px rgba(200,50,50,0.5), 0 0 30px rgba(200,50,50,0.2)',
    letterSpacing: '0.06em',
  },
  subtitle: {
    fontSize: 18, color: '#a89070', marginBottom: 24,
    letterSpacing: '0.04em',
  },
  message: {
    fontSize: 14, color: '#d0c8b8', lineHeight: 1.7,
    marginBottom: 32, opacity: 0.85,
    maxWidth: 420, margin: '0 auto 32px',
  },
  buttonGroup: {
    display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
  },
  button: {
    padding: '14px 32px', fontSize: 14, fontFamily: "'Cinzel', serif",
    fontWeight: 700, letterSpacing: '0.08em', borderRadius: 6,
    cursor: 'pointer', border: '1px solid',
    transition: 'all 0.2s', minHeight: 48,
    textTransform: 'uppercase',
  },
  reviveBtn: {
    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.06))',
    color: '#d4af37',
    borderColor: 'rgba(212,175,55,0.5)',
    boxShadow: '0 0 12px rgba(212,175,55,0.1)',
  },
  leaveBtn: {
    background: 'rgba(255,255,255,0.03)', color: '#a89070',
    borderColor: 'rgba(100,80,50,0.4)',
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
