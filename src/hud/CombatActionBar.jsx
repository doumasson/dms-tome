import { useState, useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { getClassCombatActions } from '../lib/classCombatActions'
import { getClassResources } from '../lib/classResources'
import ClassResourceBar from './ClassResourceBar'
import DeathSaveUI from './DeathSaveUI'
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
    // Reset timer whenever turn or round changes — runs for ALL turns (player + enemy)
    setTimeLeft(TURN_TIMER_SECONDS)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          timerRef.current = null
          // Auto-end turn only if it's the player's turn
          if (isMyTurn) setTimeout(() => endTurnRef.current?.(), 0)
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

  // If it's not the player's turn, show a waiting message with timer
  if (!isMyTurn) {
    return (
      <div className="hud-combat-bar stone-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 0' }}>
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
            color: timeLeft <= 10 ? '#cc3333' : '#665a3a', minWidth: 32, textAlign: 'center',
          }}>
            {timeLeft}s
          </div>
          <div style={{ color: '#8a7a52', fontSize: 12, fontStyle: 'italic' }}>
            Waiting for {active?.name || 'next combatant'}'s turn...
          </div>
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
      dashAction(active.id)
      return
    }
    if (type === 'dodge') {
      useAction(active.id)
      useStore.getState().addEncounterCondition(active.id, 'Dodging')
      useStore.getState().addEncounterLog(`${active.name} takes the Dodge action.`)
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
  console.log('[CombatActionBar]', { class: active.class, level: active.level, classActions: classActions.length, attacks: active.attacks?.length })

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
    <div className="hud-combat-bar stone-panel" style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column' }}>
      {/* Scrollable action area */}
      <div style={{ flex: 1, overflow: 'auto', maxHeight: 100 }}>
        {/* Class resource bar */}
        <ClassResourceBar combatant={active} />
        {/* Primary actions — circular medallion buttons */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
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
                title={action.name}
                onClick={() => isSpell
                  ? handleAction('spell-pick')
                  : handleAction('class-ability', {
                      name: action.name,
                      resourceName: action.resourceName,
                      resourceCost: action.resourceCost,
                    })
                }
              >
                <span style={{ fontSize: 14 }}>{action.icon}</span>
                <span className="medallion-label">{action.name.length > 6 ? action.name.slice(0,5).toUpperCase() : action.name.toUpperCase()}</span>
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
            className={`medallion-btn small${(!canAttack || !actionsLeft) ? ' disabled' : ''}`}
            disabled={!canAttack || !actionsLeft}
            onClick={() => handleAction('grapple')}
            title="Grapple — contested Athletics check, target becomes Grappled (speed 0)"
          >
            <span className="medallion-label">GRPL</span>
          </button>
          <button
            className={`medallion-btn small${(!canAttack || !actionsLeft) ? ' disabled' : ''}`}
            disabled={!canAttack || !actionsLeft}
            onClick={() => handleAction('shove')}
            title="Shove — push target 5ft or knock Prone"
          >
            <span className="medallion-label">SHOV</span>
          </button>
          <button
            className={`medallion-btn small${(!canAct || !actionsLeft) ? ' disabled' : ''}`}
            disabled={!canAct || !actionsLeft}
            onClick={() => handleAction('help')}
            title="Help — grant an ally advantage on their next attack against a target"
          >
            <span className="medallion-label">HELP</span>
          </button>
          <button
            className={`medallion-btn small${(!canAct || !actionsLeft) ? ' disabled' : ''}`}
            disabled={!canAct || !actionsLeft}
            onClick={() => handleAction('use-item')}
            title="Use Item — drink a potion or use a consumable (costs action)"
          >
            <span className="medallion-label">USE</span>
          </button>
          <button
            className={`medallion-btn small${(!canAct || !actionsLeft) ? ' disabled' : ''}`}
            disabled={!canAct || !actionsLeft}
            onClick={() => handleAction('ready')}
            title="Ready — prepare an action with a trigger (uses action + reaction)"
          >
            <span className="medallion-label">RDY</span>
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
      </div>
      {/* ALWAYS VISIBLE: timer + end turn — outside scroll area */}
      <div style={{ borderTop: '1px solid rgba(140,120,70,0.2)', paddingTop: 4, marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
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
