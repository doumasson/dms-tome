import { useEffect } from 'react'
import NpcConversation from './NpcConversation'
import { resolveHint } from '../lib/interactionController'
import { broadcastNpcDialogStart, broadcastNpcDialogEnd } from '../lib/liveChannel'
import useStore from '../store/useStore'

export default function NpcDialog({ npc, onClose }) {
  const user = useStore(s => s.user)
  const myCharacter = useStore(s => s.myCharacter)
  const storyFlags = useStore(s => s.storyFlags)

  const hint = resolveHint(npc, storyFlags)

  useEffect(() => {
    const playerName = myCharacter?.name || user?.email || 'Someone'
    broadcastNpcDialogStart(npc.name, user?.id, playerName, npc.gender)
    useStore.getState().setNpcBusy({ npcName: npc.name, playerId: user?.id, playerName })
    return () => {
      broadcastNpcDialogEnd(npc.name)
      useStore.getState().clearNpcBusy()
    }
  }, [npc.name, user?.id, myCharacter?.name, user?.email])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          if (e.key === 'Escape') onClose()
          return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="npc-dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="npc-dialog">
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
          <span className="npc-dialog-name">◆ {npc.name}</span>
          <span className="npc-dialog-role"> — {npc.role}</span>
          <button className="npc-dialog-close" onClick={onClose}>✕</button>
        </div>

        <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none" className="npc-dialog-divider">
          <path d="M0,4 L150,4 Q175,0 200,4 Q225,8 250,4 L400,4" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>

        <NpcConversation npc={npc} isCritical={false} initialMessage={hint} onClose={onClose} />
      </div>
    </div>
  )
}
