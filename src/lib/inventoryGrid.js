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
  const key = item?.category ?? item?.type
  const entry = key ? itemSizes[key] : undefined
  return entry ?? itemSizes['default'] ?? [1, 1]
}
