// 8x8 crossroads with brick + pattern through grass, barrels and bushes at corners
export default {
  id: 'crossroads',
  type: 'landmark',
  tags: ['landmark', 'road', 'outdoor'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                      // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',               // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',               // 2 = grass B
    'atlas-floors:grass_overlay_medium_c_01',               // 3 = grass C
    'atlas-floors:brick_floor_01_d1',                       // 4 = brick A
    'atlas-floors:brick_floor_01_d2',                       // 5 = brick B
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',      // 6 = barrel
    'atlas-terrain:bush_multicolor2_a1_1x1',                // 7 = bush
    'atlas-terrain:bush_multicolor2_a2_1x1',                // 8 = bush variant
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 3, 4, 5, 1, 2, 3,
      2, 1, 2, 5, 4, 3, 1, 2,
      1, 3, 1, 4, 5, 2, 3, 1,
      4, 5, 4, 5, 4, 5, 4, 5,
      5, 4, 5, 4, 5, 4, 5, 4,
      2, 1, 3, 5, 4, 1, 2, 1,
      3, 2, 1, 4, 5, 2, 1, 3,
      1, 3, 2, 5, 4, 3, 1, 2,
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      7, 6, 0, 0, 0, 0, 6, 8,
      8, 0, 0, 0, 0, 0, 0, 7,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      7, 0, 0, 0, 0, 0, 0, 8,
      8, 6, 0, 0, 0, 0, 6, 7,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
