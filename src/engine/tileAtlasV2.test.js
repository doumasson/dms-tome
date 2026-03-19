import { describe, it, expect } from 'vitest';
import { TileAtlasV2 } from './tileAtlasV2.js';

describe('TileAtlasV2', () => {
  it('resolves a tile ID to atlas and coordinates', () => {
    const atlas = new TileAtlasV2();
    atlas.registerAtlas('floors', {
      stone_earthy_01: { x: 0, y: 0, w: 200, h: 200, gw: 1, gh: 1 },
      wood_planks_01: { x: 200, y: 0, w: 200, h: 200, gw: 1, gh: 1 },
    });

    const info = atlas.resolve('floors:stone_earthy_01');
    expect(info).toEqual({
      atlasName: 'floors',
      x: 0, y: 0, w: 200, h: 200, gw: 1, gh: 1,
    });
  });

  it('returns null for unknown tile ID', () => {
    const atlas = new TileAtlasV2();
    expect(atlas.resolve('floors:nonexistent')).toBeNull();
  });

  it('resolves integer tile from palette', () => {
    const atlas = new TileAtlasV2();
    atlas.registerAtlas('floors', {
      grass_01: { x: 0, y: 0, w: 200, h: 200, gw: 1, gh: 1 },
    });
    atlas.setPalette(['floors:grass_01', 'floors:grass_01']);
    const info = atlas.resolveFromPalette(0);
    expect(info.atlasName).toBe('floors');
  });

  it('reports blocking status from metadata', () => {
    const atlas = new TileAtlasV2();
    atlas.registerAtlas('walls', {
      stone_v_a1: { x: 0, y: 0, w: 200, h: 200, gw: 1, gh: 1, blocking: true },
    });
    expect(atlas.isBlocking('walls:stone_v_a1')).toBe(true);
  });
});
