import { useState, useEffect } from 'react'

/** Centered death save popup — must roll before ending turn */
export default function DeathSaveUI({ active, onAction, onEndTurn }) {
  const [rollResult, setRollResult] = useState(null) // { roll, isSuccess, isNat20, isNat1 }
  const [canEndTurn, setCanEndTurn] = useState(false)

  // Reset state when turn changes
  useEffect(() => { setRollResult(null); setCanEndTurn(false) }, [active?.id])

  // Read updated pips from store after roll is applied
  const successes = active?.deathSaves?.successes || 0
  const failures = active?.deathSaves?.failures || 0

  function handleRoll() {
    const result = onAction?.('death-save')
    // result is the d20 roll returned from handleCombatAction
    if (typeof result === 'number') {
      setRollResult({
        roll: result,
        isNat20: result === 20,
        isNat1: result === 1,
        isSuccess: result >= 10,
      })
    } else {
      // Fallback if return value not available
      setRollResult({ roll: '?', isSuccess: null, isNat20: false, isNat1: false })
    }
    // Allow END TURN after a brief delay so player can read the result
    setTimeout(() => setCanEndTurn(true), 1500)
  }

  const rolled = rollResult !== null

  // Determine result display
  let resultText = ''
  let resultColor = '#e8dcc8'
  if (rollResult) {
    if (rollResult.isNat20) {
      resultText = `🎲 ${rollResult.roll} — NATURAL 20! REVIVED!`
      resultColor = '#d4af37'
    } else if (rollResult.isNat1) {
      resultText = `🎲 ${rollResult.roll} — CRITICAL FAIL! Two failures!`
      resultColor = '#ff4444'
    } else if (rollResult.isSuccess) {
      resultText = `🎲 ${rollResult.roll} — SUCCESS!`
      resultColor = '#2ecc71'
    } else {
      resultText = `🎲 ${rollResult.roll} — FAILED`
      resultColor = '#cc3333'
    }
  }

  return (
    <>
      {/* Centered death save popup */}
      <div style={{
        position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(20,12,12,0.97)', border: `2px solid ${rolled ? resultColor : '#cc3333'}`,
        borderRadius: 8, padding: '20px 32px', minWidth: 300, zIndex: 100,
        fontFamily: 'Cinzel, serif', color: '#e8dcc8', textAlign: 'center',
      }}>
        <div style={{ fontSize: 18, color: '#cc3333', marginBottom: 12, fontWeight: 700 }}>
          ☠ DEATH SAVING THROW
        </div>
        {!rolled && (
          <div style={{ color: '#8a7a52', fontSize: 12, marginBottom: 16 }}>
            You are dying. Roll a d20 to cling to life.
          </div>
        )}
        {/* Roll result display */}
        {rolled && (
          <div style={{
            fontSize: 22, fontWeight: 700, color: resultColor,
            marginBottom: 16, padding: '8px 0',
            textShadow: `0 0 12px ${resultColor}40`,
          }}>
            {resultText}
          </div>
        )}
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
        {!rolled && (
          <button onClick={handleRoll} style={{
            width: '100%', padding: '12px 0', background: '#cc3333', color: '#1a1614',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'Cinzel, serif',
            fontSize: 16, fontWeight: 'bold', letterSpacing: 1,
          }}>
            🎲 ROLL DEATH SAVE
          </button>
        )}
      </div>
      {/* Bottom bar — END TURN only after rolling + delay */}
      <div className="hud-combat-bar stone-panel">
        <div style={{ textAlign: 'center', color: rolled ? resultColor : '#cc3333', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          ☠ {rolled ? resultText : 'You must roll a death save'}
        </div>
        <button className="hud-end-turn" onClick={onEndTurn} disabled={!canEndTurn}
          style={{ opacity: canEndTurn ? 1 : 0.3, cursor: canEndTurn ? 'pointer' : 'not-allowed' }}>
          END TURN
        </button>
      </div>
    </>
  )
}
