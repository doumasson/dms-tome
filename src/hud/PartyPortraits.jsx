import useStore from '../store/useStore'
import { playStoneClick } from '../lib/uiSounds'

function getConditionClass(condition) {
  const map = {
    Poisoned: 'cond-poison',
    Burning: 'cond-fire',
    Frozen: 'cond-ice', Restrained: 'cond-ice',
    Stunned: 'cond-stun',
    Paralyzed: 'cond-gray',
    Blessed: 'cond-gold', Hasted: 'cond-gold',
    Frightened: 'cond-purple',
    Charmed: 'cond-pink',
    Blinded: 'cond-dark',
    Concentrating: 'cond-blue',
    Invisible: 'cond-white',
  }
  return map[condition] || 'cond-default'
}

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

function getHpTintClass(hpRatio) {
  if (hpRatio <= 0) return 'hp-dead'
  if (hpRatio <= 0.1) return 'hp-critical'
  if (hpRatio <= 0.3) return 'hp-low'
  if (hpRatio <= 0.6) return 'hp-mid'
  if (hpRatio < 1) return 'hp-high'
  return 'hp-full'
}

export default function PartyPortraits({ onPortraitClick, activeCombatantId }) {
  const myCharacter = useStore(s => s.myCharacter)
  const partyMembers = useStore(s => s.partyMembers)
  const encounter = useStore(s => s.encounter)
  const isInCombat = encounter?.phase === 'combat'

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
        const isSelected = isActive || (activeCombatantId && member.id === activeCombatantId)
        const hpTintClass = getHpTintClass(hpRatio)

        return (
          <div key={member.name || i} style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => { playStoneClick(); onPortraitClick?.(member) }}>
            {/* Stone frame wrapper */}
            <div className={`portrait-frame${isSelected ? ' selected' : ''}`}
              style={{ width: 58, height: 72, background: '#08060c' }}>
              {/* Portrait placeholder */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(180deg, ${color}33, ${color}11)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, overflow: 'hidden',
              }}>
                {member.portrait ? (
                  <img src={member.portrait} alt={member.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 22 }}>
                    {member.class === 'Fighter' ? '⚔' : member.class === 'Sorcerer' ? '🔥' :
                     member.class === 'Cleric' ? '🛡' : member.class === 'Rogue' ? '🗡' :
                     member.class === 'Wizard' ? '🔮' : '⚔'}
                  </span>
                )}
              </div>
              {/* HP tinting overlay */}
              <div className={`portrait-hp-tint ${hpTintClass}`} />
              {/* Status effect condition pips */}
              {(() => {
                const combatant = isInCombat && encounter?.combatants?.find(c => c.id === member.id || c.name === member.name)
                const conditions = combatant?.conditions || []
                return isInCombat && conditions.length > 0 ? (
                  <div className="portrait-conditions">
                    {conditions.slice(0, 4).map((cond, j) => (
                      <div key={j}
                        className={`portrait-condition-pip ${getConditionClass(cond)}`}
                        title={cond}
                      />
                    ))}
                  </div>
                ) : null
              })()}
              {/* HP bar */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: '#0a0004' }}>
                <div style={{ width: `${hpRatio * 100}%`, height: '100%', background: getHpColor(hpRatio) }} />
              </div>
              {/* Level badge */}
              <div style={{
                position: 'absolute', top: 2, right: 3,
                background: 'rgba(8,6,12,0.9)', padding: '1px 4px',
                fontSize: 8, color, fontWeight: 'bold', fontFamily: "'Cinzel', serif",
                zIndex: 1,
              }}>
                {member.level || 1}
              </div>
            </div>
            {/* Name */}
            <div style={{
              position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)',
              fontSize: 8, color: isSelected ? '#eedd88' : '#a09068',
              whiteSpace: 'nowrap', fontFamily: isSelected ? "'Cinzel Decorative', serif" : "'Cinzel', serif",
              fontWeight: isSelected ? 700 : 400, letterSpacing: 1,
            }}>
              {(member.name || 'Hero').toUpperCase()}
            </div>
          </div>
        )
      })}
    </div>
  )
}
