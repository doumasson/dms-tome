/**
 * Camera — pan, zoom, inertia, and viewport culling for the PixiJS tilemap renderer.
 *
 * Coordinate system: camera x/y represent the top-left world-space position
 * currently visible in the viewport.
 *
 * Screen → world:  worldX = camX + screenX / zoom
 * World → screen:  screenX = (worldX - camX) * zoom
 */

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1.5;
const PAN_SPEED = 600; // px/sec in world space at zoom=1
const INERTIA_DECAY = 0.85; // velocity multiplier per frame (applied per 16ms)
const INERTIA_STOP = 0.5; // px/sec — below this, snap to zero
const CENTER_EASE = 0.12; // lerp factor per 16ms frame
const CENTER_SNAP = 0.5; // px — snap to target when within this distance

class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.x = 0;
    this.y = 0;
    this.zoom = 0.5;

    this.areaWidth = null;
    this.areaHeight = null;

    // UI offset — bottom bar covers this many pixels, camera compensates
    this.uiBottomOffset = 200;

    // Pan velocity (world px/sec)
    this._vx = 0;
    this._vy = 0;

    // Active pan directions
    this._panDirs = new Set();

    // Smooth center target (world px)
    this._targetX = null;
    this._targetY = null;

    // Screen shake state
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  // ---------------------------------------------------------------------------
  // Bounds
  // ---------------------------------------------------------------------------

  setAreaBounds(widthPx, heightPx) {
    this.areaWidth = widthPx;
    this.areaHeight = heightPx;
    // Re-clamp current position
    this._clampPosition();
  }

  /**
   * Auto-fit zoom so the map covers the entire viewport (no empty canvas).
   * Uses the larger of width/height ratios to ensure full coverage.
   */
  fitToArea() {
    if (this.areaWidth === null || this.areaHeight === null) return;
    const zoomX = this.viewportWidth / this.areaWidth;
    const zoomY = this.viewportHeight / this.areaHeight;
    // Use the larger ratio so the map fills viewport in both dimensions
    const fitZoom = Math.max(zoomX, zoomY);
    this.setZoom(Math.max(fitZoom, ZOOM_MIN));
  }

  /**
   * Lock camera within combat encounter bounds (or null to unlock).
   * @param {{ x: number, y: number, width: number, height: number } | null} bounds — tile-space rect
   */
  setCombatBounds(bounds) {
    this._combatBounds = bounds;
  }

  // ---------------------------------------------------------------------------
  // Zoom
  // ---------------------------------------------------------------------------

  setZoom(z) {
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    this._clampPosition();
  }

  /**
   * Zoom toward a screen-space point (mouseX, mouseY).
   * Keeps the world point under the cursor fixed after the zoom.
   */
  zoomAt(delta, mouseX, mouseY) {
    const oldZoom = this.zoom;
    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldZoom + delta));

    // World point under cursor before zoom
    const worldX = this.x + mouseX / oldZoom;
    const worldY = this.y + mouseY / oldZoom;

    this.zoom = newZoom;

    // Reposition so the same world point is under the cursor
    this.x = worldX - mouseX / newZoom;
    this.y = worldY - mouseY / newZoom;

    this._clampPosition();
  }

  // ---------------------------------------------------------------------------
  // Position
  // ---------------------------------------------------------------------------

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this._clampPosition();
  }

  _clampPosition() {
    if (this.areaWidth !== null) {
      const maxX = Math.max(0, this.areaWidth - this.viewportWidth / this.zoom);
      const maxY = Math.max(0, this.areaHeight - this.viewportHeight / this.zoom);
      this.x = Math.min(maxX, Math.max(0, this.x));
      this.y = Math.min(maxY, Math.max(0, this.y));
    }

    // Combat bounds — restrict camera to encounter area with buffer
    if (this._combatBounds) {
      const cb = this._combatBounds;
      const tileSize = 200;
      const buffer = 5 * tileSize;
      const minX = cb.x * tileSize - buffer;
      const maxX = (cb.x + cb.width) * tileSize + buffer - this.viewportWidth / this.zoom;
      const minY = cb.y * tileSize - buffer;
      const maxY = (cb.y + cb.height) * tileSize + buffer - this.viewportHeight / this.zoom;
      this.x = Math.max(minX, Math.min(maxX, this.x));
      this.y = Math.max(minY, Math.min(maxY, this.y));
    }
  }

  // ---------------------------------------------------------------------------
  // Pan
  // ---------------------------------------------------------------------------

  startPan(dir) {
    this._panDirs.add(dir);
    // Cancel smooth center animation when player takes manual control
    this._targetX = null;
    this._targetY = null;
  }

  stopPan(dir) {
    this._panDirs.delete(dir);
  }

  // ---------------------------------------------------------------------------
  // Smooth center
  // ---------------------------------------------------------------------------

  centerOn(tileX, tileY, tileSize) {
    // Center in visible area (above the bottom UI bar)
    const visibleH = this.viewportHeight - this.uiBottomOffset;
    let tx = tileX * tileSize + tileSize / 2 - this.viewportWidth / (2 * this.zoom);
    let ty = tileY * tileSize + tileSize / 2 - visibleH / (2 * this.zoom);
    // Clamp target within area bounds to avoid snapping to corners
    if (this.areaWidth !== null) {
      const maxX = Math.max(0, this.areaWidth - this.viewportWidth / this.zoom);
      const maxY = Math.max(0, this.areaHeight - this.viewportHeight / this.zoom);
      tx = Math.min(maxX, Math.max(0, tx));
      ty = Math.min(maxY, Math.max(0, ty));
    }
    this._targetX = tx;
    this._targetY = ty;
  }

  centerOnImmediate(tileX, tileY, tileSize) {
    const visibleH = this.viewportHeight - this.uiBottomOffset;
    const tx = tileX * tileSize + tileSize / 2 - this.viewportWidth / (2 * this.zoom);
    const ty = tileY * tileSize + tileSize / 2 - visibleH / (2 * this.zoom);
    this._targetX = null;
    this._targetY = null;
    this._vx = 0;
    this._vy = 0;
    this.setPosition(tx, ty);
  }

  // ---------------------------------------------------------------------------
  // Update tick
  // ---------------------------------------------------------------------------

  update(dtMs) {
    const dt = dtMs / 1000; // seconds

    // --- Pan input: accumulate target velocity ---
    // Speed in world-space pixels per second (scales inversely with zoom so
    // screen-space movement stays constant regardless of zoom level).
    const speed = PAN_SPEED / this.zoom;

    let inputVx = 0;
    let inputVy = 0;
    if (this._panDirs.has('right')) inputVx += speed;
    if (this._panDirs.has('left'))  inputVx -= speed;
    if (this._panDirs.has('down'))  inputVy += speed;
    if (this._panDirs.has('up'))    inputVy -= speed;

    if (this._panDirs.size > 0) {
      // Hard-set velocity to input direction (no lag on acceleration)
      this._vx = inputVx;
      this._vy = inputVy;
    } else {
      // Inertia decay — normalised to 16ms frame for consistent feel
      const frames = dtMs / 16;
      const decay = Math.pow(INERTIA_DECAY, frames);
      this._vx *= decay;
      this._vy *= decay;

      // Stop below threshold
      if (Math.abs(this._vx) < INERTIA_STOP) this._vx = 0;
      if (Math.abs(this._vy) < INERTIA_STOP) this._vy = 0;
    }

    // Apply velocity
    if (this._vx !== 0 || this._vy !== 0) {
      this.x += this._vx * dt;
      this.y += this._vy * dt;
      this._clampPosition();
    }

    // --- Smooth center animation ---
    if (this._targetX !== null && this._panDirs.size === 0) {
      const frames = dtMs / 16;
      const alpha = 1 - Math.pow(1 - CENTER_EASE, frames);

      this.x += (this._targetX - this.x) * alpha;
      this.y += (this._targetY - this.y) * alpha;
      this._clampPosition();

      // Snap when close enough
      if (
        Math.abs(this._targetX - this.x) < CENTER_SNAP &&
        Math.abs(this._targetY - this.y) < CENTER_SNAP
      ) {
        this.x = this._targetX;
        this.y = this._targetY;
        this._clampPosition();
        this._targetX = null;
        this._targetY = null;
      }
    }

    // --- Screen shake ---
    if (this._shakeDuration > 0) {
      this._shakeElapsed += dtMs;
      if (this._shakeElapsed >= this._shakeDuration) {
        this._shakeDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      } else {
        const progress = this._shakeElapsed / this._shakeDuration;
        const decay = 1 - progress; // intensity decays linearly
        const intensity = this._shakeIntensity * decay;
        this.shakeOffsetX = (Math.random() * 2 - 1) * intensity;
        this.shakeOffsetY = (Math.random() * 2 - 1) * intensity;
      }
    }
  }

  /**
   * Trigger a screen shake effect.
   * @param {number} intensity - max pixel offset (e.g. 4 for light, 8 for heavy)
   * @param {number} duration - shake duration in ms (e.g. 200-400)
   */
  shake(intensity = 6, duration = 300) {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeElapsed = 0;
  }

  // ---------------------------------------------------------------------------
  // Visible tile bounds
  // ---------------------------------------------------------------------------

  /**
   * Returns the range of tile indices visible in the current viewport,
   * expanded by `buffer` tiles on each side for overdraw / prefetch.
   */
  getVisibleTileBounds(tileSize, buffer = 2) {
    // World-space rectangle currently visible
    const visibleW = this.viewportWidth / this.zoom;
    const visibleH = this.viewportHeight / this.zoom;

    const startX = Math.floor(this.x / tileSize) - buffer;
    const startY = Math.floor(this.y / tileSize) - buffer;
    const endX   = Math.ceil((this.x + visibleW) / tileSize) + buffer;
    const endY   = Math.ceil((this.y + visibleH) / tileSize) + buffer;

    return { startX, startY, endX, endY };
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  resize(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this._clampPosition();
  }
}

export default Camera;
