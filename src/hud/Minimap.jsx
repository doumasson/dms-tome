import { useEffect, useRef, useCallback } from 'react'
import useStore from '../store/useStore'
import { decodeExploredBitfield } from '../lib/visionCalculator'

const W = 160
const H = 120
const TILE_PX = 2

// Map a tile-space color string to a simplified RGB for the minimap
function simplifyColor(tileId) {
  if (!tileId) return null
  const id = tileId.toLowerCase()
  if (id.includes('grass') || id.includes('dirt') || id.includes('path')) return '#3a3020'
  if (id.includes('stone') || id.includes('floor') || id.includes('cobble')) return '#2a2838'
  if (id.includes('sand') || id.includes('desert')) return '#3a3020'
  if (id.includes('water') || id.includes('river') || id.includes('lake')) return '#1a2a3a'
  if (id.includes('wood') || id.includes('plank')) return '#2a1e14'
  if (id.includes('wall') || id.includes('brick')) return '#1a1520'
  return '#282030'
}

export default function Minimap({ playerPos, tokens, cameraRef }) {
  const canvasRef = useRef(null)
  const zone = useStore(s => s.areas[s.currentAreaId])
  const currentAreaId = useStore(s => s.currentAreaId)
  const fogBitfields = useStore(s => s.fogBitfields)
  const inCombat = useStore(s => s.encounter.phase === 'combat')

  // Decode explored set from bitfield
  const exploredSetRef = useRef(new Set())
  useEffect(() => {
    if (!currentAreaId || !fogBitfields?.[currentAreaId] || !zone?.width || !zone?.height) {
      exploredSetRef.current = new Set()
      return
    }
    const decoded = decodeExploredBitfield(fogBitfields[currentAreaId], zone.width, zone.height)
    exploredSetRef.current = decoded || new Set()
  }, [fogBitfields, currentAreaId, zone?.width, zone?.height])

  // Draw minimap on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !zone) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const mapW = zone.width || 40
    const mapH = zone.height || 30

    // Scale tiles to fit canvas
    const scaleX = W / mapW
    const scaleY = H / mapH
    const tileW = Math.max(1, Math.floor(scaleX))
    const tileH = Math.max(1, Math.floor(scaleY))

    const floor = zone.layers?.floor
    const explored = exploredSetRef.current
    const useFog = Boolean(zone.useCamera || zone.palette)

    // Draw floor tiles
    if (floor) {
      for (let ty = 0; ty < mapH; ty++) {
        for (let tx = 0; tx < mapW; tx++) {
          const idx = ty * mapW + tx
          const tileId = Array.isArray(floor) ? floor[idx] : null
          const px = Math.floor(tx * scaleX)
          const py = Math.floor(ty * scaleY)

          if (useFog && !explored.has(idx)) {
            // Unexplored — black
            ctx.fillStyle = '#000000'
          } else if (useFog && explored.has(idx)) {
            // Explored but not currently visible — dark grey
            ctx.fillStyle = simplifyColor(tileId) || '#1e1a28'
          } else {
            // No fog — show simplified tile color
            ctx.fillStyle = simplifyColor(tileId) || '#1e1a28'
          }
          ctx.fillRect(px, py, tileW, tileH)
        }
      }
    } else {
      // No layer data — fill with dark background
      ctx.fillStyle = '#0a0810'
      ctx.fillRect(0, 0, W, H)
    }

    // Draw tokens
    if (tokens) {
      for (const token of tokens) {
        if (token.x == null || token.y == null) continue
        const px = Math.floor(token.x * scaleX + scaleX / 2)
        const py = Math.floor(token.y * scaleY + scaleY / 2)

        if (token.id === 'player') {
          // Player — bright gold, 3px dot
          ctx.fillStyle = '#d4af37'
          ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI * 2)
          ctx.fill()
        } else if (token.isEnemy && inCombat) {
          // Enemy — red dot (combat only)
          ctx.fillStyle = '#ff3333'
          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (token.isNpc) {
          // NPC — blue dot
          ctx.fillStyle = '#4499dd'
          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }, [zone, playerPos, tokens, inCombat, fogBitfields, currentAreaId])

  // Click-to-pan: convert minimap click to tile coords and call camera.centerOn()
  const handleClick = useCallback((e) => {
    if (!zone || !cameraRef?.current) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const mapW = zone.width || 40
    const mapH = zone.height || 30
    const tileX = Math.floor((cx / W) * mapW)
    const tileY = Math.floor((cy / H) * mapH)
    const tileSize = zone.tileSize || 200

    cameraRef.current.centerOn(tileX, tileY, tileSize)
  }, [zone, cameraRef])

  if (!zone) return null

  return (
    <div className="hud-minimap metal-frame" style={{ pointerEvents: 'auto' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleClick}
        style={{ display: 'block', cursor: 'crosshair' }}
        title="Click to pan camera"
      />
    </div>
  )
}
