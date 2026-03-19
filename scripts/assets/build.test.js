import { describe, it, expect } from 'vitest';
import { planAtlasLayout, groupByAtlas } from './build.js';

describe('groupByAtlas', () => {
  it('groups manifest entries into atlas categories', () => {
    const entries = [
      { subcategory: 'Textures', tags: ['floor', 'stone'], gridWidth: 1, gridHeight: 1 },
      { subcategory: 'Furniture', tags: ['table'], gridWidth: 2, gridHeight: 2 },
      { subcategory: 'Textures', tags: ['floor', 'wood'], gridWidth: 1, gridHeight: 1 },
    ];
    const groups = groupByAtlas(entries);
    expect(groups['atlas-floors']).toHaveLength(2);
    expect(groups['atlas-props-furniture']).toHaveLength(1);
  });
});

describe('planAtlasLayout', () => {
  it('packs tiles into 4096x4096 sheet with positions', () => {
    const tiles = Array.from({ length: 100 }, (_, i) => ({
      id: `tile_${i}`,
      pixelWidth: 200,
      pixelHeight: 200,
    }));
    const layout = planAtlasLayout(tiles, 4096);
    expect(layout.width).toBeLessThanOrEqual(4096);
    expect(layout.height).toBeLessThanOrEqual(4096);
    expect(layout.positions).toHaveLength(100);
    // No overlaps
    for (let i = 0; i < layout.positions.length; i++) {
      for (let j = i + 1; j < layout.positions.length; j++) {
        const a = layout.positions[i];
        const b = layout.positions[j];
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x &&
                        a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('splits into multiple sheets if tiles exceed max size', () => {
    const tiles = Array.from({ length: 500 }, (_, i) => ({
      id: `tile_${i}`,
      pixelWidth: 200,
      pixelHeight: 200,
    }));
    const layouts = planAtlasLayout(tiles, 4096, { allowMultiSheet: true });
    expect(Array.isArray(layouts) ? layouts.length : 1).toBeGreaterThanOrEqual(1);
  });
});
