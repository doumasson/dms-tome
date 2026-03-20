/**
 * RoofManager — tracks building bounds, doors, and reveal state
 * for Baldur's Gate-style roof-lift buildings.
 */

export class RoofManager {
  constructor() {
    this.buildings = new Map()
    this.revealed = new Map()
    this._doorSet = new Set()
  }

  registerBuilding(building) {
    const posX = building.x ?? building.position?.x ?? 0
    const posY = building.y ?? building.position?.y ?? 0
    const b = {
      ...building,
      minX: posX,
      minY: posY,
      maxX: posX + building.width,
      maxY: posY + building.height,
    }
    this.buildings.set(building.id, b)
    this.revealed.set(building.id, false)

    for (const door of building.doors || []) {
      this._doorSet.add(`${door.x},${door.y}`)
    }
  }

  isRevealed(buildingId) {
    return this.revealed.get(buildingId) || false
  }

  setRevealed(buildingId, revealed) {
    this.revealed.set(buildingId, revealed)
  }

  getBuildingAt(x, y) {
    for (const [id, b] of this.buildings) {
      if (x >= b.minX && x < b.maxX && y >= b.minY && y < b.maxY) {
        return id
      }
    }
    return null
  }

  isDoor(x, y) {
    return this._doorSet.has(`${x},${y}`)
  }

  allOutside(buildingId, partyPositions) {
    const b = this.buildings.get(buildingId)
    if (!b) return true
    return partyPositions.every(
      p => p.x < b.minX || p.x >= b.maxX || p.y < b.minY || p.y >= b.maxY
    )
  }

  /**
   * Check all buildings and update reveal state based on party positions.
   * Returns list of { buildingId, revealed } changes.
   */
  updateRevealStates(partyPositions) {
    const changes = []
    for (const [id, b] of this.buildings) {
      const anyInside = partyPositions.some(
        p => p.x >= b.minX && p.x < b.maxX && p.y >= b.minY && p.y < b.maxY
      )
      const wasRevealed = this.revealed.get(id)
      if (anyInside && !wasRevealed) {
        this.revealed.set(id, true)
        changes.push({ buildingId: id, revealed: true })
      } else if (!anyInside && wasRevealed) {
        this.revealed.set(id, false)
        changes.push({ buildingId: id, revealed: false })
      }
    }
    return changes
  }

  getRoofAlpha(buildingId) {
    return this.isRevealed(buildingId) ? 0 : 1
  }
}
