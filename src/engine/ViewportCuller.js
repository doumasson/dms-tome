/**
 * ViewportCuller — determines which tiles are visible within camera bounds.
 * Used to skip rendering tiles that are outside the viewport (performance
 * optimization for large tilemaps).
 */
export class ViewportCuller {
  /**
   * @param {number} tileSize — pixel size of a single tile (e.g. 200)
   */
  constructor(tileSize) {
    this.tileSize = tileSize;
    this.layers = new Map();
  }

  /**
   * Register a layer with its grid dimensions.
   * @param {string} name
   * @param {number} width  — number of tiles horizontally
   * @param {number} height — number of tiles vertically
   */
  setLayer(name, width, height) {
    this.layers.set(name, { width, height });
  }

  /**
   * Return all tile coordinates visible within the given pixel bounds,
   * clamped to the layer's grid dimensions.
   *
   * @param {string} layerName
   * @param {{ startX: number, startY: number, endX: number, endY: number }} bounds
   * @returns {{ x: number, y: number }[]}
   */
  getVisibleTiles(layerName, bounds) {
    const layer = this.layers.get(layerName);
    if (!layer) return [];

    const { tileSize } = this;
    const { width, height } = layer;
    const { startX, startY, endX, endY } = bounds;

    const tileStartX = Math.max(0, Math.floor(startX / tileSize));
    const tileStartY = Math.max(0, Math.floor(startY / tileSize));
    const tileEndX   = Math.min(width  - 1, Math.floor(endX / tileSize));
    const tileEndY   = Math.min(height - 1, Math.floor(endY / tileSize));

    const visible = [];
    for (let y = tileStartY; y <= tileEndY; y++) {
      for (let x = tileStartX; x <= tileEndX; x++) {
        visible.push({ x, y });
      }
    }
    return visible;
  }
}
