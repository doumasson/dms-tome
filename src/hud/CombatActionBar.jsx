import useStore from '../store/useStore'

export default function CombatActionBar({ onEndTurn, onAction }) {
  const encounter = useStore(s => s.encounter)
  const useAction = useStore(s => s.useAction)
  const dashAction = useStore(s => s.dashAction)
  const { combatants, currentTurn } = encounter
  const active = combatants?.[currentTurn]

  const actionsLeft = active ? !active.actionsUsed : true
  const bonusLeft = active ? !active.bonusActionsUsed : false
  const moveLeft = active?.remainingMove ?? 30

  const conditions = new Set(active?.conditions || [])
  const canAct = !conditions.has('Stunned') && !conditions.has('Paralyzed')
    && !conditions.has('Incapacitated') && !conditions.has('Unconscious')
  const canAttack = canAct && !conditions.has('Charmed')
  const canMove = !conditions.has('Stunned') && !conditions.has('Paralyzed')
    && !conditions.has('Grappled') && !conditions.has('Restrained')
    && !conditions.has('Unconscious')
  const isProne = conditions.has('Prone')

  function handleAction(type) {
    if (type === 'dash') {
      dashAction()
      return
    }
    if (type === 'dodge') {
      useAction()
      // Dodge gives disadvantage on attacks against you until next turn
      // For now just consume the action
      return
    }
    onAction?.(type)
  }

  return (
    <div className="hud-combat-bar">
      {/* Primary actions */}
      <div className="hud-combat-primary">
        <button
          className="hud-combat-btn attack"
          disabled={!canAttack || !actionsLeft}
          style={{ opacity: (!canAttack || !actionsLeft) ? 0.4 : 1 }}
          onClick={() => handleAction('attack')}
        >
          <span style={{ fontSize: 13 }}>⚔</span> ATTACK
        </button>
        <button
          className="hud-combat-btn cast"
          disabled={!canAct || !actionsLeft}
          style={{ opacity: (!canAct || !actionsLeft) ? 0.4 : 1 }}
          onClick={() => handleAction('cast')}
        >
          <span style={{ fontSize: 13 }}>✨</span> CAST
        </button>
        <button
          className="hud-combat-btn move"
          disabled={!canMove || moveLeft <= 0}
          style={{ opacity: (!canMove || moveLeft <= 0) ? 0.4 : 1 }}
          onClick={() => handleAction('move')}
        >
          <span style={{ fontSize: 13 }}>🏃</span> MOVE
        </button>
      </div>
      {/* Secondary actions + economy */}
      <div className="hud-combat-secondary">
        <button
          className="hud-combat-btn-sm"
          disabled={!canAct || !actionsLeft}
          style={{ opacity: (!canAct || !actionsLeft) ? 0.4 : 1 }}
          onClick={() => handleAction('dodge')}
        >DODGE</button>
        <button
          className="hud-combat-btn-sm"
          disabled={!canMove || !actionsLeft}
          style={{ opacity: (!canMove || !actionsLeft) ? 0.4 : 1 }}
          onClick={() => handleAction('dash')}
        >DASH</button>
        <button
          className="hud-combat-btn-sm"
          disabled={!canAct || !actionsLeft}
          style={{ opacity: (!canAct || !actionsLeft) ? 0.4 : 1 }}
          onClick={() => handleAction('hide')}
        >HIDE</button>
        <button className="hud-combat-btn-sm" onClick={() => handleAction('say')}>SAY</button>
        {isProne && (
          <button
            className="hud-combat-btn-sm"
            disabled={!actionsLeft}
            style={{ opacity: !actionsLeft ? 0.4 : 1, borderColor: '#cc8822', color: '#cc8822' }}
            onClick={() => handleAction('standup')}
          >STAND UP</button>
        )}
        <div className="hud-economy">
          <div className="hud-economy-dot">
            <div style={{ width: 6, height: 6, background: actionsLeft ? '#4499dd' : '#332a1e' }} />
            <span>ACT</span>
          </div>
          <div className="hud-economy-dot">
            <div style={{ width: 6, height: 6, background: bonusLeft ? '#cc8822' : '#332a1e' }} />
            <span>BNS</span>
          </div>
          <div className="hud-economy-dot">
            <div style={{ width: 6, height: 6, background: moveLeft > 0 ? '#44aa66' : '#332a1e' }} />
            <span>{moveLeft}ft</span>
          </div>
        </div>
      </div>
      {/* Active condition badges */}
      {conditions.size > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {[...conditions].map(c => (
            <span key={c} style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 3,
              background: 'rgba(200,50,50,0.3)', border: '1px solid #cc3333',
              color: '#ff6666',
            }}>{c}</span>
          ))}
        </div>
      )}
      {/* End turn */}
      <button className="hud-end-turn" onClick={onEndTurn}>END TURN</button>
    </div>
  )
}
