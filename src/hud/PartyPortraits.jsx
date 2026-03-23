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

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]

function getXpRatio(xp, level) {
  const curr = XP_THRESHOLDS[Math.min(level - 1, 19)] || 0
  const next = XP_THRESHOLDS[Math.min(level, 19)] || 355000
  if (next <= curr) return 1
  return Math.min(1, Math.max(0, (xp - curr) / (next - curr)))
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

  // Separate player from party members
  const me = allMembers.find(m => m.isMe)
  const others = allMembers.filter(m => !m.isMe).slice(0, 5)

  function renderPortrait(member, i, size) {
    const isSmall = size === 'small'
    const w = isSmall ? 44 : 80
    const h = isSmall ? 55 : 100
    const color = CLASS_COLORS[member.class] || '#888'
    let hp = member.hp ?? member.currentHp ?? member.maxHp ?? 10
    let maxHp = member.maxHp ?? 10

    // During combat, override with live combatant HP
    if (isInCombat && encounter?.combatants) {
      const combatant = encounter.combatants.find(c => c.id === member.id || c.name === member.name)
      if (combatant) {
        hp = combatant.currentHp ?? hp
        maxHp = combatant.maxHp ?? maxHp
      }
    }

    const hpRatio = maxHp > 0 ? hp / maxHp : 1
    const isActive = member.isMe
    const isSelected = isActive || (activeCombatantId && member.id === activeCombatantId)
    const hpTintClass = getHpTintClass(hpRatio)
    const statsTooltip = `HP: ${hp}/${maxHp} • AC: ${member.ac || 10}`

    return (
      <div key={member.name || i} style={{ position: 'relative', cursor: 'pointer' }}
        onClick={() => { playStoneClick(); onPortraitClick?.(member) }}
        title={statsTooltip}>
        {/* Stone frame wrapper — image asset */}
        <div className={`portrait-frame${isSelected ? ' selected' : ''}`}
          style={{ width: w, height: h }}>
          <img src="/ui/portrait-frame.png" className="portrait-frame-img" alt="" draggable={false} />
          {/* Portrait image (if available) */}
          {member.portrait && (
            <img src={member.portrait} alt={member.name}
              style={{ position: 'absolute', inset: 6, width: 'calc(100% - 12px)', height: 'calc(100% - 12px)', objectFit: 'cover', imageRendering: 'crisp-edges', zIndex: 3 }} />
          )}
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
          <div style={{ position: 'absolute', bottom: 3, left: 0, right: 0, height: isSmall ? 3 : 4, background: '#0a0004' }}>
            <div style={{ width: `${hpRatio * 100}%`, height: '100%', background: getHpColor(hpRatio) }} />
          </div>
          {/* XP bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#0a0004' }}>
            <div style={{ width: `${getXpRatio(member.xp || 0, member.level || 1) * 100}%`, height: '100%', background: '#c9a84c' }} />
          </div>
          {/* Level badge */}
          <div style={{
            position: 'absolute', top: 2, right: 3,
            background: 'rgba(8,6,12,0.9)', padding: '1px 4px',
            fontSize: isSmall ? 7 : 8, color, fontWeight: 'bold', fontFamily: "'Cinzel', serif",
            zIndex: 1,
          }}>
            {member.level || 1}
          </div>
        </div>
        {/* Name */}
        <div style={{
          position: 'absolute', bottom: isSmall ? -14 : -18, left: '50%', transform: 'translateX(-50%)',
          fontSize: isSmall ? 7 : 8, color: isSelected ? '#eedd88' : '#a09068',
          whiteSpace: 'nowrap', fontFamily: isSelected ? "'Cinzel Decorative', serif" : "'Cinzel', serif",
          fontWeight: isSelected ? 700 : 400, letterSpacing: 1,
        }}>
          {(member.name || 'Hero').toUpperCase()}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, flexShrink: 0, alignSelf: 'center' }}>
      {/* Other party members stacked vertically above */}
      {others.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {others.map((member, i) => renderPortrait(member, i, 'small'))}
        </div>
      )}
      {/* Player's own portrait — bigger, at bottom */}
      {me && renderPortrait(me, 'me', 'big')}
    </div>
  )
}
