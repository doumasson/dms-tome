import { useState } from 'react'
import { getAvailableSpells, canCastSpell, getAvailableSlotLevels } from '../lib/spellCasting'

export default function SpellPickerModal({ character, spellSlots, onSelect, onClose, cantripsOnly }) {
  const [upcastSpell, setUpcastSpell] = useState(null)
  // PHB p.202: If a leveled spell was already cast this turn, only cantrips are available
  const allSpells = getAvailableSpells(character)
  const spells = cantripsOnly ? allSpells.filter(s => s.level === 0) : allSpells

  if (spells.length === 0) {
    return (
      <div style={modalStyle}>
        <div style={{ fontSize: 16, color: '#d4af37', marginBottom: 12 }}>
          {cantripsOnly ? 'Cantrips Only' : 'No Spells Available'}
        </div>
        <div style={{ color: '#8a7a52', fontSize: 12 }}>
          {cantripsOnly
            ? 'A leveled spell was already cast this turn. Only cantrips may be cast (PHB p.202).'
            : 'This character has no prepared spells.'}
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: '#666' }}>Press Escape to close</div>
      </div>
    )
  }

  const grouped = {}
  for (const s of spells) {
    ;(grouped[s.level] ??= []).push(s)
  }

  if (upcastSpell) {
    const levels = getAvailableSlotLevels(upcastSpell, spellSlots)
    return (
      <div style={modalStyle}>
        <div style={{ fontSize: 14, color: '#d4af37', marginBottom: 8 }}>Cast {upcastSpell.name} at level:</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {levels.map(lvl => (
            <button key={lvl} onClick={() => onSelect(upcastSpell, lvl)} style={{
              ...slotBtnStyle, background: lvl === upcastSpell.level ? '#2a1a1a' : '#1a1a2a',
            }}>
              {lvl === upcastSpell.level ? `${ordinal(lvl)} (base)` : ordinal(lvl)}
            </button>
          ))}
        </div>
        <button onClick={() => setUpcastSpell(null)} style={{ ...cancelBtnStyle, marginTop: 10 }}>Back</button>
      </div>
    )
  }

  function handleSpellClick(spell) {
    if (spell.level === 0) { onSelect(spell, 0); return }
    const levels = getAvailableSlotLevels(spell, spellSlots)
    if (levels.length === 0) return
    if (levels.length === 1) { onSelect(spell, levels[0]); return }
    setUpcastSpell(spell)
  }

  return (
    <div style={modalStyle}>
      <div style={{ fontSize: 16, color: '#d4af37', marginBottom: 6 }}>
        {cantripsOnly ? 'Cantrips Only' : 'Prepared Spells'}
      </div>
      {cantripsOnly && (
        <div style={{ color: '#c0392b', fontSize: 10, marginBottom: 4, textAlign: 'center' }}>
          A leveled spell was already cast this turn (PHB p.202)
        </div>
      )}
      <div style={{ color: '#8a7a52', fontSize: 10, marginBottom: 10, textAlign: 'center' }}>
        {Object.entries(spellSlots || {}).filter(([, v]) => v.total > 0).map(([lvl, v]) => (
          <span key={lvl} style={{ marginRight: 8 }}>
            L{lvl}: {'●'.repeat(v.total - v.used)}{'○'.repeat(v.used)}
          </span>
        ))}
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(grouped).sort(([a],[b]) => a - b).map(([level, list]) => (
          <div key={level}>
            <div style={{ color: level === '0' ? '#666' : '#d4af37', fontSize: 10, marginBottom: 4 }}>
              {level === '0' ? 'CANTRIPS (at will)' : `LEVEL ${level} (${slotsRemaining(spellSlots, Number(level))} slots)`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {list.map(spell => {
                const castable = canCastSpell(spell, spellSlots)
                const isReaction = spell.castingTime?.includes('reaction')
                return (
                  <button key={spell.spellId || spell.name} disabled={!castable || isReaction}
                    onClick={() => handleSpellClick(spell)}
                    style={{
                      ...spellBtnStyle,
                      opacity: (!castable || isReaction) ? 0.4 : 1,
                      cursor: (!castable || isReaction) ? 'not-allowed' : 'pointer',
                    }}>
                    <span style={{ color: '#e8dcc8' }}>{spell.name}</span>
                    <span style={{ color: '#666', fontSize: 10 }}>
                      {spell.areaType ? `${spell.areaType} ` : ''}
                      {spell.range > 0 ? `${spell.range}ft` : spell.range === -1 ? 'touch' : 'self'}
                      {spell.damage?.dice ? ` · ${spell.damage.dice}` : ''}
                      {spell.concentration ? ' · ⟳' : ''}
                      {isReaction ? ' · reaction' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: '#666', textAlign: 'center' }}>Press Escape to cancel</div>
    </div>
  )
}

function slotsRemaining(slots, level) {
  const s = slots?.[level]
  return s ? s.total - s.used : 0
}

function ordinal(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

const modalStyle = {
  position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(20,16,12,0.95)', border: '2px solid #d4af37',
  borderRadius: 8, padding: '16px 24px', minWidth: 320, maxWidth: 400, zIndex: 100,
  fontFamily: 'Cinzel, serif', color: '#e8dcc8',
}

const spellBtnStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  background: '#1a1520', padding: '8px 12px', borderRadius: 4,
  border: '1px solid #332a1e', color: '#e8dcc8',
  fontFamily: 'Cinzel, serif', fontSize: 11, width: '100%',
}

const slotBtnStyle = {
  padding: '8px 16px', borderRadius: 4, border: '1px solid #d4af37',
  color: '#d4af37', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 12,
}

const cancelBtnStyle = {
  background: 'none', border: '1px solid #444', color: '#666',
  padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 10,
  fontFamily: 'Cinzel, serif',
}
