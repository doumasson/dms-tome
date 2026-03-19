import useStore from '../store/useStore'

export default function CombatActionBar({ onEndTurn }) {
  const encounter = useStore(s => s.encounter)
  const { combatants, currentTurn } = encounter
  const active = combatants?.[currentTurn]

  const actionsLeft = active ? !active.actionsUsed : true
  const bonusLeft = active ? !active.bonusActionsUsed : false
  const moveLeft = active?.remainingMove ?? 30

  return (
    <div className="hud-combat-bar">
      {/* Primary actions */}
      <div className="hud-combat-primary">
        <button className="hud-combat-btn attack" disabled={!actionsLeft}>
          <span style={{ fontSize: 13 }}>⚔</span> ATTACK
        </button>
        <button className="hud-combat-btn cast" disabled={!actionsLeft}>
          <span style={{ fontSize: 13 }}>✨</span> CAST
        </button>
        <button className="hud-combat-btn move" disabled={moveLeft <= 0}>
          <span style={{ fontSize: 13 }}>🏃</span> MOVE
        </button>
      </div>
      {/* Secondary actions + economy */}
      <div className="hud-combat-secondary">
        <button className="hud-combat-btn-sm">DODGE</button>
        <button className="hud-combat-btn-sm">DASH</button>
        <button className="hud-combat-btn-sm">HIDE</button>
        <button className="hud-combat-btn-sm">SAY</button>
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
