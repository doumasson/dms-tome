import { READY_TRIGGERS, READY_RESPONSES } from '../lib/readiedAction'

/**
 * Popup prompt when a readied action trigger fires.
 * Player decides whether to use their reaction to execute the readied response.
 */
export default function ReadyActionPrompt({ readiedAction, triggerDescription, onExecute, onPass }) {
  const triggerDef = READY_TRIGGERS.find(t => t.id === readiedAction.trigger)
  const responseDef = READY_RESPONSES.find(r => r.id === readiedAction.response)

  return (
    <div style={{
      position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.97)', border: '2px solid #cc8822',
      borderRadius: 8, padding: '16px 24px', minWidth: 300, zIndex: 110,
      fontFamily: 'Cinzel, serif', color: '#e8dcc8', textAlign: 'center',
    }}>
      <div style={{ fontSize: 14, color: '#cc8822', fontWeight: 700, marginBottom: 8 }}>
        Readied Action Triggered!
      </div>
      <div style={{ fontSize: 12, color: '#8a7a52', marginBottom: 6 }}>
        {triggerDescription}
      </div>
      <div style={{ fontSize: 11, marginBottom: 12, opacity: 0.8 }}>
        <strong>Trigger:</strong> {triggerDef?.label || readiedAction.trigger}<br/>
        <strong>Response:</strong> {responseDef?.label || readiedAction.response}
        {readiedAction.weapon && ` (${readiedAction.weapon.name})`}
      </div>
      <div style={{ fontSize: 10, color: '#665a3a', marginBottom: 14 }}>
        Use your reaction to execute?
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={onPass} style={{
          padding: '8px 20px', background: 'rgba(60,50,40,0.6)', color: '#8a7a52',
          border: '1px solid rgba(140,120,70,0.3)', borderRadius: 4, cursor: 'pointer',
          fontFamily: 'Cinzel, serif', fontSize: 12,
        }}>
          Pass
        </button>
        <button onClick={onExecute} style={{
          padding: '8px 20px', background: '#cc8822', color: '#1a1614',
          border: 'none', borderRadius: 4, cursor: 'pointer',
          fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 'bold',
        }}>
          Execute!
        </button>
      </div>
    </div>
  )
}
