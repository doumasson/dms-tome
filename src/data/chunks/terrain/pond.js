// 8x8 pond with grass edges, flat stone water center, reeds, and rocks
export default {
  id: 'pond',
  type: 'terrain',
  tags: ['pond', 'water', 'outdoor'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',         // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',         // 2 = grass B
    'atlas-floors:grass_overlay_medium_c_01',         // 3 = grass C
    'atlas-floors:flat_stones_overlay_a1',            // 4 = water (stone)
    'atlas-floors:flat_stones_overlay_a2',            // 5 = water variant
    'atlas-terrain:cattail_blue_a10_1x1',             // 6 = reed
    'atlas-props-decor:rock_stone_earthy_a10_1x1',   // 7 = rock
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 3, 1, 2, 1, 3,
      2, 1, 1, 1, 1, 1, 3, 1,
      1, 1, 4, 5, 4, 5, 1, 2,
      3, 1, 5, 4, 5, 4, 1, 1,
      1, 2, 4, 5, 4, 5, 2, 1,
      2, 1, 5, 4, 5, 4, 1, 3,
      1, 3, 1, 1, 1, 1, 1, 1,
      3, 1, 2, 1, 3, 1, 2, 1,
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
      7, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 6, 0, 0, 6, 0, 0,
      0, 6, 0, 0, 0, 0, 6, 0,
      0, 0, 0, 0, 0, 0, 0, 7,
      7, 0, 0, 0, 0, 0, 0, 0,
      0, 6, 0, 0, 0, 0, 6, 0,
      0, 0, 6, 0, 0, 6, 0, 0,
      0, 0, 0, 7, 0, 0, 0, 7,
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
