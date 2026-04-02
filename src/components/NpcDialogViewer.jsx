import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { speak, getNpcVoice } from '../lib/tts'

/**
 * Read-only NPC dialog viewer — shown to non-initiator players
 * when another player is talking to an NPC.
 * Displays the conversation in real-time but no input allowed.
 */
export default function NpcDialogViewer() {
  const viewer = useStore(s => s.npcDialogViewer)
  const npcBusy = useStore(s => s.npcBusy)
  const scrollRef = useRef(null)

  const lastMsgCountRef = useRef(0)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    // TTS: speak new NPC messages for non-initiator players
    const msgs = viewer?.messages || []
    if (msgs.length > lastMsgCountRef.current) {
      const newMsgs = msgs.slice(lastMsgCountRef.current)
      for (const msg of newMsgs) {
        if (msg.role === 'npc' && msg.text) {
          const voiceCfg = getNpcVoice(msg.speaker || viewer?.npcName, msg.disposition, viewer?.npcGender)
          speak(msg.text, null, { npcName: msg.speaker || viewer?.npcName, voice: voiceCfg })
        }
      }
    }
    lastMsgCountRef.current = msgs.length
  }, [viewer?.messages?.length])

  if (!viewer) return null

  const { npcName, messages } = viewer
  const speakerName = npcBusy?.playerName || 'Someone'

  return (
    <div className="npc-dialog-overlay" style={{ pointerEvents: 'none' }}>
      <div className="npc-dialog" style={{ pointerEvents: 'auto', opacity: 0.95 }}>
        <svg className="npc-dialog-corner npc-dialog-corner-tl" width="40" height="40" viewBox="0 0 40 40">
          <path d="M0,14 L0,4 Q0,0 4,0 L14,0" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5"/>
        </svg>
        <svg className="npc-dialog-corner npc-dialog-corner-tr" width="40" height="40" viewBox="0 0 40 40">
          <path d="M26,0 L36,0 Q40,0 40,4 L40,14" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5"/>
        </svg>
        <svg className="npc-dialog-corner npc-dialog-corner-bl" width="40" height="40" viewBox="0 0 40 40">
          <path d="M0,26 L0,36 Q0,40 4,40 L14,40" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5"/>
        </svg>
        <svg className="npc-dialog-corner npc-dialog-corner-br" width="40" height="40" viewBox="0 0 40 40">
          <path d="M26,40 L36,40 Q40,40 40,36 L40,26" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5"/>
        </svg>

        <div className="npc-dialog-header">
          <span className="npc-dialog-name">◆ {npcName}</span>
          <span className="npc-dialog-role" style={{ fontSize: 10, opacity: 0.6 }}> — {speakerName} is speaking</span>
        </div>

        <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none" className="npc-dialog-divider">
          <path d="M0,4 L150,4 Q175,0 200,4 Q225,8 250,4 L400,4" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>

        <div className="npc-conv">
          <div className="npc-conv-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="npc-conv-msg npc-conv-npc">
                <span className="npc-conv-speaker">{npcName}</span>
                <span className="npc-conv-text npc-conv-loading">...</span>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`npc-conv-msg npc-conv-${msg.role}`}>
                {msg.speaker && (
                  <span className="npc-conv-speaker">{msg.speaker}</span>
                )}
                <span className="npc-conv-text">{msg.text}</span>
              </div>
            ))}
          </div>
          <div style={{
            padding: '8px 12px',
            textAlign: 'center',
            fontSize: 11,
            color: '#8a7a5a',
            fontFamily: "'Cinzel', serif",
            borderTop: '1px solid rgba(201,168,76,0.15)',
          }}>
            {speakerName} is leading this conversation
          </div>
        </div>
      </div>
    </div>
  )
}
