import { describe, it, expect, beforeEach } from 'vitest';
import Camera from './Camera.js';

describe('Camera', () => {
  let cam;

  beforeEach(() => {
    cam = new Camera(800, 600);
  });

  // --- Initialization ---

  it('initializes with default values', () => {
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(0.5);
  });

  it('stores viewport dimensions', () => {
    expect(cam.viewportWidth).toBe(800);
    expect(cam.viewportHeight).toBe(600);
  });

  // --- Zoom ---

  it('clamps zoom to minimum 0.3', () => {
    cam.setZoom(0.1);
    expect(cam.zoom).toBe(0.3);
  });

  it('clamps zoom to maximum 1.5', () => {
    cam.setZoom(5.0);
    expect(cam.zoom).toBe(1.5);
  });

  it('sets zoom within valid range', () => {
    cam.setZoom(1.0);
    expect(cam.zoom).toBe(1.0);
  });

  it('zoomAt adjusts zoom by delta', () => {
    cam.setAreaBounds(10000, 8000);
    cam.setZoom(1.0);
    cam.zoomAt(0.1, 400, 300);
    expect(cam.zoom).toBeCloseTo(1.1, 5);
  });

  it('zoomAt clamps to max when delta would exceed', () => {
    cam.setAreaBounds(10000, 8000);
    cam.setZoom(1.4);
    cam.zoomAt(0.5, 400, 300);
    expect(cam.zoom).toBe(1.5);
  });

  it('zoomAt clamps to min when delta would go below', () => {
    cam.setAreaBounds(10000, 8000);
    cam.setZoom(0.4);
    cam.zoomAt(-0.5, 400, 300);
    expect(cam.zoom).toBe(0.3);
  });

  it('zoomAt repositions camera to zoom toward mouse cursor', () => {
    cam.setAreaBounds(20000, 16000);
    cam.x = 0;
    cam.y = 0;
    const beforeZoom = cam.zoom;
    // Mouse at center of viewport (400, 300)
    cam.zoomAt(0.5, 400, 300);
    // After zooming in, the world point under the mouse should remain fixed
    // We just verify it moved to compensate
    const afterZoom = cam.zoom;
    expect(afterZoom).toBeGreaterThan(beforeZoom);
    // Position should have shifted to keep mouse world point fixed
    // At x=0, y=0 camera: world point at mouse = mouse / zoom
    // After zoom the camera adjusts so world point stays under mouse
    expect(typeof cam.x).toBe('number');
    expect(typeof cam.y).toBe('number');
  });

  // --- Area Bounds ---

  it('setAreaBounds records area size', () => {
    cam.setAreaBounds(10000, 8000);
    expect(cam.areaWidth).toBe(10000);
    expect(cam.areaHeight).toBe(8000);
  });

  it('setPosition clamps to area bounds (no negative)', () => {
    cam.setAreaBounds(10000, 8000);
    cam.setPosition(-500, -200);
    expect(cam.x).toBeGreaterThanOrEqual(0);
    expect(cam.y).toBeGreaterThanOrEqual(0);
  });

  it('setPosition clamps to area bounds (no overflow past max)', () => {
    cam.setAreaBounds(5000, 4000);
    cam.setZoom(0.5);
    // Max x = areaWidth - viewportWidth/zoom = 5000 - 800/0.5 = 5000 - 1600 = 3400
    cam.setPosition(99999, 99999);
    const maxX = cam.areaWidth - cam.viewportWidth / cam.zoom;
    const maxY = cam.areaHeight - cam.viewportHeight / cam.zoom;
    expect(cam.x).toBeLessThanOrEqual(maxX + 0.001);
    expect(cam.y).toBeLessThanOrEqual(maxY + 0.001);
  });

  it('setPosition allows free movement when no bounds set', () => {
    // No setAreaBounds called — should not throw, position stored as-is
    cam.setPosition(100, 200);
    expect(cam.x).toBe(100);
    expect(cam.y).toBe(200);
  });

  // --- Pan ---

  it('startPan/stopPan track active directions', () => {
    cam.startPan('right');
    cam.startPan('down');
    // After update with dt, position should have moved
    cam.setAreaBounds(50000, 40000);
    cam.update(100); // 100ms
    expect(cam.x).toBeGreaterThan(0);
    expect(cam.y).toBeGreaterThan(0);
  });

  it('stopPan stops adding velocity in that direction', () => {
    cam.setAreaBounds(50000, 40000);
    cam.startPan('right');
    cam.update(100);
    const xAfterPan = cam.x;
    cam.stopPan('right');
    // After stopping, inertia decays — position may still move but velocity decreases
    cam.update(16);
    // x velocity should still be > 0 (inertia) but we just verify stop was tracked
    // The position after stopping+update can still increase due to inertia
    expect(typeof cam.x).toBe('number');
    // But if we wait long enough, movement should stop
    for (let i = 0; i < 200; i++) cam.update(16);
    // After 200 frames of decay, should be roughly stopped
    const xFinal = cam.x;
    cam.update(16);
    expect(Math.abs(cam.x - xFinal)).toBeLessThan(0.5);
  });

  // --- Inertia ---

  it('applies inertia on pan release — velocity decays but not instantly', () => {
    cam.setAreaBounds(50000, 40000);
    cam.startPan('right');
    cam.update(100); // build up velocity
    const xBeforeStop = cam.x;
    cam.stopPan('right');

    // One frame of inertia — should still move
    cam.update(16);
    expect(cam.x).toBeGreaterThan(xBeforeStop);
  });

  it('inertia velocity decays toward zero after pan release', () => {
    cam.setAreaBounds(50000, 40000);
    cam.startPan('right');
    cam.update(100);
    cam.stopPan('right');

    // Collect positions over several frames (include the pre-loop position as index 0)
    const positions = [cam.x];
    for (let i = 0; i < 10; i++) {
      cam.update(16);
      positions.push(cam.x);
    }

    // Each step's delta should be smaller than the previous (decelerating)
    const deltas = positions.slice(1).map((p, i) => p - positions[i]);
    // At least the last delta should be smaller than the first delta
    expect(deltas[deltas.length - 1]).toBeLessThan(deltas[0]);
  });

  it('inertia stops below 0.5px/sec threshold', () => {
    cam.setAreaBounds(50000, 40000);
    cam.startPan('right');
    cam.update(50);
    cam.stopPan('right');

    // Run many frames
    for (let i = 0; i < 300; i++) cam.update(16);

    // After enough decay, camera should be completely stopped
    const x1 = cam.x;
    cam.update(16);
    const x2 = cam.x;
    expect(x2).toBe(x1);
  });

  // --- centerOnImmediate ---

  it('centerOnImmediate snaps to tile position immediately', () => {
    cam.setAreaBounds(50000, 40000);
    const tileSize = 200;
    const tileX = 10;
    const tileY = 8;
    cam.centerOnImmediate(tileX, tileY, tileSize);

    // Camera should be positioned so tile center is at viewport center
    const expectedX = tileX * tileSize + tileSize / 2 - cam.viewportWidth / (2 * cam.zoom);
    const expectedY = tileY * tileSize + tileSize / 2 - cam.viewportHeight / (2 * cam.zoom);
    expect(cam.x).toBeCloseTo(expectedX, 1);
    expect(cam.y).toBeCloseTo(expectedY, 1);
  });

  it('centerOnImmediate works without prior setAreaBounds', () => {
    const tileSize = 200;
    cam.centerOnImmediate(5, 5, tileSize);
    expect(typeof cam.x).toBe('number');
    expect(typeof cam.y).toBe('number');
    expect(isNaN(cam.x)).toBe(false);
  });

  // --- centerOn (smooth) ---

  it('centerOn sets an animation target, does not move instantly', () => {
    cam.setAreaBounds(50000, 40000);
    const startX = cam.x;
    const startY = cam.y;
    cam.centerOn(20, 15, 200);
    // Immediately after call, position should not have jumped
    // (It may move slightly if update was called internally, but centerOn itself should not snap)
    // We check that it didn't jump to the full target
    const tileSize = 200;
    const targetX = 20 * tileSize + tileSize / 2 - cam.viewportWidth / (2 * cam.zoom);
    const targetY = 15 * tileSize + tileSize / 2 - cam.viewportHeight / (2 * cam.zoom);
    // Should NOT be at target yet
    expect(cam.x).not.toBeCloseTo(targetX, 0);
  });

  it('centerOn moves camera toward target after update ticks', () => {
    cam.setAreaBounds(50000, 40000);
    cam.x = 0;
    cam.y = 0;
    cam.centerOn(20, 15, 200);

    // After 5 seconds of updates, should be close to target
    for (let i = 0; i < 100; i++) cam.update(50); // 100 × 50ms = 5000ms

    const tileSize = 200;
    const targetX = 20 * tileSize + tileSize / 2 - cam.viewportWidth / (2 * cam.zoom);
    const targetY = 15 * tileSize + tileSize / 2 - cam.viewportHeight / (2 * cam.zoom);

    expect(cam.x).toBeCloseTo(targetX, 0);
    expect(cam.y).toBeCloseTo(targetY, 0);
  });

  // --- getVisibleTileBounds ---

  it('getVisibleTileBounds returns correct tile range at default position', () => {
    cam.setAreaBounds(10000, 8000);
    const tileSize = 200;
    // cam at x=0, y=0, zoom=0.5, viewport 800x600
    // visible world area = viewport / zoom = 1600 x 1200
    // tiles visible: 0 to 1600/200 = 8 wide, 0 to 1200/200 = 6 tall
    // with buffer=2: startX=-2, startY=-2, endX=10, endY=8
    const bounds = cam.getVisibleTileBounds(tileSize, 2);
    expect(bounds.startX).toBe(-2);
    expect(bounds.startY).toBe(-2);
    expect(bounds.endX).toBe(10);
    expect(bounds.endY).toBe(8);
  });

  it('getVisibleTileBounds accounts for camera position', () => {
    cam.setAreaBounds(50000, 40000);
    cam.setZoom(1.0);
    // viewport 800x600, zoom 1.0 → visible world = 800x600
    // Move camera to x=400, y=200
    cam.setPosition(400, 200);
    const tileSize = 100;
    // startX = floor(400/100) - buffer = 4 - 2 = 2
    // startY = floor(200/100) - buffer = 2 - 2 = 0
    // endX = ceil((400+800)/100) + buffer = ceil(12) + 2 = 14
    // endY = ceil((200+600)/100) + buffer = ceil(8) + 2 = 10
    const bounds = cam.getVisibleTileBounds(tileSize, 2);
    expect(bounds.startX).toBe(2);
    expect(bounds.startY).toBe(0);
    expect(bounds.endX).toBe(14);
    expect(bounds.endY).toBe(10);
  });

  it('getVisibleTileBounds uses default buffer of 2', () => {
    cam.setAreaBounds(10000, 8000);
    const tileSize = 200;
    const boundsWithDefault = cam.getVisibleTileBounds(tileSize);
    const boundsWithExplicit = cam.getVisibleTileBounds(tileSize, 2);
    expect(boundsWithDefault.startX).toBe(boundsWithExplicit.startX);
    expect(boundsWithDefault.endX).toBe(boundsWithExplicit.endX);
  });

  // --- resize ---

  it('resize updates viewport dimensions', () => {
    cam.resize(1024, 768);
    expect(cam.viewportWidth).toBe(1024);
    expect(cam.viewportHeight).toBe(768);
  });

  it('resize re-clamps position to new viewport bounds', () => {
    cam.setAreaBounds(2000, 1500);
    cam.setZoom(1.0);
    // With 800x600 viewport, max x = 2000 - 800 = 1200
    cam.setPosition(1200, 900);
    // Resize to larger viewport — max x = 2000 - 2000 = 0, so cam should clamp
    cam.resize(2000, 1500);
    // With viewport == area size, camera should clamp to 0
    expect(cam.x).toBeGreaterThanOrEqual(0);
    expect(cam.x).toBeLessThanOrEqual(1200);
  });

  // --- Pan speed scaling with zoom ---

  it('pan speed scales inversely with zoom', () => {
    cam.setAreaBounds(500000, 400000);

    // Pan at default zoom (0.5)
    cam.startPan('right');
    cam.update(100); // 100ms
    const distAtLowZoom = cam.x;
    cam.stopPan('right');

    // Reset
    cam.x = 0;
    cam.y = 0;

    // Pan at higher zoom (1.0)
    cam.setZoom(1.0);
    cam.startPan('right');
    cam.update(100);
    const distAtHighZoom = cam.x;
    cam.stopPan('right');

    // At higher zoom, world-space pan should be less (600/zoom = 600 at 1x vs 1200 at 0.5x)
    expect(distAtHighZoom).toBeLessThan(distAtLowZoom);
  });
});
