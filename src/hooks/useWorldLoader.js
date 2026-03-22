import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { buildTestArea } from '../data/testArea.js'
import { buildDemoArea } from '../data/demoArea.js'
import { buildAreaFromBrief } from '../lib/areaBuilder.js'

/**
 * Loads the area world on mount — test area, campaign areas, or demo fallback.
 */
export function useWorldLoader({ campaign, setPlayerPos }) {
  const loadArea = useStore(s => s.loadArea)
  const loadAreaWorld = useStore(s => s.loadAreaWorld)
  const activateArea = useStore(s => s.activateArea)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)

  const worldLoadedRef = useRef(false)
  const currentAreaId = useStore(s => s.currentAreaId)

  useEffect(() => {
    // Already loaded an area — don't re-run
    if (worldLoadedRef.current && currentAreaId) return

    const params = new URLSearchParams(window.location.search)
    const pendingTestArea = localStorage.getItem('pendingTestArea')

    if (params.has('testarea') || pendingTestArea) {
      if (worldLoadedRef.current) return
      worldLoadedRef.current = true
      localStorage.removeItem('pendingTestArea')
      try {
        const testArea = buildTestArea()
        console.log('[GameV2] Test area loaded:', testArea.name, `${testArea.width}x${testArea.height}`, testArea.palette?.length, 'palette entries')
        loadArea(testArea.id || 'test-area', testArea)
        activateArea(testArea.id || 'test-area')
        if (testArea.playerStart) setPlayerPos(testArea.playerStart)
      } catch (e) {
        console.error('[GameV2] Failed to build test area:', e)
        addNarratorMessage?.({ role: 'dm', speaker: 'DM', text: 'The world shimmers... (area loading failed, retrying)' })
        worldLoadedRef.current = false // allow retry
      }
      return
    }

    const campaignData = campaign?.campaign_data || campaign
    const hasRealAreas = (campaignData?.areas && Object.keys(campaignData.areas).length > 0) ||
                         (campaignData?.areaBriefs && Object.keys(campaignData.areaBriefs).length > 0)
    if (hasRealAreas) {
      if (worldLoadedRef.current) return
      worldLoadedRef.current = true
      const areas = campaignData.areas || {}
      const briefs = { ...(campaignData.areaBriefs || {}) }
      let startId = campaignData.startArea

      // If startArea is missing, pick the first available brief or area
      if (!startId) {
        const briefKeys = Object.keys(briefs)
        const areaKeys = Object.keys(areas)
        startId = areaKeys[0] || briefKeys[0]
        console.log('[GameV2] No startArea defined, using first available:', startId)
      }

      // Build starting area from brief if not already built
      if (startId && !areas[startId] && briefs[startId]) {
        try {
          areas[startId] = buildAreaFromBrief(briefs[startId], 42)
          delete briefs[startId]
          console.log('[GameV2] Built starting area from brief:', startId)
        } catch (e) {
          console.error('[GameV2] Failed to build starting area:', e)
          addNarratorMessage?.({ role: 'dm', speaker: 'DM', text: 'The world shimmers... (area loading failed, retrying)' })
          worldLoadedRef.current = false
        }
      }

      loadAreaWorld({
        title: campaignData.title,
        startArea: startId,
        areas,
        areaBriefs: briefs,
        questObjectives: campaignData.questObjectives || [],
      })
      return
    }

    // No campaign areas — fall back to demo area
    if (worldLoadedRef.current) return
    worldLoadedRef.current = true
    try {
      const demoArea = buildDemoArea()
      console.log('[GameV2] Demo area built:', demoArea.name || demoArea.id, `${demoArea.width}x${demoArea.height}`)
      loadArea(demoArea.id, demoArea)
      activateArea(demoArea.id)
      if (demoArea.playerStart) setPlayerPos(demoArea.playerStart)
    } catch (e) {
      console.error('[GameV2] Failed to build demo area:', e)
      addNarratorMessage?.({ role: 'dm', speaker: 'DM', text: 'The world shimmers... (area loading failed, retrying)' })
      worldLoadedRef.current = false // allow retry
    }
  }, [campaign])
}
