import useStore from '../store/useStore'

const CLASS_COLORS = {
  Fighter: '#4499dd', Barbarian: '#cc5544', Paladin: '#eedd44',
  Ranger: '#44aa66', Rogue: '#cc7722', Monk: '#88bbcc',
  Wizard: '#6644cc', Sorcerer: '#aa55bb', Warlock: '#885599',
  Cleric: '#44aa66', Druid: '#558833', Bard: '#cc7799',
}

export default function InitiativeStrip() {
  const encounter = useStore(s => s.encounter)
  const { combatants, currentTurn, round } = encounter

  if (!combatants?.length) return null

  return (
    <div className="hud-initiative metal-frame">
      <span className="hud-init-round">R{round || 1}</span>
      {combatants.map((c, i) => {
        const isActive = i === currentTurn
        const isEnemy = c.isEnemy || c.type === 'enemy'
        const color = isEnemy ? '#cc3333' : (CLASS_COLORS[c.class] || '#4499dd')
        const isDead = (c.deathSaves?.failures ?? 0) >= 3
        const isDying = !isDead && (c.currentHp ?? 0) <= 0 && (c.deathSaves?.failures ?? 0) < 3
        const statusClass = isDead ? 'dead' : isDying ? 'dying' : ''
        const hpPct = c.currentHp != null && c.maxHp ? Math.max(0, c.currentHp / c.maxHp) : 1
        const initial = (c.name || '?')[0].toUpperCase()
        return (
          <div
            key={c.id || c.name + i}
            className={`hud-init-token ${isActive ? 'active' : ''} ${statusClass}`}
            style={{
              background: `${color}22`,
              border: `2px solid ${isActive ? color : color + '66'}`,
              width: isActive ? 34 : 26,
              height: isActive ? 34 : 26,
              position: 'relative',
              overflow: 'hidden',
            }}
            title={`${c.name} (Init: ${c.initiative || '?'}, HP: ${c.currentHp ?? '?'}/${c.maxHp ?? '?'})${isDying ? ' — DYING' : isDead ? ' — DEAD' : ''}`}
          >
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: isActive ? 13 : 10,
              fontWeight: 700,
              color: isDead ? '#666' : color,
              textShadow: isActive ? `0 0 6px ${color}88` : 'none',
              lineHeight: 1,
              zIndex: 1,
              position: 'relative',
            }}>
              {initial}
            </span>
            {/* HP pip at bottom */}
            {!isDead && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                background: '#1a0000',
              }}>
                <div style={{
                  width: `${hpPct * 100}%`, height: '100%',
                  background: hpPct > 0.5 ? '#44aa44' : hpPct > 0.25 ? '#cc8800' : '#cc2222',
                }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
