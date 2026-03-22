import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { buildTestArea } from '../data/testArea.js'
import { buildDemoArea, getDemoBriefs } from '../data/demoArea.js'
import { buildAreaFromBrief } from '../lib/areaBuilder.js'
import { safeguardSpawn } from '../lib/gridUtils.js'

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
        if (testArea.playerStart) {
          const safePos = safeguardSpawn(testArea.playerStart, testArea.enemies, testArea)
          setPlayerPos(safePos)
        }
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
        // Set player position from built area
        const builtArea = areas[startId]
        if (builtArea.playerStart) {
          const safePos = safeguardSpawn(builtArea.playerStart, builtArea.enemies || [], builtArea)
          setPlayerPos(safePos)
        }
        return
      }

      // Building failed — fall through to demo area
      console.warn('[GameV2] No built areas available after brief building, falling back to demo area')
      worldLoadedRef.current = false
    }

    // If we have campaign areaBriefs but startArea wasn't in them, try building the first available brief
    if (!worldLoadedRef.current && campaignData?.areaBriefs) {
      const briefKeys = Object.keys(campaignData.areaBriefs)
      if (briefKeys.length > 0) {
        worldLoadedRef.current = true
        const firstKey = briefKeys[0]
        try {
          const area = buildAreaFromBrief(campaignData.areaBriefs[firstKey], 42)
          const remainingBriefs = { ...campaignData.areaBriefs }
          delete remainingBriefs[firstKey]
          console.log('[GameV2] Built fallback area from first brief:', firstKey)
          loadAreaWorld({
            title: campaignData.title || 'Campaign',
            startArea: firstKey,
            areas: { [firstKey]: area },
            areaBriefs: remainingBriefs,
            questObjectives: campaignData.questObjectives || [],
          })
          activateArea(firstKey)
          if (area.playerStart) {
            setPlayerPos(safeguardSpawn(area.playerStart, area.enemies, area))
          }
          return
        } catch (e) {
          console.error('[GameV2] Fallback brief building also failed:', e)
          worldLoadedRef.current = false
        }
      }
    }

    // No campaign areas — fall back to demo mini-campaign
    if (worldLoadedRef.current) return
    worldLoadedRef.current = true
    try {
      const demoArea = buildDemoArea()
      const demoBriefs = getDemoBriefs()
      delete demoBriefs['area-village'] // already built
      console.log('[GameV2] Demo world loaded:', demoArea.name || demoArea.id, `${demoArea.width}x${demoArea.height}`, Object.keys(demoBriefs).length, 'additional area briefs')

      loadAreaWorld({
        title: 'Whispers in Millhaven',
        startArea: 'area-village',
        areas: { 'area-village': demoArea },
        areaBriefs: demoBriefs,
        questObjectives: [
          { id: 'investigate', text: 'Investigate the goblin activity in Darkwood Forest', completed: false },
          { id: 'ruins', text: 'Explore the Sunken Ruins', completed: false },
        ],
      })
      activateArea('area-village')
      if (demoArea.playerStart) {
        const safePos = safeguardSpawn(demoArea.playerStart, demoArea.enemies, demoArea)
        setPlayerPos(safePos)
      }
    } catch (e) {
      console.error('[GameV2] Failed to build demo area:', e)
      addNarratorMessage?.({ role: 'dm', speaker: 'DM', text: 'The world shimmers... (area loading failed, retrying)' })
      worldLoadedRef.current = false
    }
  }, [campaign])
}
