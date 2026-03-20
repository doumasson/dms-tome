/**
 * Opportunity Attack confirmation modal — shown when a combat movement
 * path would provoke attacks of opportunity.
 */
export default function OAConfirmModal({ pendingOA, onConfirm, onCancel }) {
  if (!pendingOA) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0e0b14', border: '2px solid #d4af37', borderRadius: 8,
        padding: 24, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>&#x2694;</div>
        <div style={{ color: '#e0d0b8', marginBottom: 16 }}>
          This path provokes attacks of opportunity from <strong style={{ color: '#cc3333' }}>{pendingOA.names}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={onConfirm}
            style={{ padding: '8px 20px', background: '#3a1a0a', border: '1px solid #cc3333',
              color: '#e0d0b8', borderRadius: 4, cursor: 'pointer' }}>Move Anyway</button>
          <button onClick={onCancel}
            style={{ padding: '8px 20px', background: '#1a1520', border: '1px solid #333',
              color: '#888', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
