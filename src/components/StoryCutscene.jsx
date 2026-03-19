import { useEffect, useCallback } from 'react'
import NpcConversation from './NpcConversation'
import { broadcastStoryCutsceneStart, broadcastStoryCutsceneEnd, broadcastStoryFlag, broadcastJournalEntry } from '../lib/liveChannel'
import useStore from '../store/useStore'

const MAX_CRITICAL_PROMPTS = 10

export default function StoryCutscene({ npc, pixiRef, onClose, isWatching }) {
  const user = useStore(s => s.user)
  const myCharacter = useStore(s => s.myCharacter)
  const addStoryFlag = useStore(s => s.addStoryFlag)
  const addJournalEntry = useStore(s => s.addJournalEntry)

  useEffect(() => {
    if (!isWatching) {
      broadcastStoryCutsceneStart(npc.name, user?.id, npc.criticalInfo)
      useStore.getState().setActiveCutscene({ npcName: npc.name, initiatorId: user?.id })
    }
  }, [npc.name, npc.criticalInfo, user?.id, isWatching])

  const handleDone = useCallback(() => {
    if (!isWatching) {
      if (npc.criticalFlag) {
        addStoryFlag(npc.criticalFlag)
        broadcastStoryFlag(npc.criticalFlag)
      }
      const entry = {
        type: 'critical',
        npcName: npc.name,
        zoneName: useStore.getState().zones?.[useStore.getState().currentZoneId]?.name || 'Unknown',
        text: npc.criticalInfo,
        flag: npc.criticalFlag,
      }
      addJournalEntry(entry)
      broadcastJournalEntry(entry)
      broadcastStoryCutsceneEnd(npc.name, npc.criticalFlag)
      useStore.getState().clearActiveCutscene()
    }
    onClose()
  }, [npc, isWatching, addStoryFlag, addJournalEntry, onClose])

  const playerName = myCharacter?.name || 'Adventurer'
  const playerClass = myCharacter?.class || 'Hero'

  return (
    <div className="story-cutscene-overlay">
      <div className="story-cutscene">
        {/* Corner filigree — double layer */}
        <svg className="story-corner story-corner-tl" width="80" height="80" viewBox="0 0 80 80">
          <path d="M0,28 L0,8 Q0,0 8,0 L28,0" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
          <path d="M0,20 L0,5 Q0,0 5,0 L20,0" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>
        <svg className="story-corner story-corner-tr" width="80" height="80" viewBox="0 0 80 80">
          <path d="M52,0 L72,0 Q80,0 80,8 L80,28" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
          <path d="M60,0 L75,0 Q80,0 80,5 L80,20" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>
        <svg className="story-corner story-corner-bl" width="80" height="80" viewBox="0 0 80 80">
          <path d="M0,52 L0,72 Q0,80 8,80 L28,80" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
        </svg>
        <svg className="story-corner story-corner-br" width="80" height="80" viewBox="0 0 80 80">
          <path d="M52,80 L72,80 Q80,80 80,72 L80,52" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
        </svg>

        <div className="story-header">
          <svg width="240" height="12" viewBox="0 0 240 12" className="story-header-divider">
            <path d="M0,6 L80,6 Q100,0 120,6 Q140,12 160,6 L240,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.4"/>
            <circle cx="120" cy="6" r="3" fill="#c9a84c" opacity="0.3"/>
          </svg>
          <h1 className="story-title">A Moment of Fate</h1>
          <svg width="240" height="12" viewBox="0 0 240 12" className="story-header-divider">
            <path d="M0,6 L80,6 Q100,12 120,6 Q140,0 160,6 L240,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.4"/>
            <circle cx="120" cy="6" r="3" fill="#c9a84c" opacity="0.3"/>
          </svg>
        </div>

        <div className="story-silhouettes">
          <div className="story-silhouette">
            <div className="story-silhouette-figure story-silhouette-npc" />
            <span className="story-silhouette-name">{npc.name}</span>
            <span className="story-silhouette-role">{npc.role}</span>
          </div>
          <div className="story-silhouette">
            <div className="story-silhouette-figure story-silhouette-player" />
            <span className="story-silhouette-name">{playerName}</span>
            <span className="story-silhouette-role">{playerClass}</span>
          </div>
        </div>

        <NpcConversation
          npc={npc}
          isCritical={true}
          initialMessage={npc.criticalInfo}
          maxPrompts={MAX_CRITICAL_PROMPTS}
          disabled={isWatching}
          onClose={handleDone}
        />

        {!isWatching && (
          <button className="story-done-btn" onClick={handleDone}>Done</button>
        )}
        {isWatching && (
          <div className="story-watching">Watching — {myCharacter?.name || 'a party member'} is speaking</div>
        )}
      </div>
    </div>
  )
}
