import { CLASSES } from '../data/classes'

export default function WeaponPickerModal({ attacks, character, onSelect, onClose }) {
  const cls = CLASSES[character?.class]
  const martialArtsDie = cls?.martialArtsDie
  const monkDie = martialArtsDie
    ? Object.entries(martialArtsDie).reverse().find(([lvl]) => (character?.level || 1) >= Number(lvl))?.[1]
    : null

  const weapons = (attacks || []).map(w => {
    if (monkDie && w.name === 'Unarmed Strike') {
      return { ...w, damage: monkDie + '+' + (w.damage?.match(/\+(\d+)/)?.[1] || '0') }
    }
    return w
  })

  if (!weapons.some(w => w.name === 'Unarmed Strike')) {
    const strMod = Math.floor(((character?.stats?.str || 10) - 10) / 2)
    const prof = Math.floor(((character?.level || 1) - 1) / 4) + 2
    const die = monkDie || '1'
    weapons.push({ name: 'Unarmed Strike', bonus: `+${prof + strMod}`, damage: `${die}+${strMod}` })
  }

  return (
    <div style={{
      position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.95)', border: '2px solid #d4af37',
      borderRadius: 8, padding: '16px 24px', minWidth: 280, zIndex: 100,
      fontFamily: 'Cinzel, serif', color: '#e8dcc8', textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, color: '#d4af37', marginBottom: 12 }}>⚔ Choose Weapon</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {weapons.map((w, i) => (
          <button key={i} onClick={() => onSelect(w)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#1a1520', padding: '10px 14px', borderRadius: 4,
            border: '1px solid #332a1e', color: '#e8dcc8', cursor: 'pointer',
            fontFamily: 'Cinzel, serif', fontSize: 12,
          }}>
            <span style={{ color: '#d4af37' }}>{w.name}</span>
            <span style={{ color: '#8a7a52', fontSize: 11 }}>{w.bonus} · {w.damage}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: '#666' }}>Press Escape to cancel</div>
    </div>
  )
}
