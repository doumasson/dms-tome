/**
 * WorldMap — BG2-style parchment world map showing discovered locations.
 * Players see visited and available areas arranged in a circular layout
 * with connection lines between adjacent areas.
 */
import { useMemo } from 'react'
import useStore from '../store/useStore'
import ModeScreen from './ModeScreen'
import './WorldMap.css'

export default function WorldMap({ open, onClose }) {
  const currentAreaId = useStore(s => s.currentAreaId)
  const areas = useStore(s => s.areas)
  const areaBriefs = useStore(s => s.areaBriefs)
  const campaign = useStore(s => s.campaign)

  // Build location nodes from built areas + unbuilt area briefs
  const locations = useMemo(() => {
    const locs = []
    const allIds = new Set([
      ...Object.keys(areas || {}),
      ...Object.keys(areaBriefs || {}),
    ])

    if (allIds.size === 0) return locs

    const idArray = [...allIds]
    idArray.forEach((id, i) => {
      const builtArea = areas?.[id]
      const brief = areaBriefs?.[id]
      const source = builtArea || brief || {}
      const visited = !!builtArea
      const isCurrent = id === currentAreaId

      // Arrange in a rough circular layout
      const angle = (i / idArray.length) * Math.PI * 2 - Math.PI / 2
      const radius = idArray.length <= 1 ? 0 : 30
      const cx = 50 + Math.cos(angle) * radius
      const cy = 50 + Math.sin(angle) * radius

      locs.push({
        id,
        name: source.name || source.title || id,
        type: source.type || source.theme || 'unknown',
        visited,
        isCurrent,
        x: cx,
        y: cy,
        exits: builtArea?.exits || brief?.exits || [],
      })
    })
    return locs
  }, [areaBriefs, areas, currentAreaId])

  const campaignTitle = campaign?.title || 'Unknown Realm'

  return (
    <ModeScreen open={open} onClose={onClose} title="World Map">
      <div className="world-map-container">
        {/* Parchment background */}
        <div className="world-map-parchment">
          {/* Campaign title */}
          <div className="world-map-title">{campaignTitle}</div>

          {locations.length === 0 ? (
            <div className="world-map-empty">No areas discovered</div>
          ) : (
            <>
              {/* Connection lines between adjacent areas */}
              <svg className="world-map-connections" viewBox="0 0 100 100"
                preserveAspectRatio="none">
                {locations.map((loc) => {
                  const exits = loc.exits || []
                  return exits.map((exit, j) => {
                    const targetId = exit.targetArea || exit.targetZone
                    const target = locations.find(l => l.id === targetId)
                    if (!target) return null
                    return (
                      <line key={`${loc.id}-${j}`}
                        x1={loc.x} y1={loc.y}
                        x2={target.x} y2={target.y}
                        className="world-map-line"
                        strokeDasharray={loc.visited && target.visited ? 'none' : '1,1'}
                      />
                    )
                  })
                })}
              </svg>

              {/* Location nodes */}
              {locations.map(loc => (
                <div key={loc.id}
                  className={`world-map-location${loc.visited ? ' visited' : ' unvisited'}${loc.isCurrent ? ' current' : ''}`}
                  style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                >
                  <div className="world-map-icon">
                    {getLocationIcon(loc.type)}
                  </div>
                  <div className="world-map-label">{loc.name}</div>
                  {loc.isCurrent && <div className="world-map-you-marker">YOU</div>}
                </div>
              ))}
            </>
          )}

          {/* Compass rose */}
          <div className="world-map-compass">
            <div className="compass-n">N</div>
            <div className="compass-body">{'\u2726'}</div>
          </div>
        </div>
      </div>
    </ModeScreen>
  )
}

function getLocationIcon(type) {
  const icons = {
    village: '\uD83C\uDFD8',
    town: '\uD83C\uDFF0',
    dungeon: '\u2694',
    cave: '\uD83D\uDD73',
    forest: '\uD83C\uDF32',
    tavern: '\uD83C\uDF7A',
    temple: '\u26EA',
    shop: '\uD83D\uDED2',
    crypt: '\uD83D\uDC80',
    sewer: '\uD83D\uDD78',
  }
  return icons[type] || '\uD83D\uDCCD'
}
