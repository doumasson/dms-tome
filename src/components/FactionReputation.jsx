import useStore from '../store/useStore'
import { getDisposition } from '../lib/factionSystem'

/**
 * Display faction reputation standings in a compact panel.
 * Shows all factions and player's reputation with each.
 * Color-coded by reputation level (red = hostile, green = friendly, gold = revered).
 */
export default function FactionReputation({ onClose }) {
  const factions = useStore(s => s.factions)
  const factionReputation = useStore(s => s.factionReputation)

  if (!factions || factions.length === 0) {
    return (
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Factions</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.content}>
          <p style={styles.noFactions}>No factions in this campaign.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.modal}>
      <div style={styles.header}>
        <h2 style={styles.title}>Factions</h2>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>
      <div style={styles.content}>
        {factions.map(faction => {
          const rep = factionReputation[faction.id] ?? 0
          const disposition = getDisposition(rep)
          const repColor = getReputationColor(rep)
          const barWidth = ((rep + 100) / 200) * 100 // Normalize -100..+100 to 0..100

          return (
            <div key={faction.id} style={styles.factionCard}>
              <div style={styles.factionHeader}>
                <div>
                  <div style={styles.factionName}>{faction.name}</div>
                  <div style={styles.factionDesc}>{faction.description}</div>
                </div>
                <div style={{ ...styles.disposition, color: repColor }}>
                  {disposition}
                </div>
              </div>

              {/* Reputation bar */}
              <div style={styles.repBarContainer}>
                <div style={styles.repBar}>
                  <div
                    style={{
                      ...styles.repBarFill,
                      width: `${barWidth}%`,
                      background: repColor,
                    }}
                  />
                </div>
                <div style={styles.repValue}>{rep > 0 ? '+' : ''}{rep}</div>
              </div>

              {/* Reputation breakdown */}
              <div style={styles.breakdown}>
                <span style={styles.breakdownLabel}>Hostile</span>
                <span style={styles.breakdownLabel}>Neutral</span>
                <span style={styles.breakdownLabel}>Revered</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getReputationColor(rep) {
  if (rep <= -75) return '#ff4444'      // Hostile
  if (rep <= -25) return '#ff8844'      // Unfriendly
  if (rep <= 25) return '#cccccc'       // Neutral
  if (rep <= 75) return '#66dd66'       // Friendly
  return '#d4af37'                      // Revered (gold)
}

const styles = {
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(20, 12, 12, 0.98)',
    border: '2px solid var(--gold)',
    borderRadius: 8,
    padding: 0,
    maxWidth: 500,
    maxHeight: '80vh',
    overflow: 'auto',
    zIndex: 200,
    fontFamily: "'Cinzel', Georgia, serif",
    boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
    background: 'rgba(212, 175, 55, 0.05)',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#d4af37',
    letterSpacing: '0.05em',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#d4af37',
    fontSize: 20,
    cursor: 'pointer',
    padding: 0,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  noFactions: {
    color: '#8a7a52',
    fontSize: 12,
    textAlign: 'center',
    padding: 16,
  },
  factionCard: {
    background: 'rgba(100, 80, 40, 0.15)',
    border: '1px solid rgba(212, 175, 55, 0.2)',
    borderRadius: 6,
    padding: 12,
    gap: 8,
  },
  factionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  factionName: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.03em',
  },
  factionDesc: {
    color: '#8a7a52',
    fontSize: 11,
    marginTop: 4,
    maxWidth: 280,
  },
  disposition: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'right',
    textShadow: '0 0 8px rgba(0,0,0,0.8)',
    minWidth: 80,
  },
  repBarContainer: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
  },
  repBar: {
    flex: 1,
    height: 12,
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(212, 175, 55, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  repBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  repValue: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: 700,
    minWidth: 40,
    textAlign: 'right',
  },
  breakdown: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#666',
    paddingTop: 4,
    borderTop: '1px solid rgba(212, 175, 55, 0.1)',
  },
  breakdownLabel: {
    flex: 1,
    textAlign: 'center',
  },
}
