import { getClassResources } from '../lib/classResources'

export default function ClassResourceBar({ combatant }) {
  if (!combatant) return null
  const { class: cls, level, stats, spellSlots, resourcesUsed = {}, concentration } = combatant
  const resources = getClassResources(cls, level || 1, stats)

  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
      fontSize: 10, color: '#8a7a52', fontFamily: 'monospace',
      padding: '4px 8px', marginBottom: 4,
    }}>
      {spellSlots && Object.entries(spellSlots)
        .filter(([, v]) => v.total > 0)
        .map(([lvl, v]) => (
          <span key={`slot-${lvl}`}>
            L{lvl}: <span style={{ color: '#d4af37' }}>{'●'.repeat(Math.max(0, v.total - (v.used || 0)))}</span>
            <span style={{ color: '#332a1e' }}>{'●'.repeat(v.used || 0)}</span>
          </span>
        ))
      }
      {resources.map(r => {
        const used = resourcesUsed[r.name] || 0
        const remaining = Math.max(0, r.max - used)
        return (
          <span key={r.name}>
            {r.icon} {r.name}: <span style={{ color: remaining > 0 ? '#d4af37' : '#cc3333' }}>
              {r.type === 'pool' ? `${remaining}/${r.max}` : `${'●'.repeat(remaining)}${'○'.repeat(used)}`}
            </span>
          </span>
        )
      })}
      {concentration && (
        <span style={{ color: '#aa66ff' }}>⟳ {concentration}</span>
      )}
    </div>
  )
}
