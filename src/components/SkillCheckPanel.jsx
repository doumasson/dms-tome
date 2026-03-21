import { useState } from 'react'
import useStore from '../store/useStore'
import { broadcastEncounterAction } from '../lib/liveChannel'

export default function SkillCheckPanel() {
  const check = useStore(s => s.pendingSkillCheck)
  const clearCheck = useStore(s => s.clearPendingSkillCheck)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)
  const myCharacter = useStore(s => s.myCharacter)
  const partyMembers = useStore(s => s.partyMembers)
  const encounter = useStore(s => s.encounter)

  const [useGuidance, setUseGuidance] = useState(false)
  const [useBardic, setUseBardic] = useState(false)
  const [result, setResult] = useState(null)

  if (!check) return null

  const skill = check.skill || 'Ability Check'
  const modifier = getSkillModifier(myCharacter, skill)

  // Only show Guidance/Bardic if a party member can actually provide them
  const myConditions = new Set(myCharacter?.conditions || [])
  const combatant = encounter.combatants?.find(c => c.id === myCharacter?.id || c.name === myCharacter?.name)
  const combatConditions = new Set(combatant?.conditions || [])
  const hasGuidanceBuff = myConditions.has('Guidance') || combatConditions.has('Guidance')
  const hasBardicBuff = myConditions.has('Bardic Inspiration') || combatConditions.has('Bardic Inspiration')
  // Also check if any party member is a Cleric/Druid (Guidance) or Bard (Bardic Inspiration)
  const partyHasGuidanceCaster = (partyMembers || []).some(p =>
    p.id !== myCharacter?.id && ['Cleric', 'Druid', 'Artificer'].includes(p.class)
  )
  const partyHasBard = (partyMembers || []).some(p =>
    p.id !== myCharacter?.id && p.class === 'Bard'
  )
  const showGuidance = hasGuidanceBuff || partyHasGuidanceCaster
  const showBardic = hasBardicBuff || partyHasBard

  function handleRoll() {
    let d20 = Math.floor(Math.random() * 20) + 1
    let total = d20 + modifier
    let extras = ''

    if (useGuidance) {
      const guidanceRoll = Math.floor(Math.random() * 4) + 1
      total += guidanceRoll
      extras += ` +${guidanceRoll} Guidance`
    }
    if (useBardic) {
      const bardicDie = Math.floor(Math.random() * 8) + 1
      total += bardicDie
      extras += ` +${bardicDie} Bardic`
    }

    const dc = check.dc || 10
    const pass = total >= dc
    const charName = myCharacter?.name || check.character || 'You'
    const entry = `${charName} rolled ${skill}: ${total} (d20: ${d20} + ${modifier}${extras}) — ${pass ? 'Success!' : 'Failure'}`
    addNarratorMessage({ role: 'user', speaker: charName, text: entry })
    broadcastEncounterAction({ type: 'skill-check-result', characterName: charName, skill, total, pass })

    setResult({ d20, total, pass })
    setTimeout(() => { clearCheck(); setResult(null); setUseGuidance(false); setUseBardic(false) }, 2500)
  }

  return (
    <div style={{
      position: 'absolute', bottom: '52%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.95)', border: '2px solid #d4af37',
      borderRadius: 8, padding: '16px 24px', minWidth: 280, zIndex: 100,
      fontFamily: 'Cinzel, serif', color: '#e8dcc8', textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, color: '#d4af37', marginBottom: 6 }}>{skill} Check</div>
      {check.reason && <div style={{ fontSize: 11, marginBottom: 10, opacity: 0.7 }}>{check.reason}</div>}
      <div style={{ fontSize: 20, marginBottom: 12 }}>
        Modifier: <span style={{ color: '#d4af37' }}>{modifier >= 0 ? '+' : ''}{modifier}</span>
      </div>

      {(showGuidance || showBardic) && (
        <div style={{ marginBottom: 14, fontSize: 12, textAlign: 'left' }}>
          {showGuidance && (
            <label style={{ display: 'block', marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={useGuidance} onChange={e => setUseGuidance(e.target.checked)} /> Guidance (+1d4)
            </label>
          )}
          {showBardic && (
            <label style={{ display: 'block', cursor: 'pointer' }}>
              <input type="checkbox" checked={useBardic} onChange={e => setUseBardic(e.target.checked)} /> Bardic Inspiration (+1d8)
            </label>
          )}
        </div>
      )}

      {result ? (
        <div style={{ fontSize: 24, fontWeight: 'bold', color: result.pass ? '#44aa44' : '#cc3333', padding: '8px 0' }}>
          {result.total} — {result.pass ? 'SUCCESS' : 'FAILURE'}
        </div>
      ) : (
        <button onClick={handleRoll} style={{
          width: '100%', padding: '10px 0', background: '#d4af37', color: '#1a1614',
          border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'Cinzel, serif',
          fontSize: 15, fontWeight: 'bold', letterSpacing: 1,
        }}>
          Roll d20
        </button>
      )}
    </div>
  )
}

function getSkillModifier(character, skill) {
  if (!character) return 0
  const stats = character.stats || character.abilityScores || {}
  const map = {
    'Perception': 'wis', 'Stealth': 'dex', 'Athletics': 'str', 'Acrobatics': 'dex',
    'Investigation': 'int', 'Arcana': 'int', 'History': 'int', 'Nature': 'int',
    'Religion': 'int', 'Insight': 'wis', 'Medicine': 'wis', 'Survival': 'wis',
    'Animal Handling': 'wis', 'Deception': 'cha', 'Intimidation': 'cha',
    'Performance': 'cha', 'Persuasion': 'cha', 'Sleight of Hand': 'dex',
  }
  const ability = map[skill] || 'str'
  const score = stats[ability] || 10
  return Math.floor((score - 10) / 2)
}
