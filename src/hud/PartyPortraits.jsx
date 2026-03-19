import useStore from '../store/useStore'
import OrnateFrame from './OrnateFrame'

const CLASS_COLORS = {
  Fighter: '#4499dd', Barbarian: '#cc5544', Paladin: '#eedd44',
  Ranger: '#44aa66', Rogue: '#cc7722', Monk: '#88bbcc',
  Wizard: '#6644cc', Sorcerer: '#aa55bb', Warlock: '#885599',
  Cleric: '#44aa66', Druid: '#558833', Bard: '#cc7799',
}

function getHpColor(ratio) {
  if (ratio > 0.5) return '#228844'
  if (ratio > 0.25) return '#cc7722'
  return '#cc3333'
}

export default function PartyPortraits() {
  const myCharacter = useStore(s => s.myCharacter)
  const partyMembers = useStore(s => s.partyMembers)

  const allMembers = []
  if (myCharacter) allMembers.push({ ...myCharacter, isMe: true })
  if (partyMembers?.length) {
    partyMembers.forEach(m => {
      if (m.name !== myCharacter?.name) allMembers.push(m)
    })
  }

  // If no real data yet, show placeholder
  if (allMembers.length === 0) {
    allMembers.push({ name: 'Hero', class: 'Fighter', level: 1, hp: 10, maxHp: 10, isMe: true })
  }

  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
      {allMembers.slice(0, 6).map((member, i) => {
        const color = CLASS_COLORS[member.class] || '#888'
        const hp = member.hp ?? member.currentHp ?? member.maxHp ?? 10
        const maxHp = member.maxHp ?? 10
        const hpRatio = maxHp > 0 ? hp / maxHp : 1
        const isActive = member.isMe

        return (
          <div key={member.name || i} style={{ position: 'relative' }}>
            <div style={{
              width: 58, height: 72, background: '#08060c', overflow: 'hidden', position: 'relative',
            }}>
              {/* Portrait placeholder */}
              <div style={{
                position: 'absolute', inset: 2,
                background: `linear-gradient(180deg, ${color}33, ${color}11)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
              }}>
                {member.class === 'Fighter' ? '⚔' : member.class === 'Sorcerer' ? '🔥' :
                 member.class === 'Cleric' ? '🛡' : member.class === 'Rogue' ? '🗡' :
                 member.class === 'Wizard' ? '🔮' : '⚔'}
              </div>
              {/* HP bar */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: '#0a0004' }}>
                <div style={{ width: `${hpRatio * 100}%`, height: '100%', background: getHpColor(hpRatio) }} />
              </div>
              {/* Level badge */}
              <div style={{
                position: 'absolute', top: 2, right: 3,
                background: 'rgba(8,6,12,0.9)', padding: '1px 4px',
                fontSize: 8, color, fontWeight: 'bold', fontFamily: "'Cinzel', serif",
              }}>
                {member.level || 1}
              </div>
            </div>
            {/* Ornate frame */}
            <OrnateFrame
              size={isActive ? 18 : 16}
              stroke={isActive ? '#c9a84c' : '#8a7a52'}
              weight={isActive ? 2.5 : 2}
            />
            {/* Name */}
            <div style={{
              position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)',
              fontSize: 8, color: isActive ? '#eedd88' : '#a09068',
              whiteSpace: 'nowrap', fontFamily: isActive ? "'Cinzel Decorative', serif" : "'Cinzel', serif",
              fontWeight: isActive ? 700 : 400, letterSpacing: 1,
            }}>
              {(member.name || 'Hero').toUpperCase()}
            </div>
          </div>
        )
      })}
    </div>
  )
}
