import { useState } from 'react'
import { READY_TRIGGERS, READY_RESPONSES } from '../lib/readiedAction'

/**
 * Modal for specifying a Ready action trigger and response.
 * Player picks: what triggers it + what they do when it triggers.
 */
export default function ReadyActionModal({ combatant, onConfirm, onCancel }) {
  const [trigger, setTrigger] = useState(null)
  const [response, setResponse] = useState(null)
  const [selectedWeapon, setSelectedWeapon] = useState(null)

  const attacks = combatant?.attacks || []
  const needsWeapon = response && READY_RESPONSES.find(r => r.id === response)?.requiresWeapon

  function handleConfirm() {
    if (!trigger || !response) return
    if (needsWeapon && !selectedWeapon) return
    onConfirm({
      trigger,
      response,
      weapon: selectedWeapon || null,
    })
  }

  return (
    <div style={{
      position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.97)', border: '2px solid #d4af37',
      borderRadius: 8, padding: '16px 20px', minWidth: 320, maxWidth: 380, zIndex: 100,
      fontFamily: 'Cinzel, serif', color: '#e8dcc8',
    }}>
      <div style={{ fontSize: 16, color: '#d4af37', textAlign: 'center', marginBottom: 12, fontWeight: 700 }}>
        Ready an Action
      </div>
      <div style={{ fontSize: 11, color: '#8a7a52', textAlign: 'center', marginBottom: 14 }}>
        Choose a trigger and what you'll do when it happens. Uses your reaction.
      </div>

      {/* Trigger selection */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#c9a84c', marginBottom: 6, fontWeight: 600 }}>TRIGGER</div>
        {READY_TRIGGERS.map(t => (
          <button
            key={t.id}
            onClick={() => setTrigger(t.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '6px 10px', marginBottom: 3,
              background: trigger === t.id ? 'rgba(212,175,55,0.2)' : 'rgba(40,32,24,0.6)',
              border: trigger === t.id ? '1px solid #d4af37' : '1px solid rgba(140,120,70,0.3)',
              borderRadius: 4, color: '#e8dcc8', cursor: 'pointer',
              fontFamily: 'Cinzel, serif', fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600 }}>{t.label}</div>
            <div style={{ fontSize: 10, opacity: 0.6 }}>{t.description}</div>
          </button>
        ))}
      </div>

      {/* Response selection */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#c9a84c', marginBottom: 6, fontWeight: 600 }}>RESPONSE</div>
        {READY_RESPONSES.map(r => (
          <button
            key={r.id}
            onClick={() => { setResponse(r.id); if (!r.requiresWeapon) setSelectedWeapon(null) }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '6px 10px', marginBottom: 3,
              background: response === r.id ? 'rgba(212,175,55,0.2)' : 'rgba(40,32,24,0.6)',
              border: response === r.id ? '1px solid #d4af37' : '1px solid rgba(140,120,70,0.3)',
              borderRadius: 4, color: '#e8dcc8', cursor: 'pointer',
              fontFamily: 'Cinzel, serif', fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600 }}>{r.label}</div>
            <div style={{ fontSize: 10, opacity: 0.6 }}>{r.description}</div>
          </button>
        ))}
      </div>

      {/* Weapon selection (if attack response) */}
      {needsWeapon && attacks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#c9a84c', marginBottom: 6, fontWeight: 600 }}>WEAPON</div>
          {attacks.map((w, i) => (
            <button
              key={i}
              onClick={() => setSelectedWeapon(w)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '5px 10px', marginBottom: 2,
                background: selectedWeapon === w ? 'rgba(212,175,55,0.2)' : 'rgba(40,32,24,0.6)',
                border: selectedWeapon === w ? '1px solid #d4af37' : '1px solid rgba(140,120,70,0.3)',
                borderRadius: 4, color: '#e8dcc8', cursor: 'pointer',
                fontFamily: 'Cinzel, serif', fontSize: 11,
              }}
            >
              {w.name} ({w.bonus} / {w.damage})
            </button>
          ))}
        </div>
      )}

      {/* Confirm / Cancel */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={onCancel} style={{
          padding: '8px 20px', background: 'rgba(60,50,40,0.6)', color: '#8a7a52',
          border: '1px solid rgba(140,120,70,0.3)', borderRadius: 4, cursor: 'pointer',
          fontFamily: 'Cinzel, serif', fontSize: 12,
        }}>
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!trigger || !response || (needsWeapon && !selectedWeapon)}
          style={{
            padding: '8px 20px', background: trigger && response ? '#d4af37' : 'rgba(60,50,40,0.3)',
            color: trigger && response ? '#1a1614' : '#665a3a',
            border: 'none', borderRadius: 4, cursor: trigger && response ? 'pointer' : 'not-allowed',
            fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 'bold',
          }}
        >
          Ready
        </button>
      </div>
    </div>
  )
}
