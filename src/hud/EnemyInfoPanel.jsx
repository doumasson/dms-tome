import useStore from '../store/useStore'

export default function EnemyInfoPanel() {
  const encounter = useStore(s => s.encounter)
  const { combatants, currentTurn } = encounter

  // Show info for the active enemy, or first enemy if it's a player's turn
  const active = combatants?.[currentTurn]
  const enemy = active?.isEnemy ? active : combatants?.find(c => c.isEnemy && c.hp > 0)

  if (!enemy) return null

  const hpPct = enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0
  const conditions = enemy.conditions || []

  return (
    <div className="hud-enemy-info stone-panel">
      <div style={{ fontSize: 10, color: '#cc3333', fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
        {enemy.name?.toUpperCase()}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 9, color: '#887766', marginTop: 3, fontFamily: 'monospace' }}>
        <div><span style={{ color: '#cc3333' }}>HP</span> {enemy.hp}/{enemy.maxHp}</div>
        <div><span style={{ color: '#c9a84c' }}>AC</span> {enemy.ac}</div>
      </div>
      <div style={{ marginTop: 4, height: 3, background: '#1a0606', borderRadius: 0 }}>
        <div style={{ width: `${hpPct}%`, height: '100%', background: '#cc3333' }} />
      </div>
      {conditions.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 8, color: '#887766' }}>
          {conditions.join(', ')}
        </div>
      )}
    </div>
  )
}
