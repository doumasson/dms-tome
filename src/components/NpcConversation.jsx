import { useState, useRef, useEffect, useCallback } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const SPEECH_SUPPORTED = !!SpeechRecognition
import { callNarrator, buildNpcSystemPrompt } from '../lib/narratorApi'
import useStore from '../store/useStore'

/**
 * Shared conversation component for NPC dialog and story cutscene.
 * Handles: message display, text input, AI calls, prompt counting.
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
  }, [messages.length])

  useEffect(() => {
    onPromptCount?.(promptCount)
  }, [promptCount, onPromptCount])

  async function handleSend(text) {
    const trimmed = (text || input).trim()
    if (!trimmed || loading || disabled || hardLimited) return

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
    setMessages(prev => [...prev, playerMsg])
    setInput('')
    setLoading(true)

    const newCount = promptCount + 1
    setPromptCount(newCount)

    try {
      const systemPrompt = buildNpcSystemPrompt(npc, campaign, storyFlags, newCount, isCritical)
      const history = [...messages, playerMsg].map(m => ({
        role: m.role === 'npc' ? 'assistant' : 'user',
        content: m.text,
      }))

      const result = await callNarrator({
        messages: history,
        systemPrompt,
        apiKey,
      })

      const dialogue = result?.narrative || '...'

      setMessages(prev => [...prev, { role: 'npc', speaker: npc.name, text: dialogue }])

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

      {!disabled && !hardLimited && (
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
