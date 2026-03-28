import itemSizes from '../data/itemSizes.json'

/**
 * GridPacker — spatial grid packer for inventory slots.
 *
 * Grid cells are stored in a flat Uint8Array (row-major).
 * Each occupied cell stores the item's numeric id (> 0); 0 = empty.
 */
export class GridPacker {
  /**
   * @param {number} cols
   * @param {number} rows
   */
  constructor(cols, rows) {
    this.cols = cols
    this.rows = rows
    this._cells = new Uint8Array(cols * rows) // 0 = empty
    /** @type {Map<string, { col: number, row: number, w: number, h: number, slot: number }>} */
    this._items = new Map()
    this._nextSlot = 1 // internal numeric id written into cells (1-255 cycled)
  }

  /** @param {number} col @param {number} row @returns {number} index into _cells */
  _idx(col, row) {
    return row * this.cols + col
  }

  /**
   * Returns true if the w×h footprint starting at (col, row) is fully within
   * bounds and every cell is unoccupied.
   * @param {number} col @param {number} row @param {number} w @param {number} h
   * @returns {boolean}
   */
  canPlace(col, row, w, h) {
    if (col < 0 || row < 0 || col + w > this.cols || row + h > this.rows) return false
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (this._cells[this._idx(c, r)] !== 0) return false
      }
    }
    return true
  }

  /**
   * Marks the w×h footprint starting at (col, row) as occupied by item `id`.
   * Silently overwrites if the caller already verified with canPlace.
   * @param {string} id
   * @param {number} col @param {number} row @param {number} w @param {number} h
   */
  place(id, col, row, w, h) {
    const slot = this._nextSlot
    this._nextSlot = (this._nextSlot % 254) + 1 // cycle 1-254
    this._items.set(id, { col, row, w, h, slot })
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        this._cells[this._idx(c, r)] = slot
      }
    }
  }

  /**
   * Clears the cells occupied by item `id`.
   * @param {string} id
   */
  remove(id) {
    const entry = this._items.get(id)
    if (!entry) return
    const { col, row, w, h, slot } = entry
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (this._cells[this._idx(c, r)] === slot) {
          this._cells[this._idx(c, r)] = 0
        }
      }
    }
    this._items.delete(id)
  }

  /**
   * Scans left-to-right, top-to-bottom for the first position that fits a
   * w×h item. Returns { col, row } or null if no slot is available.
   * @param {number} w @param {number} h
   * @returns {{ col: number, row: number } | null}
   */
  findSlot(w, h) {
    for (let r = 0; r <= this.rows - h; r++) {
      for (let c = 0; c <= this.cols - w; c++) {
        if (this.canPlace(c, r, w, h)) {
          return { col: c, row: r }
        }
      }
    }
    return null
  }
}

/**
 * Returns the [w, h] grid footprint for an item based on its category/type.
 *
 * Lookup order:
 *   1. item.category (e.g. "weapon_light")
 *   2. item.type
 *   3. "default" → [1, 1]
 *
 * @param {{ category?: string, type?: string }} item
 * @returns {[number, number]}
 */
export function getItemSize(item) {
  if (!item) return itemSizes['default'] || [1, 1]

  // Direct sizeCategory match (magic items, shop items)
  if (item.sizeCategory && itemSizes[item.sizeCategory]) return itemSizes[item.sizeCategory]

  // Derive from item properties
  if (item.baseAC !== undefined || item.armorType) {
    if (item.armorType === 'shield') return itemSizes['shield'] || [2, 2]
    const aType = (item.armorType || '').toLowerCase()
    if (aType === 'heavy') return itemSizes['armor_heavy'] || [2, 3]
    if (aType === 'medium') return itemSizes['armor_medium'] || [2, 3]
    if (aType === 'light') return itemSizes['armor_light'] || [2, 2]
    return itemSizes['armor_medium'] || [2, 3]
  }

  if (item.damage || item.category?.includes('weapon') || item.category?.includes('melee') || item.category?.includes('ranged')) {
    const props = item.properties || []
    if (props.includes('light')) return itemSizes['weapon_light'] || [1, 2]
    if (props.includes('two-handed') || props.includes('heavy')) return itemSizes['weapon_two_handed'] || [2, 3]
    if (item.range || item.category?.includes('ranged')) return itemSizes['weapon_ranged'] || [1, 3]
    return itemSizes['weapon_one_handed'] || [1, 3]
  }

  if (item.type === 'consumable' || item.effect) return itemSizes['potion'] || [1, 1]

  // Category/type direct lookup
  const key = item.category ?? item.type
  if (key && itemSizes[key]) return itemSizes[key]

  // Name-based fallback for common items without sizeCategory
  const name = (item.name || '').toLowerCase()
  if (name.includes('spellbook')) return itemSizes['spellbook'] || [2, 2]
  if (name.includes('book') || name.includes('tome')) return itemSizes['book'] || [2, 2]
  if (name.includes('pack') || name.includes("kit")) return itemSizes['pack'] || [2, 3]
  if (name.includes('focus') || name.includes('orb') || name.includes('crystal')) return itemSizes['focus'] || [1, 2]
  if (name.includes('staff') || name.includes('quarterstaff')) return itemSizes['staff'] || [1, 3]
  if (name.includes('wand')) return itemSizes['wand'] || [1, 2]
  if (name.includes('rope')) return itemSizes['rope'] || [1, 2]
  if (name.includes('bedroll') || name.includes('blanket')) return itemSizes['bedroll'] || [2, 2]
  if (name.includes('instrument') || name.includes('lute') || name.includes('flute')) return itemSizes['instrument'] || [1, 3]
  if (name.includes('pouch') || name.includes('component')) return itemSizes['component_pouch'] || [1, 2]
  if (name.includes('holy symbol')) return itemSizes['holy_symbol'] || [1, 1]
  if (name.includes('torch')) return itemSizes['torch'] || [1, 1]
  if (name.includes('lantern')) return itemSizes['lantern'] || [1, 1]

  return itemSizes['default'] || [1, 1]
}
