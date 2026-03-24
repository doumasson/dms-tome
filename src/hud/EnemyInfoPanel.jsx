import useStore from '../store/useStore'

export default function EnemyInfoPanel() {
  const encounter = useStore(s => s.encounter)
  const { combatants, currentTurn } = encounter

  // Show info for the active enemy, or first living enemy if it's a player's turn
  const active = combatants?.[currentTurn]
  const enemy = active?.isEnemy ? active : combatants?.find(c => c.isEnemy && (c.currentHp ?? c.hp ?? 0) > 0)

  if (!enemy) return null

  const hp = enemy.currentHp ?? enemy.hp ?? 0
  const maxHp = enemy.maxHp ?? 1
  const hpPct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0
  const hpColor = hpPct > 50 ? '#cc3333' : hpPct > 25 ? '#cc6600' : '#880000'
  const conditions = enemy.conditions || []
  const cr = enemy.cr != null ? ` CR ${enemy.cr}` : ''

  return (
    <div className="hud-enemy-info stone-panel">
      <div style={{ fontSize: 10, color: '#cc3333', fontWeight: 700, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
        {enemy.name?.toUpperCase()}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 9, color: '#9a8878', marginTop: 3, fontFamily: 'monospace' }}>
        <div><span style={{ color: hpColor }}>HP</span> {hp}/{maxHp}</div>
        <div><span style={{ color: '#c9a84c' }}>AC</span> {enemy.ac || '?'}</div>
        {cr && <div style={{ color: '#8877aa' }}>{cr}</div>}
      </div>
      <div style={{ marginTop: 4, height: 3, background: '#1a0606', borderRadius: 0 }}>
        <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, transition: 'width 0.3s' }} />
      </div>
      {conditions.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 8, color: '#aa8866', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {conditions.map(c => (
            <span key={c} style={{
              padding: '1px 4px', background: 'rgba(204,51,51,0.15)',
              border: '1px solid rgba(204,51,51,0.3)', borderRadius: 2,
            }}>{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}
