// 8x8 torture chamber — blood pools, cobwebs, armor on walls
export default {
  id: 'torture_chamber',
  type: 'room',
  tags: ['dungeon', 'underground', 'prison', 'dark'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_03_d1',                      // 1 = brick A
    'atlas-floors:brick_floor_03_d2',                      // 2 = brick B
    'atlas-floors:brick_floor_04_d1',                      // 3 = brick C
    'atlas-floors:flat_stones_overlay_a3',                 // 4 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 5 = metal door
    'atlas-effects:blood_pool_black_a10_1x1',              // 6 = blood pool
    'atlas-effects:cobweb_black_a1_1x1',                   // 7 = cobweb
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 8 = clutter (torture implements)
    'atlas-effects:arranged_armor_a1_1x1',                 // 9 = armor
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 3, 1, 2, 0, // row 1
      0, 2, 1, 3, 1, 2, 1, 0, // row 2
      0, 1, 3, 1, 2, 1, 3, 0, // row 3
      0, 3, 1, 2, 1, 3, 1, 0, // row 4
      0, 1, 2, 1, 3, 1, 2, 0, // row 5
      0, 2, 1, 3, 1, 2, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      4, 4, 4, 5, 5, 4, 4, 4, // row 0 — north wall, door center
      4, 0, 0, 0, 0, 0, 0, 4, // row 1
      4, 0, 0, 0, 0, 0, 0, 4, // row 2
      4, 0, 0, 0, 0, 0, 0, 4, // row 3
      4, 0, 0, 0, 0, 0, 0, 4, // row 4
      4, 0, 0, 0, 0, 0, 0, 4, // row 5
      4, 0, 0, 0, 0, 0, 0, 4, // row 6
      4, 4, 4, 5, 5, 4, 4, 4, // row 7 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 7, 0, 0, 0, 0, 7, 0, // cobwebs in corners
      0, 0, 6, 0, 8, 0, 0, 0, // blood pool, clutter
      0, 9, 0, 0, 0, 0, 8, 0, // armor on wall, clutter
      0, 0, 0, 6, 0, 6, 0, 0, // blood pools
      0, 8, 0, 0, 0, 0, 9, 0, // clutter, armor
      0, 7, 0, 0, 0, 0, 7, 0, // cobwebs in corners
      0, 0, 0, 0, 0, 0, 0, 0,
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
