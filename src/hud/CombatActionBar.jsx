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
        <button className="hud-combat-btn attack" disabled={!actionsLeft} onClick={() => handleAction('attack')}>
          <span style={{ fontSize: 13 }}>⚔</span> ATTACK
        </button>
        <button className="hud-combat-btn cast" disabled={!actionsLeft} onClick={() => handleAction('cast')}>
          <span style={{ fontSize: 13 }}>✨</span> CAST
        </button>
        <button className="hud-combat-btn move" disabled={moveLeft <= 0} onClick={() => handleAction('move')}>
          <span style={{ fontSize: 13 }}>🏃</span> MOVE
        </button>
      </div>
      {/* Secondary actions + economy */}
      <div className="hud-combat-secondary">
        <button className="hud-combat-btn-sm" onClick={() => handleAction('dodge')}>DODGE</button>
        <button className="hud-combat-btn-sm" onClick={() => handleAction('dash')}>DASH</button>
        <button className="hud-combat-btn-sm" onClick={() => handleAction('hide')}>HIDE</button>
        <button className="hud-combat-btn-sm" onClick={() => handleAction('say')}>SAY</button>
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
      {/* End turn */}
      <button className="hud-end-turn" onClick={onEndTurn}>END TURN</button>
    </div>
  )
}
