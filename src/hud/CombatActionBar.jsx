import { useState, useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { getClassCombatActions } from '../lib/classCombatActions'
import { getClassResources } from '../lib/classResources'
import ClassResourceBar from './ClassResourceBar'
import { playStoneClick, playTurnChime } from '../lib/uiSounds'

const TURN_TIMER_SECONDS = 60

export default function CombatActionBar({ onEndTurn, onAction }) {
  const encounter = useStore(s => s.encounter)
  const myCharacter = useStore(s => s.myCharacter)
  const useAction = useStore(s => s.useAction)
  const dashAction = useStore(s => s.dashAction)
  const { combatants, currentTurn, round } = encounter
  const active = combatants?.[currentTurn]

  // Check if the active combatant is the current player
  const isMyTurn = active && active.type === 'player' && active.id === myCharacter?.id

  // --- 60-second turn timer ---
  const [timeLeft, setTimeLeft] = useState(TURN_TIMER_SECONDS)
  const timerRef = useRef(null)
  const endTurnRef = useRef(onEndTurn)
  endTurnRef.current = onEndTurn

  useEffect(() => {
    // Reset timer whenever turn or round changes
    setTimeLeft(TURN_TIMER_SECONDS)
    if (timerRef.current) clearInterval(timerRef.current)
    if (!isMyTurn) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          timerRef.current = null
          // Auto-end turn
          setTimeout(() => endTurnRef.current?.(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentTurn, round, isMyTurn])

  // Play chime when it becomes the player's turn
  useEffect(() => {
    if (isMyTurn) playTurnChime()
  }, [isMyTurn])

  // If it's not the player's turn, show a waiting message
  if (!isMyTurn) {
    return (
      <div className="hud-combat-bar stone-panel">
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
      <div className="hud-combat-bar stone-panel">
        <div style={{ textAlign: 'center', color: '#cc3333', fontSize: 12, fontWeight: 700, padding: '12px 0' }}>
          ☠ DEAD
        </div>
        <button className="medallion-btn danger" onClick={() => { playStoneClick(); onEndTurn() }}>END</button>
      </div>
    )
  }

  function handleAction(type, payload) {
    playStoneClick()
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
    return <DeathSaveUI active={active} onAction={onAction} onEndTurn={onEndTurn} />
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
    <div className="hud-combat-bar stone-panel">
      {/* Class resource bar */}
      <ClassResourceBar combatant={active} />
      {/* Primary actions — circular medallion buttons */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          className={`medallion-btn large attack${(!canAttack || !actionsLeft) ? ' disabled' : ''}`}
          disabled={!canAttack || !actionsLeft}
          onClick={() => handleAction('attack-pick')}
        >
          <span style={{ fontSize: 16 }}>⚔</span>
          <span className="medallion-label">ATTACK</span>
        </button>
        {classActions.map(action => {
          const isSpell = action.handler === 'openSpellPicker'
          const disabled = !canAct || isAbilityDisabled(action)
          return (
            <button
              key={action.name}
              className={`medallion-btn large${isSpell ? ' cast' : ''}${disabled ? ' disabled' : ''}`}
              disabled={disabled}
              onClick={() => isSpell
                ? handleAction('spell-pick')
                : handleAction('class-ability', {
                    name: action.name,
                    resourceName: action.resourceName,
                    resourceCost: action.resourceCost,
                  })
              }
            >
              <span style={{ fontSize: 16 }}>{action.icon}</span>
              <span className="medallion-label">{action.name.toUpperCase()}</span>
            </button>
          )
        })}
        <button
          className={`medallion-btn large move${(!canMove || moveLeft <= 0) ? ' disabled' : ''}`}
          disabled={!canMove || moveLeft <= 0}
          onClick={() => handleAction('move')}
        >
          <span style={{ fontSize: 16 }}>🏃</span>
          <span className="medallion-label">MOVE</span>
        </button>
      </div>
      {/* Secondary actions — small medallions + economy */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
        <button
          className={`medallion-btn small${(!canAct || !actionsLeft) ? ' disabled' : ''}`}
          disabled={!canAct || !actionsLeft}
          onClick={() => handleAction('dodge')}
          title="Dodge"
        >
          <span className="medallion-label">DGE</span>
        </button>
        <button
          className={`medallion-btn small${(!canMove || !actionsLeft) ? ' disabled' : ''}`}
          disabled={!canMove || !actionsLeft}
          onClick={() => handleAction('dash')}
          title="Dash"
        >
          <span className="medallion-label">DSH</span>
        </button>
        <button
          className={`medallion-btn small${(!canAct || !actionsLeft) ? ' disabled' : ''}`}
          disabled={!canAct || !actionsLeft}
          onClick={() => handleAction('hide')}
          title="Hide"
        >
          <span className="medallion-label">HDE</span>
        </button>
        <button
          className={`medallion-btn small${(!canMove || !actionsLeft) ? ' disabled' : ''}`}
          disabled={!canMove || !actionsLeft}
          onClick={() => handleAction('disengage')}
          title="Disengage"
        >
          <span className="medallion-label">DIS</span>
        </button>
        <button
          className="medallion-btn small"
          onClick={() => handleAction('say')}
          title="Say"
        >
          <span className="medallion-label">SAY</span>
        </button>
        {isProne && (
          <button
            className={`medallion-btn small${!actionsLeft ? ' disabled' : ''}`}
            disabled={!actionsLeft}
            style={{ color: '#cc8822' }}
            onClick={() => handleAction('standup')}
            title="Stand Up"
          >
            <span className="medallion-label">UP</span>
          </button>
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
      {/* End turn (danger medallion) + timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, justifyContent: 'center' }}>
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700,
          color: timeLeft <= 10 ? '#cc3333' : timeLeft <= 20 ? '#cc8822' : '#d4af37',
          minWidth: 36, textAlign: 'center',
          animation: timeLeft <= 10 ? 'pulse 1s infinite' : 'none',
        }}>
          {timeLeft}s
        </div>
        <button className="medallion-btn large danger" onClick={() => { playStoneClick(); onEndTurn() }}>
          <span style={{ fontSize: 14 }}>⏹</span>
          <span className="medallion-label">END</span>
        </button>
      </div>
    </div>
  )
}

/** Centered death save popup — must roll before ending turn */
function DeathSaveUI({ active, onAction, onEndTurn }) {
  const [rolled, setRolled] = useState(false)

  // Reset rolled state when turn changes
  useEffect(() => { setRolled(false) }, [active?.id])

  const successes = active?.deathSaves?.successes || 0
  const failures = active?.deathSaves?.failures || 0

  function handleRoll() {
    setRolled(true)
    onAction?.('death-save')
  }

  return (
    <>
      {/* Centered death save popup */}
      {!rolled && (
        <div style={{
          position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,12,12,0.97)', border: '2px solid #cc3333',
          borderRadius: 8, padding: '20px 32px', minWidth: 300, zIndex: 100,
          fontFamily: 'Cinzel, serif', color: '#e8dcc8', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, color: '#cc3333', marginBottom: 12, fontWeight: 700 }}>
            ☠ DEATH SAVING THROW
          </div>
          <div style={{ color: '#8a7a52', fontSize: 12, marginBottom: 16 }}>
            You are dying. Roll a d20 to cling to life.
          </div>
          {/* Pips */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ color: '#666', fontSize: 10, marginRight: 4 }}>SAVES</span>
            {[0,1,2].map(i => (
              <div key={`s${i}`} style={{ width: 16, height: 16, borderRadius: '50%',
                background: i < successes ? '#2ecc71' : '#1a1520',
                border: '2px solid #2ecc71' }} />
            ))}
            <div style={{ width: 16 }} />
            <span style={{ color: '#666', fontSize: 10, marginRight: 4 }}>FAILS</span>
            {[0,1,2].map(i => (
              <div key={`f${i}`} style={{ width: 16, height: 16, borderRadius: '50%',
                background: i < failures ? '#cc3333' : '#1a1520',
                border: '2px solid #cc3333' }} />
            ))}
          </div>
          <button onClick={handleRoll} style={{
            width: '100%', padding: '12px 0', background: '#cc3333', color: '#1a1614',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'Cinzel, serif',
            fontSize: 16, fontWeight: 'bold', letterSpacing: 1,
          }}>
            🎲 ROLL DEATH SAVE
          </button>
        </div>
      )}
      {/* Bottom bar — END TURN only after rolling */}
      <div className="hud-combat-bar stone-panel">
        <div style={{ textAlign: 'center', color: '#cc3333', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          ☠ {rolled ? 'Death save rolled' : 'You must roll a death save'}
        </div>
        <button className="hud-end-turn" onClick={onEndTurn} disabled={!rolled}
          style={{ opacity: rolled ? 1 : 0.3, cursor: rolled ? 'pointer' : 'not-allowed' }}>
          END TURN
        </button>
      </div>
    </>
  )
}
