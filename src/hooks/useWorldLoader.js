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

  const worldLoadedRef = useRef(false)

  useEffect(() => {
    if (worldLoadedRef.current) return
    worldLoadedRef.current = true

    const params = new URLSearchParams(window.location.search)

    if (params.has('testarea')) {
      try {
        const testArea = buildTestArea()
        console.log('[GameV2] Test area loaded:', testArea.name, `${testArea.width}x${testArea.height}`, testArea.palette?.length, 'palette entries')
        loadArea(testArea.id || 'test-area', testArea)
        activateArea(testArea.id || 'test-area')
        if (testArea.playerStart) setPlayerPos(testArea.playerStart)
      } catch (e) {
        console.error('[GameV2] Failed to build test area:', e)
      }
      return
    }

    const campaignData = campaign?.campaign_data || campaign
    if (campaignData?.areas || campaignData?.areaBriefs) {
      const areas = campaignData.areas || {}
      const briefs = { ...(campaignData.areaBriefs || {}) }
      const startId = campaignData.startArea

      if (startId && !areas[startId] && briefs[startId]) {
        try {
          areas[startId] = buildAreaFromBrief(briefs[startId], 42)
          delete briefs[startId]
          console.log('[GameV2] Built starting area from brief:', startId)
        } catch (e) {
          console.error('[GameV2] Failed to build starting area:', e)
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

    try {
      const demoArea = buildDemoArea()
      console.log('[GameV2] Demo area built:', demoArea.name || demoArea.id, `${demoArea.width}x${demoArea.height}`)
      loadArea(demoArea.id, demoArea)
      activateArea(demoArea.id)
      if (demoArea.playerStart) setPlayerPos(demoArea.playerStart)
    } catch (e) {
      console.error('[GameV2] Failed to build demo area:', e)
    }
  }, [])
}
