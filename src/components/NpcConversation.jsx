import { useState, useRef, useEffect, useCallback } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const SPEECH_SUPPORTED = !!SpeechRecognition
import { callNarrator, buildNpcSystemPrompt } from '../lib/narratorApi'
import { createQuest } from '../lib/questSystem'
import { broadcastEncounterAction } from '../lib/liveChannel'
import { getSkillBonus } from '../lib/derivedStats'
import useStore from '../store/useStore'

/**
 * Shared conversation component for NPC dialog and story cutscene.
 * Handles: message display, text input, AI calls, prompt counting,
 * and social skill checks (Persuasion, Intimidation, Deception, Insight).
 */
export default function NpcConversation({
  npc,
  isCritical,
  initialMessage,
  onPromptCount,
  onClose,
  disabled,
  maxPrompts,
}) {
  const campaign = useStore(s => s.campaign)
  const storyFlags = useStore(s => s.storyFlags)
  const sessionApiKey = useStore(s => s.sessionApiKey)
  const myCharacter = useStore(s => s.myCharacter)
  const factionReputation = useStore(s => s.factionReputation)
  const adjustFactionReputation = useStore(s => s.adjustFactionReputation)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)
  const addQuest = useStore(s => s.addQuest)

  const [messages, setMessages] = useState(() => {
    if (initialMessage) {
      return [{ role: 'npc', speaker: npc.name, text: initialMessage }]
    }
    return []
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const pttRecogRef = useRef(null)

  // Social skill check state
  const [pendingRoll, setPendingRoll] = useState(null) // { skill, dc, reason }
  const [rollResult, setRollResult] = useState(null)    // { d20, total, pass, skill }
  const [suggestions, setSuggestions] = useState([])     // AI-suggested player responses

  // Reputation change state
  const [pendingRepChange, setPendingRepChange] = useState(null) // { faction, delta, reason }

  // Quest offer state
  const [pendingQuestOffer, setPendingQuestOffer] = useState(null) // { title, description, objectives }

  const startPTT = useCallback(() => {
    if (!SPEECH_SUPPORTED) return
    try {
      const recog = new SpeechRecognition()
      recog.lang = 'en-US'
      recog.interimResults = false
      recog.maxAlternatives = 1
      recog.onresult = (e) => setInput(e.results[0][0].transcript)
      recog.onerror = () => setIsRecording(false)
      recog.onend = () => setIsRecording(false)
      recog.start()
      pttRecogRef.current = recog
      setIsRecording(true)
    } catch { setIsRecording(false) }
  }, [])

  const stopPTT = useCallback(() => {
    if (pttRecogRef.current) { pttRecogRef.current.stop(); pttRecogRef.current = null }
    setIsRecording(false)
  }, [])
  const [promptCount, setPromptCount] = useState(0)
  const [hardLimited, setHardLimited] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, pendingRoll, rollResult, pendingRepChange, pendingQuestOffer])

  useEffect(() => {
    onPromptCount?.(promptCount)
  }, [promptCount, onPromptCount])

  /** Compute skill modifier for the active character */
  function getSkillModifier(skill) {
    if (!myCharacter) return { bonus: 0, proficient: false, expertise: false }
    const stats = myCharacter.stats || myCharacter.abilityScores || {}
    const proficientSkills = myCharacter.skills || []
    const expertiseSkills = myCharacter.expertiseSkills || []
    const level = myCharacter.level || 1
    return getSkillBonus(stats, skill, proficientSkills, expertiseSkills, level)
  }

  /** Send AI call and handle response (narrative + rollRequest) */
  async function sendToNpc(allMessages, newCount) {
    const apiKey = sessionApiKey
    if (!apiKey) return

    setLoading(true)
    try {
      const systemPrompt = buildNpcSystemPrompt(npc, campaign, storyFlags, newCount, isCritical, factionReputation)
      const history = allMessages.map(m => ({
        role: m.role === 'npc' ? 'assistant' : 'user',
        content: m.text,
      }))

      const result = await callNarrator({
        messages: history,
        systemPrompt,
        apiKey,
      })

      const dialogue = result?.narrative || '...'
      const npcMsg = { role: 'npc', speaker: npc.name, text: dialogue }
      setMessages(prev => [...prev, npcMsg])

      // Capture AI-suggested player responses
      if (Array.isArray(result?.suggestions) && result.suggestions.length > 0) {
        setSuggestions(result.suggestions.slice(0, 3))
      } else {
        setSuggestions([])
      }

      // Check for social skill check request
      if (result?.rollRequest && result.rollRequest.skill && result.rollRequest.dc) {
        setPendingRoll(result.rollRequest)
      }

      // Check for reputation change
      if (result?.reputationChange && result.reputationChange.faction && typeof result.reputationChange.delta === 'number') {
        setPendingRepChange(result.reputationChange)
      }

      // Check for quest offer
      if (result?.questOffer && result.questOffer.title && result.questOffer.objectives) {
        setPendingQuestOffer(result.questOffer)
      }

      if (isCritical && newCount >= 7 && newCount < (maxPrompts || 10)) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'system', speaker: '',
            text: `${npc.name} grows impatient...`,
          }])
        }, 1500)
      }
    } catch (err) {
      console.error('[NpcConversation] AI error:', err)
      setMessages(prev => [...prev, {
        role: 'npc', speaker: npc.name,
        text: '...',
      }])
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(text) {
    const trimmed = (text || input).trim()
    if (!trimmed || loading || disabled || hardLimited || pendingRoll) return

    const apiKey = sessionApiKey
    if (!apiKey) return

    if (maxPrompts && promptCount >= maxPrompts) {
      setHardLimited(true)
      setMessages(prev => [...prev, {
        role: 'npc', speaker: npc.name,
        text: `${npc.name} has said all they have to say.`,
      }])
      return
    }

    const playerMsg = { role: 'player', speaker: 'You', text: trimmed }
    const updated = [...messages, playerMsg]
    setMessages(updated)
    setInput('')
    setSuggestions([])

    const newCount = promptCount + 1
    setPromptCount(newCount)

    await sendToNpc(updated, newCount)
  }

  /** Handle the d20 roll for a social skill check */
  async function handleSocialRoll() {
    if (!pendingRoll) return

    const skill = pendingRoll.skill
    const dc = pendingRoll.dc
    const { bonus, proficient, expertise } = getSkillModifier(skill)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus
    const pass = total >= dc
    const charName = myCharacter?.name || 'You'

    const resultText = `${charName} rolled ${skill}: ${total} (d20: ${d20} + ${bonus}) — ${pass ? 'Success!' : 'Failure'}`

    // Add roll result to conversation
    const rollMsg = { role: 'player', speaker: charName, text: resultText }
    const updatedMessages = [...messages, rollMsg]
    setMessages(updatedMessages)

    // Broadcast to other players
    broadcastEncounterAction({
      type: 'skill-check-result',
      characterName: charName,
      skill,
      total,
      pass,
      context: 'npc-dialog',
      npcName: npc.name,
    })

    // Also add to narrator log so other players see it
    const { addNarratorMessage } = useStore.getState()
    addNarratorMessage({ role: 'user', speaker: charName, text: `[${npc.name}] ${resultText}` })

    setRollResult({ d20, total, pass, skill, bonus, proficient, expertise })
    setPendingRoll(null)

    // After showing result briefly, send follow-up to NPC for outcome narration
    setTimeout(async () => {
      setRollResult(null)
      const newCount = promptCount + 1
      setPromptCount(newCount)
      await sendToNpc(updatedMessages, newCount)
    }, 1800)
  }

  /** Apply reputation change and broadcast to other players */
  async function handleReputationChange() {
    if (!pendingRepChange) return

    const { faction, delta, reason } = pendingRepChange
    const sign = delta > 0 ? '+' : ''
    const changeText = `${reason || `Reputation with ${faction}: ${sign}${delta}`}`

    // Apply to store
    adjustFactionReputation(faction, delta)

    // Broadcast to other players
    broadcastEncounterAction({
      type: 'reputation-change',
      faction,
      delta,
      characterName: myCharacter?.name || 'Party',
    })

    // Add to narrator log
    addNarratorMessage({
      role: 'system',
      speaker: 'Reputation Update',
      text: changeText,
    })

    // Clear state and disable conversation
    setMessages(prev => [...prev, {
      role: 'system', speaker: '', text: `Reputation with ${faction}: ${sign}${delta}`,
    }])
    setPendingRepChange(null)
    setHardLimited(true)
  }

  /** Accept a quest offer and add to player's journal */
  async function handleAcceptQuest() {
    if (!pendingQuestOffer) return

    const { title, description, objectives } = pendingQuestOffer

    // Create quest object
    const quest = createQuest(
      title,
      objectives.map(text => ({ text })),
      { description, npcName: npc.name, faction: npc.faction }
    )

    // Add to store
    addQuest(quest)

    // Add to narrator log
    addNarratorMessage({
      role: 'system',
      speaker: 'Quest Added',
      text: `${title}`,
    })

    // Show in conversation
    setMessages(prev => [...prev, {
      role: 'system', speaker: '', text: `Quest added: ${title}`,
    }])

    setPendingQuestOffer(null)
    setHardLimited(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    handleSend()
  }

  return (
    <div className="npc-conv">
      <div className="npc-conv-messages" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`npc-conv-msg npc-conv-${msg.role}`}>
            {msg.speaker && (
              <span className="npc-conv-speaker">{msg.speaker}</span>
            )}
            <span className="npc-conv-text">{msg.text}</span>
          </div>
        ))}
        {loading && (
          <div className="npc-conv-msg npc-conv-npc">
            <span className="npc-conv-speaker">{npc.name}</span>
            <span className="npc-conv-text npc-conv-loading">...</span>
          </div>
        )}
      </div>

      {/* Social Skill Check Panel — inline in NPC dialog */}
      {pendingRoll && !rollResult && (
        <SocialCheckInline
          skill={pendingRoll.skill}
          dc={pendingRoll.dc}
          reason={pendingRoll.reason}
          modifier={getSkillModifier(pendingRoll.skill)}
          onRoll={handleSocialRoll}
        />
      )}

      {/* Roll result display */}
      {rollResult && (
        <div style={{
          padding: '10px 16px', textAlign: 'center', fontFamily: 'Cinzel, serif',
          background: 'rgba(20,16,12,0.9)', borderTop: '1px solid #c9a84c',
        }}>
          <span style={{
            fontSize: 20, fontWeight: 'bold',
            color: rollResult.pass ? '#44aa44' : '#cc3333',
          }}>
            {rollResult.total} — {rollResult.pass ? 'SUCCESS' : 'FAILURE'}
          </span>
        </div>
      )}

      {/* Reputation change panel */}
      {pendingRepChange && !rollResult && (
        <div style={{
          padding: '12px 16px', textAlign: 'center', fontFamily: 'Cinzel, serif',
          background: 'rgba(20,16,12,0.95)', borderTop: '2px solid #d4af37',
          color: '#e8dcc8',
        }}>
          <div style={{ fontSize: 14, color: '#d4af37', marginBottom: 8 }}>
            Reputation Change
          </div>
          {pendingRepChange.reason && (
            <div style={{ fontSize: 12, marginBottom: 10, opacity: 0.85 }}>
              {pendingRepChange.reason}
            </div>
          )}
          <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            {pendingRepChange.faction}: <span style={{
              color: pendingRepChange.delta > 0 ? '#44aa44' : '#ff6666'
            }}>
              {pendingRepChange.delta > 0 ? '+' : ''}{pendingRepChange.delta}
            </span>
          </div>
          <button onClick={handleReputationChange} style={{
            width: '100%', padding: '10px 0', background: '#d4af37', color: '#1a1614',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'Cinzel, serif',
            fontSize: 14, fontWeight: 'bold', letterSpacing: 1,
          }}>
            Accept
          </button>
        </div>
      )}

      {/* Quest offer panel */}
      {pendingQuestOffer && !rollResult && (
        <div style={{
          padding: '12px 16px', textAlign: 'left', fontFamily: 'Cinzel, serif',
          background: 'rgba(20,16,12,0.95)', borderTop: '2px solid #d4af37',
          color: '#e8dcc8',
        }}>
          <div style={{ fontSize: 14, color: '#d4af37', marginBottom: 8, textAlign: 'center' }}>
            Quest Offered
          </div>
          <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 6, color: '#d4af37' }}>
            {pendingQuestOffer.title}
          </div>
          {pendingQuestOffer.description && (
            <div style={{ fontSize: 12, marginBottom: 10, opacity: 0.85 }}>
              {pendingQuestOffer.description}
            </div>
          )}
          {pendingQuestOffer.objectives && pendingQuestOffer.objectives.length > 0 && (
            <div style={{ fontSize: 11, marginBottom: 10, opacity: 0.75 }}>
              {pendingQuestOffer.objectives.map((obj, i) => (
                <div key={i}>• {obj}</div>
              ))}
            </div>
          )}
          <button onClick={handleAcceptQuest} style={{
            width: '100%', padding: '10px 0', background: '#d4af37', color: '#1a1614',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'Cinzel, serif',
            fontSize: 13, fontWeight: 'bold', letterSpacing: 1,
          }}>
            Accept Quest
          </button>
        </div>
      )}

      {/* AI-suggested dialogue choices */}
      {suggestions.length > 0 && !disabled && !hardLimited && !pendingRoll && !rollResult && !pendingRepChange && !pendingQuestOffer && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px',
          borderTop: '1px solid rgba(201,168,76,0.2)', background: 'rgba(20,16,12,0.6)',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              disabled={loading}
              style={{
                flex: '1 1 auto', minWidth: 0, padding: '6px 12px',
                background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: 4, color: '#d4af37', cursor: 'pointer',
                fontFamily: 'Cinzel, serif', fontSize: 11, textAlign: 'center',
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(201,168,76,0.25)'; e.target.style.borderColor = 'rgba(201,168,76,0.6)' }}
              onMouseLeave={e => { e.target.style.background = 'rgba(201,168,76,0.1)'; e.target.style.borderColor = 'rgba(201,168,76,0.3)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {!disabled && !hardLimited && !pendingRoll && !rollResult && !pendingRepChange && !pendingQuestOffer && (
        <form onSubmit={handleSubmit} className="npc-conv-input-row">
          <input
            className="npc-conv-input"
            placeholder={`Speak to ${npc.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          {SPEECH_SUPPORTED && (
            <button
              type="button"
              className="npc-conv-send"
              onMouseDown={startPTT}
              onMouseUp={stopPTT}
              onMouseLeave={stopPTT}
              onTouchStart={startPTT}
              onTouchEnd={stopPTT}
              title="Hold to speak"
              style={isRecording ? { background: 'rgba(200,50,50,0.3)', borderColor: 'rgba(200,50,50,0.6)', color: '#e74c3c' } : {}}
            >
              {isRecording ? '🔴' : '🎤'}
            </button>
          )}
          <button type="submit" className="npc-conv-send" disabled={loading}>
            {loading ? '...' : '▶'}
          </button>
        </form>
      )}
      {hardLimited && (
        <div className="npc-conv-limited">The conversation has concluded.</div>
      )}
    </div>
  )
}

/**
 * Inline social skill check prompt — appears inside NPC dialog.
 * Shows skill name, DC, modifier, and a Roll button.
 */
function SocialCheckInline({ skill, dc, reason, modifier, onRoll }) {
  const { bonus, proficient, expertise } = modifier
  return (
    <div style={{
      padding: '12px 16px', textAlign: 'center', fontFamily: 'Cinzel, serif',
      background: 'rgba(20,16,12,0.95)', borderTop: '2px solid #d4af37',
      color: '#e8dcc8',
    }}>
      <div style={{ fontSize: 15, color: '#d4af37', marginBottom: 4 }}>
        {skill} Check
        {expertise && <span style={{ fontSize: 11, color: '#44cc66', marginLeft: 6 }}>(expertise)</span>}
        {proficient && !expertise && <span style={{ fontSize: 11, color: '#88aaff', marginLeft: 6 }}>(proficient)</span>}
      </div>
      {reason && <div style={{ fontSize: 11, marginBottom: 8, opacity: 0.7 }}>{reason}</div>}
      <div style={{ fontSize: 18, marginBottom: 10 }}>
        Modifier: <span style={{ color: '#d4af37' }}>{bonus >= 0 ? '+' : ''}{bonus}</span>
      </div>
      <button onClick={onRoll} style={{
        width: '100%', padding: '10px 0', background: '#d4af37', color: '#1a1614',
        border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'Cinzel, serif',
        fontSize: 15, fontWeight: 'bold', letterSpacing: 1,
      }}>
        Roll d20
      </button>
    </div>
  )
}
