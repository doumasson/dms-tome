import { useState, useEffect } from 'react'

const ARCHETYPE_MAP = {
  Fighter: 'martial', Barbarian: 'martial', Monk: 'martial', Ranger: 'martial',
  Wizard: 'caster', Sorcerer: 'caster', Warlock: 'caster',
  Cleric: 'divine', Paladin: 'divine',
  Rogue: 'rogue', Bard: 'rogue',
}

export default function PortraitPickerModal({ race, cls, currentPortrait, onSelect, onClose }) {
  const [portraits, setPortraits] = useState([])
  const [selected, setSelected] = useState(currentPortrait)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/portraits/manifest.json')
      .then(r => r.json())
      .then(data => setPortraits(data.portraits || []))
      .catch(() => setPortraits([]))
  }, [])

  const archetype = ARCHETYPE_MAP[cls] || 'martial'
  const filtered = showAll ? portraits : portraits.filter(p => {
    const raceMatch = !p.tags?.race?.length || p.tags.race.includes(race?.toLowerCase())
    const archMatch = !p.tags?.archetype?.length || p.tags.archetype.includes(archetype)
    return raceMatch && archMatch
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#0e0b14', border: '2px solid #d4af37', borderRadius: 12,
        width: '90vw', maxWidth: 700, maxHeight: '80vh', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#d4af37', margin: 0, fontSize: 18 }}>Choose Portrait</h3>
          <label style={{ color: '#888', fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            {' '}Show All
          </label>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8,
        }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: 40 }}>
              No portraits for {race} {cls} yet. Using auto-generated portrait.
            </div>
          )}
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(`portraits/${p.file}`)}
              style={{
                width: 80, height: 80, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                border: selected === `portraits/${p.file}` ? '3px solid #d4af37' : '3px solid transparent',
              }}
            >
              <img src={`/portraits/${p.file}`} alt={p.id}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', background: '#1a1520', border: '1px solid #333', color: '#888', borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => { onSelect(selected); onClose() }}
            disabled={!selected}
            style={{ padding: '8px 20px', background: '#2a1a0a', border: '1px solid #d4af37', color: '#d4af37', borderRadius: 6, cursor: 'pointer', opacity: selected ? 1 : 0.4 }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
