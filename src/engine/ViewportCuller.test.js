import { describe, it, expect, beforeEach } from 'vitest';
import { ViewportCuller } from './ViewportCuller.js';

describe('ViewportCuller', () => {
  let culler;

  beforeEach(() => {
    culler = new ViewportCuller(200);
  });

  describe('getVisibleTiles', () => {
    it('returns only tiles within visible bounds (3x3 subset of 10x10 grid)', () => {
      culler.setLayer('ground', 10, 10);

      // bounds covering tiles (2,3) to (4,5) inclusive
      const bounds = {
        startX: 2 * 200,
        startY: 3 * 200,
        endX: 4 * 200 + 199,
        endY: 5 * 200 + 199,
      };

      const tiles = culler.getVisibleTiles('ground', bounds);

      expect(tiles).toHaveLength(9);
      expect(tiles).toEqual(
        expect.arrayContaining([
          { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
          { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
          { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 },
        ])
      );
    });

    it('clamps bounds to layer dimensions (does not return tiles outside grid)', () => {
      culler.setLayer('ground', 5, 5); // 5x5 grid, tiles 0–4 in each axis

      // bounds that extend well beyond the grid
      const bounds = {
        startX: 3 * 200,
        startY: 3 * 200,
        endX: 10 * 200,
        endY: 10 * 200,
      };

      const tiles = culler.getVisibleTiles('ground', bounds);

      // Only tiles (3,3), (4,3), (3,4), (4,4) should be returned
      expect(tiles).toHaveLength(4);
      expect(tiles).toEqual(
        expect.arrayContaining([
          { x: 3, y: 3 }, { x: 4, y: 3 },
          { x: 3, y: 4 }, { x: 4, y: 4 },
        ])
      );

      // No tile index should be >= 5
      tiles.forEach(({ x, y }) => {
        expect(x).toBeLessThan(5);
        expect(y).toBeLessThan(5);
      });
    });
  });
});
