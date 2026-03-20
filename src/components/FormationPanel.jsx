import { useState } from 'react'
import useStore from '../store/useStore'

export default function FormationPanel({ onClose }) {
  const partyMembers = useStore(s => s.partyMembers)
  const myCharacter = useStore(s => s.myCharacter)
  const formation = useStore(s => s.formation)
  const setFormation = useStore(s => s.setFormation)

  // Build a combined party list: myCharacter + other party members
  const allMembers = (() => {
    const members = []
    if (myCharacter) members.push(myCharacter)
    ;(partyMembers || []).forEach(m => {
      if (!members.find(x => x.id === m.id)) members.push(m)
    })
    return members
  })()

  // Local state: back array = members not in front
  const [front, setFront] = useState(() => {
    const saved = formation?.front || []
    return saved.length > 0 ? saved : []
  })

  const inFront = (id) => front.includes(id)

  const toggleMember = (id) => {
    setFront(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = () => {
    const back = allMembers.map(m => m.id).filter(id => !front.includes(id))
    setFormation({ front, back })
    onClose()
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>

        <div style={styles.header}>
          <div style={styles.title}>FORMATION</div>
          <div style={styles.subtitle}>Set marching order — who leads the charge</div>
        </div>

        <div style={styles.columns}>
          <div style={styles.column}>
            <div style={styles.columnLabel}>Front Line</div>
            <div style={styles.columnDesc}>Fighters, Barbarians, Paladins</div>
            {allMembers.filter(m => inFront(m.id)).map(m => (
              <MemberCard key={m.id} member={m} position="front" onToggle={() => toggleMember(m.id)} />
            ))}
            {allMembers.filter(m => inFront(m.id)).length === 0 && (
              <div style={styles.emptySlot}>No one assigned</div>
            )}
          </div>

          <div style={styles.divider} />

          <div style={styles.column}>
            <div style={styles.columnLabel}>Back Line</div>
            <div style={styles.columnDesc}>Rangers, Wizards, Clerics</div>
            {allMembers.filter(m => !inFront(m.id)).map(m => (
              <MemberCard key={m.id} member={m} position="back" onToggle={() => toggleMember(m.id)} />
            ))}
            {allMembers.filter(m => !inFront(m.id)).length === 0 && (
              <div style={styles.emptySlot}>No one assigned</div>
            )}
          </div>
        </div>

        {allMembers.length === 0 && (
          <p style={styles.noParty}>No party members found. Start a campaign and join with characters.</p>
        )}

        <div style={styles.hint}>Click a member to move them between lines</div>

        <button style={styles.saveBtn} onClick={handleSave}>Save Formation</button>
      </div>
    </div>
  )
}

function MemberCard({ member, position, onToggle }) {
  const [hovered, setHovered] = useState(false)
  const isFront = position === 'front'

  return (
    <div
      style={{ ...styles.card, ...(hovered ? styles.cardHover : {}), borderColor: isFront ? '#c9a84c' : '#4a3a28' }}
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardAvatar}>
        {(member.name || '?')[0].toUpperCase()}
      </div>
      <div style={styles.cardInfo}>
        <div style={styles.cardName}>{member.name || 'Unknown'}</div>
        <div style={styles.cardSub}>{member.class || ''}{member.level ? ` · Lv ${member.level}` : ''}</div>
      </div>
      <div style={{ ...styles.cardArrow, opacity: hovered ? 1 : 0.4 }}>
        {isFront ? '→' : '←'}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    position: 'relative',
    width: 520, maxWidth: '95vw',
    background: 'linear-gradient(180deg, #1a1208 0%, #120e06 60%, #1a1208 100%)',
    border: '2px solid #c9a84c',
    boxShadow: '0 0 40px rgba(201,168,76,0.15), 0 16px 64px rgba(0,0,0,0.9)',
    padding: '28px 24px 24px',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 14,
    background: 'transparent', border: 'none',
    color: '#6a5a40', cursor: 'pointer', fontSize: 14, padding: 4,
  },
  header: { textAlign: 'center' },
  title: {
    fontFamily: "'Cinzel Decorative', serif",
    fontSize: 20, color: '#c9a84c',
    letterSpacing: 6, fontWeight: 700,
  },
  subtitle: {
    fontSize: 11, color: '#6a5a40',
    fontStyle: 'italic', marginTop: 4,
  },
  columns: {
    display: 'flex', gap: 0, alignItems: 'flex-start',
  },
  column: { flex: 1, display: 'flex', flexDirection: 'column', gap: 8 },
  divider: {
    width: 1, background: 'rgba(201,168,76,0.25)',
    alignSelf: 'stretch', margin: '0 16px',
  },
  columnLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: 12, color: '#c9a84c',
    fontWeight: 700, letterSpacing: 2,
    textTransform: 'uppercase',
    paddingBottom: 4,
    borderBottom: '1px solid rgba(201,168,76,0.2)',
    marginBottom: 4,
  },
  columnDesc: {
    fontSize: 10, color: '#6a5040',
    fontStyle: 'italic', marginBottom: 6,
  },
  emptySlot: {
    fontSize: 11, color: '#4a3a28',
    fontStyle: 'italic', textAlign: 'center',
    padding: '12px 0',
    border: '1px dashed rgba(74,58,40,0.4)',
  },
  card: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(201,168,76,0.05)',
    border: '1px solid',
    padding: '8px 10px',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  },
  cardHover: { background: 'rgba(201,168,76,0.12)' },
  cardAvatar: {
    width: 32, height: 32,
    background: 'rgba(201,168,76,0.15)',
    border: '1px solid rgba(201,168,76,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Cinzel', serif",
    fontSize: 14, color: '#c9a84c',
    flexShrink: 0,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: {
    fontFamily: "'Cinzel', serif",
    fontSize: 12, color: '#d4c090',
    fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  cardSub: { fontSize: 10, color: '#7a6a50' },
  cardArrow: { fontSize: 14, color: '#c9a84c', flexShrink: 0 },
  hint: {
    fontSize: 10, color: '#4a3a28',
    fontStyle: 'italic', textAlign: 'center',
  },
  noParty: {
    fontSize: 12, color: '#6a5a40',
    fontStyle: 'italic', textAlign: 'center',
    margin: 0,
  },
  saveBtn: {
    background: 'linear-gradient(180deg, #2a1e08 0%, #1a1208 100%)',
    border: '1px solid #c9a84c',
    color: '#c9a84c',
    fontFamily: "'Cinzel', serif",
    fontSize: 13, fontWeight: 700,
    letterSpacing: 2, textTransform: 'uppercase',
    padding: '10px 0', cursor: 'pointer',
    transition: 'background 0.15s',
    width: '100%',
  },
}
