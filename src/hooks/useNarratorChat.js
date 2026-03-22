import { useCallback, useRef } from 'react'
import useStore from '../store/useStore'
import { broadcastNarratorMessage } from '../lib/liveChannel'
import { buildSystemPrompt, callNarrator } from '../lib/narratorApi'

/**
 * Handles narrator chat — sends player messages to the AI DM,
 * processes responses (narrative, skill checks, combat triggers).
 */
export function useNarratorChat({ sessionApiKey, myCharacter, user, campaign, partyMembers, zone, addNarratorMessage, playerPosRef }) {
  const chatInFlightRef = useRef(false)

  const handleChat = useCallback(async (text) => {
    if (!text.trim()) return
    if (chatInFlightRef.current) return
    const apiKey = sessionApiKey
    if (!apiKey) {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'No API key set. Go to Settings to add your Claude API key.' })
      return
    }

    chatInFlightRef.current = true
    const playerMsg = { role: 'player', speaker: myCharacter?.name || user?.email || 'Player', text: text.trim() }
    addNarratorMessage(playerMsg)
    broadcastNarratorMessage(playerMsg)

    try {
      const history = useStore.getState().narrator?.history || []
      const recentMessages = history.slice(-14).map(m => ({
        role: m.role === 'dm' ? 'assistant' : 'user',
        content: m.text,
      }))

      const sceneWithPos = { ...zone, playerPosition: playerPosRef.current }
      const systemPrompt = buildSystemPrompt(campaign, partyMembers, sceneWithPos, recentMessages.length, useStore.getState().gameTime, useStore.getState().quests)

      const result = await callNarrator({ messages: recentMessages, systemPrompt, apiKey })

      if (result?.narrative) {
        const dmMsg = { role: 'dm', speaker: 'DM', text: result.narrative, startCombat: !!result?.startCombat }
        addNarratorMessage(dmMsg)
        broadcastNarratorMessage(dmMsg)
      }

      if (result?.rollRequest) {
        const { setPendingSkillCheck } = useStore.getState()
        setPendingSkillCheck(result.rollRequest)
      }

      // Handle combat start/avoid based on DM's response
      if (result?.startCombat) {
        const { pendingEncounterData, clearPendingEncounterData } = useStore.getState()
        if (pendingEncounterData?.startCombatWithZoneEnemies) {
          // Encounter zone triggered earlier, DM now confirms combat — use zone enemies
          clearPendingEncounterData()
          useStore.getState().setEncounterLock(false)
          pendingEncounterData.startCombatWithZoneEnemies()
        } else if (result?.enemies?.length) {
          // DM-initiated combat from conversation (no encounter zone)
          const { startEncounter: se } = useStore.getState()
          const enemies = result.enemies.map(e => ({
            ...e, isEnemy: true, type: 'enemy',
            position: e.position || { x: Math.floor(Math.random() * (zone?.width || 10)), y: Math.floor(Math.random() * (zone?.height || 8)) },
          }))
          se(enemies)
        }
      }
      // Note: pendingEncounterData is NOT cleared on normal DM responses.
      // It persists until: startCombat triggers it, player leaves area, or
      // area transition clears it. The DM offering choices ("what do you do?")
      // must not destroy the pending combat data.
    } catch (err) {
      console.error('[GameV2] Narrator error:', err)
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'The DM is momentarily distracted... (API error)' })
    } finally {
      chatInFlightRef.current = false
    }
  }, [sessionApiKey, myCharacter, user, campaign, partyMembers, zone, addNarratorMessage])

  /**
   * Trigger the AI DM to respond based on the current conversation history,
   * without adding a new visible player message. Used for skill check follow-ups
   * where the result is already in the chat history from SkillCheckPanel.
   */
  const triggerDmFollowUp = useCallback(async () => {
    if (chatInFlightRef.current) return
    const apiKey = sessionApiKey
    if (!apiKey) return

    chatInFlightRef.current = true
    try {
      const history = useStore.getState().narrator?.history || []
      const recentMessages = history.slice(-14).map(m => ({
        role: m.role === 'dm' ? 'assistant' : 'user',
        content: m.text,
      }))

      const sceneWithPos = { ...zone, playerPosition: playerPosRef.current }
      const systemPrompt = buildSystemPrompt(campaign, partyMembers, sceneWithPos, recentMessages.length, useStore.getState().gameTime, useStore.getState().quests)

      const result = await callNarrator({ messages: recentMessages, systemPrompt, apiKey })

      if (result?.narrative) {
        const dmMsg = { role: 'dm', speaker: 'DM', text: result.narrative, startCombat: !!result?.startCombat }
        addNarratorMessage(dmMsg)
        broadcastNarratorMessage(dmMsg)
      }

      if (result?.rollRequest) {
        const { setPendingSkillCheck } = useStore.getState()
        setPendingSkillCheck(result.rollRequest)
      }

      if (result?.startCombat) {
        const { pendingEncounterData, clearPendingEncounterData } = useStore.getState()
        if (pendingEncounterData?.startCombatWithZoneEnemies) {
          clearPendingEncounterData()
          useStore.getState().setEncounterLock(false)
          pendingEncounterData.startCombatWithZoneEnemies()
        } else if (result?.enemies?.length) {
          const { startEncounter: se } = useStore.getState()
          const enemies = result.enemies.map(e => ({
            ...e, isEnemy: true, type: 'enemy',
            position: e.position || { x: Math.floor(Math.random() * (zone?.width || 10)), y: Math.floor(Math.random() * (zone?.height || 8)) },
          }))
          se(enemies)
        }
      }

      return result
    } catch (err) {
      console.error('[GameV2] Narrator follow-up error:', err)
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'The DM is momentarily distracted... (API error)' })
    } finally {
      chatInFlightRef.current = false
    }
  }, [sessionApiKey, campaign, partyMembers, zone, addNarratorMessage])

  return { handleChat, triggerDmFollowUp }
}
