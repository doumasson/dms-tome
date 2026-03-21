import useStore from '../store/useStore'
import { getClassCombatActions } from '../lib/classCombatActions'
import { getClassResources } from '../lib/classResources'
import ClassResourceBar from './ClassResourceBar'

export default function CombatActionBar({ onEndTurn, onAction }) {
  const encounter = useStore(s => s.encounter)
  const myCharacter = useStore(s => s.myCharacter)
  const useAction = useStore(s => s.useAction)
  const dashAction = useStore(s => s.dashAction)
  const { combatants, currentTurn } = encounter
  const active = combatants?.[currentTurn]

  // Check if the active combatant is the current player
  const isMyTurn = active && active.type === 'player' && active.id === myCharacter?.id

  // If it's not the player's turn, show a waiting message
  if (!isMyTurn) {
    return (
      <div className="hud-combat-bar">
        <div style={{ textAlign: 'center', color: '#8a7a52', fontSize: 12, fontStyle: 'italic', padding: '12px 0' }}>
          Waiting for {active?.name || 'next combatant'}'s turn...
        </div>
      </div>
    )
  }

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

  const isDead = active && (active.currentHp ?? 0) <= 0
  const isDying = isDead && (active.deathSaves?.failures ?? 0) < 3

  // Dead players can only do death saves — block all other actions
  if (isDead && !isDying) {
    return (
      <div className="hud-combat-bar">
        <div style={{ textAlign: 'center', color: '#cc3333', fontSize: 12, fontWeight: 700, padding: '12px 0' }}>
          ☠ DEAD
        </div>
        <button className="hud-end-turn" onClick={onEndTurn}>END TURN</button>
      </div>
    )
  }

  function handleAction(type, payload) {
    if (type === 'dash') {
      dashAction()
      return
    }
    if (type === 'dodge') {
      useAction()
      return
    }
    onAction?.(type, payload)
  }

  if (isDying) {
    return (
      <div className="hud-combat-bar">
        <div style={{ textAlign: 'center', color: '#cc3333', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
          ☠ DEATH SAVES
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
          {[0,1,2].map(i => (
            <div key={`s${i}`} style={{ width: 12, height: 12, borderRadius: '50%',
              background: i < (active.deathSaves?.successes || 0) ? '#2ecc71' : '#1a1520',
              border: '1px solid #2ecc71' }} />
          ))}
          <div style={{ width: 8 }} />
          {[0,1,2].map(i => (
            <div key={`f${i}`} style={{ width: 12, height: 12, borderRadius: '50%',
              background: i < (active.deathSaves?.failures || 0) ? '#cc3333' : '#1a1520',
              border: '1px solid #cc3333' }} />
          ))}
        </div>
        <button className="hud-combat-btn" onClick={() => onAction?.('death-save')}
          style={{ background: '#2a0a0a', borderColor: '#cc3333', color: '#cc3333' }}>
          🎲 Roll Death Save
        </button>
        <button className="hud-combat-btn-sm" onClick={() => onAction?.('stabilize')}
          style={{ marginTop: 4 }}>
          ✚ Stabilize
        </button>
        <button className="hud-end-turn" onClick={onEndTurn} style={{ marginTop: 4 }}>END TURN</button>
      </div>
    )
  }

  // Class-specific actions
  const classActions = getClassCombatActions(active.class, active.level || 1)
  const classResources = getClassResources(active.class, active.level || 1, active.stats)

  function isAbilityDisabled(action) {
    if (action.actionType === 'action' && !actionsLeft) return true
    if (action.actionType === 'bonus_action' && active.bonusActionsUsed) return true
    if (action.resourceName) {
      const res = classResources.find(r => r.name === action.resourceName)
      if (res) {
        const used = active.resourcesUsed?.[action.resourceName] || 0
        if (used >= res.max) return true
      }
    }
    return false
  }

  return (
    <div className="hud-combat-bar">
      {/* Class resource bar */}
      <ClassResourceBar combatant={active} />
      {/* Primary actions */}
      <div className="hud-combat-primary">
        <button
          className="hud-combat-btn attack"
          disabled={!canAttack || !actionsLeft}
          style={{ opacity: (!canAttack || !actionsLeft) ? 0.4 : 1 }}
          onClick={() => handleAction('attack-pick')}
        >
          <span style={{ fontSize: 13 }}>⚔</span> ATTACK
        </button>
        {classActions.map(action => {
          const isSpell = action.handler === 'openSpellPicker'
          const disabled = !canAct || isAbilityDisabled(action)
          return (
            <button
              key={action.name}
              className={`hud-combat-btn ${isSpell ? 'cast' : ''}`}
              disabled={disabled}
              style={{ opacity: disabled ? 0.4 : 1 }}
              onClick={() => isSpell
                ? handleAction('spell-pick')
                : handleAction('class-ability', {
                    name: action.name,
                    resourceName: action.resourceName,
                    resourceCost: action.resourceCost,
                  })
              }
            >
              <span style={{ fontSize: 13 }}>{action.icon}</span> {action.name.toUpperCase()}
            </button>
          )
        })}
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
        <button className="hud-combat-btn-sm" disabled={!canMove || !actionsLeft}
          style={{ opacity: (!canMove || !actionsLeft) ? 0.4 : 1 }}
          onClick={() => handleAction('disengage')}>DISENGAGE</button>
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
