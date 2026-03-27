import { useState, useCallback } from 'react'
import useStore from '../store/useStore'
import { generateCampaignJSON } from '../lib/claudeApi'
import { buildAreaWorld, buildStorySoFarPrompt, generateContinuationPrompt } from '../lib/campaignGenerator'
import { broadcastNarratorMessage } from '../lib/liveChannel'
import { v4 as uuidv4 } from 'uuid'

export function useChapterContinuation() {
  const [continuing, setContinuing] = useState(false)

  const handleChapterContinue = useCallback(async () => {
    setContinuing(true)
    const state = useStore.getState()
    const { campaign, narrator, sessionApiKey } = state

    try {
      const apiKey = sessionApiKey
      if (!apiKey) {
        console.error('[chapterContinue] No API key available')
        setContinuing(false)
        return
      }

      // Generate story summary using the current API key
      const sessionLog = narrator?.history || []
      const summaryPrompt = buildStorySoFarPrompt(campaign, sessionLog)
      let storySoFar
      try {
        const summaryResponse = await generateCampaignJSON(summaryPrompt, apiKey)
        storySoFar = typeof summaryResponse === 'string' ? summaryResponse : JSON.stringify(summaryResponse)
      } catch (e) {
        console.warn('[chapterContinue] Summary generation failed, using fallback')
        storySoFar = `Chapter ${campaign.chapter || 1} of ${campaign.title} has concluded.`
      }

      // Generate next chapter
      const nextChapter = (campaign.chapter || 1) + 1
      const contPrompt = generateContinuationPrompt(
        campaign.tone || 'Heroic Fantasy',
        campaign.setting || 'Medieval Kingdom',
        nextChapter,
        storySoFar,
        campaign.questObjectives,
        campaign.factions,
      )

      const rawText = await generateCampaignJSON(contPrompt, apiKey)
      // Clean JSON response
      let cleaned = rawText
      if (typeof cleaned === 'string') {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```/g, '').trim()
        const firstBrace = cleaned.indexOf('{')
        if (firstBrace > 0) cleaned = cleaned.slice(firstBrace)
        const lastBrace = cleaned.lastIndexOf('}')
        if (lastBrace !== -1) cleaned = cleaned.slice(0, lastBrace + 1)
      }
      const parsed = typeof cleaned === 'object' ? cleaned : JSON.parse(cleaned)
      const newWorld = buildAreaWorld({ ...parsed, chapter: nextChapter })

      // Merge new areas/briefs into existing campaign
      useStore.setState((s) => ({
        campaign: {
          ...s.campaign,
          chapter: nextChapter,
          areas: { ...s.campaign.areas, ...newWorld.areas },
          areaBriefs: { ...s.campaign.areaBriefs, ...newWorld.areaBriefs },
          questObjectives: [
            ...(s.campaign.questObjectives || []),
            ...(newWorld.questObjectives || []).filter(q =>
              !(s.campaign.questObjectives || []).some(eq => eq.id === q.id)
            ),
          ],
          chapterMilestone: newWorld.chapterMilestone,
          storyMilestones: [...(s.campaign.storyMilestones || []), ...(newWorld.storyMilestones || [])],
        },
        chapterMilestoneReached: false,
      }))

      // Transition to new chapter start area
      if (newWorld.startArea) {
        const { activateArea } = useStore.getState()
        if (activateArea) activateArea(newWorld.startArea)
      }

      // Announce
      const msg = {
        role: 'dm',
        speaker: 'The Narrator',
        text: `Chapter ${nextChapter} begins! The adventure continues...`,
        id: uuidv4(),
        timestamp: Date.now(),
      }
      useStore.getState().addNarratorMessage?.(msg)
      broadcastNarratorMessage(msg)

      useStore.getState().saveCampaignToSupabase?.()
    } catch (err) {
      console.error('[chapterContinue] Error:', err)
      const msg = {
        role: 'dm',
        speaker: 'The Narrator',
        text: 'Failed to generate the next chapter. Try again later.',
        id: uuidv4(),
        timestamp: Date.now(),
      }
      useStore.getState().addNarratorMessage?.(msg)
    }

    setContinuing(false)
  }, [])

  const handleEndSession = useCallback(() => {
    useStore.getState().saveCampaignToSupabase?.()
    useStore.getState().saveSessionStateToSupabase?.()
    useStore.setState({ chapterMilestoneReached: false })
  }, [])

  return { continuing, handleChapterContinue, handleEndSession }
}
