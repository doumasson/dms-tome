import { useState, useEffect } from 'react'
import useStore from '../store/useStore'
import { playStoneClick } from '../lib/uiSounds'
import './QuickslotBar.css'

const NUM_SLOTS = 6

export default function QuickslotBar({ onUseSlot }) {
  const myCharacter = useStore(s => s.myCharacter)
  const encounter = useStore(s => s.encounter)
  const inCombat = encounter?.phase === 'combat' && encounter.combatants?.some(c =>
    c.id === myCharacter?.id || c.name === myCharacter?.name
  )

  // Quickslots stored per character in localStorage
  const [slots, setSlots] = useState(() => {
    const saved = localStorage.getItem(`quickslots_${myCharacter?.id}`)
    return saved ? JSON.parse(saved) : Array(NUM_SLOTS).fill(null)
  })

  // Save slots when they change
  useEffect(() => {
    if (myCharacter?.id) {
      localStorage.setItem(`quickslots_${myCharacter.id}`, JSON.stringify(slots))
    }
  }, [slots, myCharacter?.id])

  // Keyboard shortcuts: 1-6
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const num = parseInt(e.key)
      if (num >= 1 && num <= NUM_SLOTS && slots[num - 1]) {
        playStoneClick()
        onUseSlot?.(slots[num - 1], num - 1)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [slots, onUseSlot])

  function handleSlotClick(index) {
    if (!slots[index]) return
    playStoneClick()
    onUseSlot?.(slots[index], index)
  }

  function handleSlotRightClick(e, index) {
    e.preventDefault()
    // Clear slot on right-click
    const next = [...slots]
    next[index] = null
    setSlots(next)
  }

  return (
    <div className="quickslot-bar">
      {slots.map((slot, i) => (
        <div key={i}
          className={`quickslot ${slot ? 'filled' : 'empty'}`}
          onClick={() => handleSlotClick(i)}
          onContextMenu={(e) => handleSlotRightClick(e, i)}
          title={slot ? `${slot.name} (${i + 1})` : `Empty slot (${i + 1})`}
        >
          <span className="quickslot-key">{i + 1}</span>
          {slot ? (
            <span className="quickslot-icon">{slot.icon || '?'}</span>
          ) : (
            <span className="quickslot-empty-icon">&middot;</span>
          )}
        </div>
      ))}
    </div>
  )
}
