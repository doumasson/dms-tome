/**
 * SpellTargetingOverlay — renders AoE targeting previews directly in PixiJS.
 *
 * Cone spells: origin at caster, rotates with mouse angle
 * Sphere spells: circle follows mouse on tile grid
 * Line spells: line from caster toward mouse
 *
 * All highlight affected tiles in real-time. Click confirms. Escape cancels.
 */

import * as PIXI from 'pixi.js'

// State
let _active = false
let _ready = false  // becomes true after first mouse move (prevents instant-confirm from spell picker click)
let _spell = null
let _casterPos = null  // tile coords {x, y}
let _mouseWorldPos = null  // world pixel coords
let _previewGraphics = null  // PIXI.Graphics for the preview
let _tileSize = 200
let _onConfirm = null  // callback({position, affectedTiles})
let _onCancel = null
let _container = null  // the PIXI container to draw into

export function startTargeting(container, spell, casterPos, tileSize, onConfirm, onCancel) {
  // Clean up any previous targeting session
  if (_active) cleanup()

  _active = true
  _ready = false  // wait for first mouse move before accepting clicks
  _spell = spell
  _casterPos = casterPos
  _tileSize = tileSize
  _onConfirm = onConfirm
  _onCancel = onCancel
  _container = container
  _previewGraphics = new PIXI.Graphics()
  _previewGraphics.zIndex = 100
  container.addChild(_previewGraphics)
}

export function updateTargeting(worldX, worldY) {
  if (!_active) return
  _mouseWorldPos = { x: worldX, y: worldY }
  _ready = true  // mouse has moved — now accept clicks
  drawPreview()
}

export function confirmTargeting() {
  if (!_active || !_ready) return  // ignore clicks before mouse moves (prevents instant-confirm)
  const tiles = getAffectedTiles()
  const pos = _mouseWorldPos ? {
    x: Math.floor(_mouseWorldPos.x / _tileSize),
    y: Math.floor(_mouseWorldPos.y / _tileSize)
  } : _casterPos
  const onConfirm = _onConfirm
  cleanup()
  onConfirm?.({ position: pos, affectedTiles: tiles })
}

export function cancelTargeting() {
  const onCancel = _onCancel
  cleanup()
  onCancel?.()
}

export function isTargeting() { return _active }

function cleanup() {
  if (_previewGraphics && _container) {
    try {
      _container.removeChild(_previewGraphics)
    } catch { /* already removed */ }
    try {
      _previewGraphics.destroy()
    } catch { /* already destroyed */ }
  }
  _previewGraphics = null
  _active = false
  _ready = false
  _spell = null
  _casterPos = null
  _mouseWorldPos = null
  _onConfirm = null
  _onCancel = null
  _container = null
}

function drawPreview() {
  if (!_previewGraphics || !_casterPos || !_mouseWorldPos) return
  _previewGraphics.clear()

  const tiles = getAffectedTiles()

  // Draw affected tiles
  for (const tile of tiles) {
    _previewGraphics.rect(tile.x * _tileSize, tile.y * _tileSize, _tileSize, _tileSize)
    _previewGraphics.fill({ color: 0x4488ff, alpha: 0.25 })
    _previewGraphics.stroke({ width: 1.5, color: 0x4488ff, alpha: 0.5 })
  }

  // Draw cone/sphere/line shape outline
  const areaType = _spell?.areaType || 'sphere'
  const cx = _casterPos.x * _tileSize + _tileSize / 2
  const cy = _casterPos.y * _tileSize + _tileSize / 2

  if (areaType === 'cone') {
    const angle = Math.atan2(_mouseWorldPos.y - cy, _mouseWorldPos.x - cx)
    const lengthPx = ((_spell?.areaSize || 15) / 5) * _tileSize
    const halfAngle = Math.PI / 3

    _previewGraphics.moveTo(cx, cy)
    _previewGraphics.lineTo(
      cx + Math.cos(angle - halfAngle) * lengthPx,
      cy + Math.sin(angle - halfAngle) * lengthPx
    )
    _previewGraphics.lineTo(
      cx + Math.cos(angle + halfAngle) * lengthPx,
      cy + Math.sin(angle + halfAngle) * lengthPx
    )
    _previewGraphics.closePath()
    _previewGraphics.fill({ color: 0x4488ff, alpha: 0.12 })
    _previewGraphics.stroke({ width: 2, color: 0x88bbff, alpha: 0.7 })
  } else if (areaType === 'sphere' || areaType === 'cube') {
    const radiusPx = ((_spell?.areaSize || 20) / 5) * _tileSize / 2
    _previewGraphics.circle(_mouseWorldPos.x, _mouseWorldPos.y, radiusPx)
    _previewGraphics.fill({ color: 0xff6622, alpha: 0.12 })
    _previewGraphics.stroke({ width: 2, color: 0xff8844, alpha: 0.7 })
  } else if (areaType === 'line') {
    const lengthPx = ((_spell?.areaSize || 30) / 5) * _tileSize
    const angle = Math.atan2(_mouseWorldPos.y - cy, _mouseWorldPos.x - cx)
    const endX = cx + Math.cos(angle) * lengthPx
    const endY = cy + Math.sin(angle) * lengthPx
    const widthPx = _tileSize * 0.3
    const perpX = Math.cos(angle + Math.PI / 2) * widthPx
    const perpY = Math.sin(angle + Math.PI / 2) * widthPx

    _previewGraphics.moveTo(cx + perpX, cy + perpY)
    _previewGraphics.lineTo(endX + perpX, endY + perpY)
    _previewGraphics.lineTo(endX - perpX, endY - perpY)
    _previewGraphics.lineTo(cx - perpX, cy - perpY)
    _previewGraphics.closePath()
    _previewGraphics.fill({ color: 0x44ccff, alpha: 0.12 })
    _previewGraphics.stroke({ width: 2, color: 0x66ddff, alpha: 0.7 })
  }
}

function getAffectedTiles() {
  if (!_casterPos || !_mouseWorldPos) return []

  const areaType = _spell?.areaType || 'sphere'
  const areaSizeFt = _spell?.areaSize || 15
  const areaTiles = Math.ceil(areaSizeFt / 5) // 5ft per tile

  const cx = _casterPos.x * _tileSize + _tileSize / 2
  const cy = _casterPos.y * _tileSize + _tileSize / 2
  const angle = Math.atan2(_mouseWorldPos.y - cy, _mouseWorldPos.x - cx)

  if (areaType === 'cone') {
    return getTilesInConeAngle(_casterPos, angle, areaTiles)
  } else if (areaType === 'sphere' || areaType === 'cube') {
    const center = {
      x: Math.floor(_mouseWorldPos.x / _tileSize),
      y: Math.floor(_mouseWorldPos.y / _tileSize)
    }
    const radiusTiles = Math.ceil(areaTiles / 2)
    return getTilesInSphereLocal(center, radiusTiles)
  } else if (areaType === 'line') {
    return getTilesInLineAngle(_casterPos, angle, areaTiles)
  }
  return []
}

function getTilesInConeAngle(origin, angle, lengthTiles) {
  const halfAngle = Math.PI / 3
  const tiles = []
  for (let dy = -lengthTiles; dy <= lengthTiles; dy++) {
    for (let dx = -lengthTiles; dx <= lengthTiles; dx++) {
      if (dx === 0 && dy === 0) continue
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > lengthTiles) continue
      const tileAngle = Math.atan2(dy, dx)
      let angleDiff = Math.abs(tileAngle - angle)
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
      if (angleDiff <= halfAngle) {
        tiles.push({ x: origin.x + dx, y: origin.y + dy })
      }
    }
  }
  return tiles
}

function getTilesInSphereLocal(center, radiusTiles) {
  const tiles = []
  for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
    for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
      if (Math.sqrt(dx * dx + dy * dy) <= radiusTiles) {
        tiles.push({ x: center.x + dx, y: center.y + dy })
      }
    }
  }
  return tiles
}

function getTilesInLineAngle(origin, angle, lengthTiles) {
  const tiles = []
  for (let i = 1; i <= lengthTiles; i++) {
    tiles.push({
      x: origin.x + Math.round(Math.cos(angle) * i),
      y: origin.y + Math.round(Math.sin(angle) * i)
    })
  }
  return tiles
}
