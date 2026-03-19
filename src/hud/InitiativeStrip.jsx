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
    <div className="hud-initiative">
      <span className="hud-init-round">R{round || 1}</span>
      {combatants.map((c, i) => {
        const isActive = i === currentTurn
        const isEnemy = c.isEnemy || c.type === 'enemy'
        const color = isEnemy ? '#cc3333' : (CLASS_COLORS[c.class] || '#4499dd')
        return (
          <div
            key={c.id || c.name + i}
            className={`hud-init-token ${isActive ? 'active' : ''}`}
            style={{
              background: `${color}22`,
              border: `2px solid ${isActive ? color : color + '66'}`,
              width: isActive ? 32 : 26,
              height: isActive ? 32 : 26,
            }}
            title={`${c.name} (Init: ${c.initiative || '?'})`}
          >
            {isEnemy ? '👹' : '⚔'}
          </div>
        )
      })}
    </div>
  )
}
