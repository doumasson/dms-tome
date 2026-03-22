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
        worldLoadedRef.current = false
      }
      return
    }

    const campaignData = campaign?.campaign_data || campaign
    const hasRealAreas = (campaignData?.areas && Object.keys(campaignData.areas).length > 0) ||
                         (campaignData?.areaBriefs && Object.keys(campaignData.areaBriefs).length > 0)
    if (hasRealAreas) {
      if (worldLoadedRef.current) return
      worldLoadedRef.current = true
      const areas = { ...(campaignData.areas || {}) }
      const briefs = { ...(campaignData.areaBriefs || {}) }

      // If startArea is undefined, pick the first available brief or area
      let startId = campaignData.startArea
      if (!startId) {
        startId = Object.keys(briefs)[0] || Object.keys(areas)[0]
        console.log('[GameV2] startArea was undefined, using:', startId)
      }

      // Build starting area from brief if not already built
      if (startId && !areas[startId] && briefs[startId]) {
        try {
          areas[startId] = buildAreaFromBrief(briefs[startId], 42)
          delete briefs[startId]
          console.log('[GameV2] Built starting area from brief:', startId)
        } catch (e) {
          console.error('[GameV2] Failed to build starting area from brief:', e)
          // Fall through to demo area below
        }
      }

      // If we have at least one built area, load the world
      if (startId && areas[startId]) {
        loadAreaWorld({
          title: campaignData.title,
          startArea: startId,
          areas,
          areaBriefs: briefs,
          questObjectives: campaignData.questObjectives || [],
        })
        activateArea(startId)
        return
      }

      // Building failed — fall through to demo area
      console.warn('[GameV2] No built areas available, falling back to demo area')
      worldLoadedRef.current = false
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
      worldLoadedRef.current = false
    }
  }, [campaign])
}
