// 8x8 alchemy lab — tables, candles, amphoras, clutter
export default {
  id: 'alchemy_lab',
  type: 'room',
  tags: ['dungeon', 'underground', 'laboratory'],
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
    'atlas-props-craft:alchemy_arrangement_a10_1x1',       // 6 = alchemy table
    'atlas-props-decor:candles_black_arranged_a1_1x1',     // 7 = candles
    'atlas-props-decor:amphora_clay_brown_a1_1x1',         // 8 = amphora
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 9 = clutter
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 3, 1, 2, 3, 0, // row 1
      0, 2, 1, 2, 3, 1, 2, 0, // row 2
      0, 3, 2, 1, 2, 3, 1, 0, // row 3
      0, 1, 3, 2, 1, 2, 3, 0, // row 4
      0, 2, 1, 3, 2, 1, 2, 0, // row 5
      0, 3, 2, 1, 3, 2, 1, 0, // row 6
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
      0, 8, 0, 0, 0, 0, 8, 0, // amphoras on shelves
      0, 0, 6, 0, 0, 7, 0, 0, // alchemy table, candles
      0, 7, 0, 0, 9, 0, 0, 0, // candles, clutter
      0, 0, 0, 6, 0, 0, 6, 0, // alchemy tables
      0, 9, 0, 0, 0, 7, 0, 0, // clutter, candles
      0, 0, 8, 0, 0, 0, 9, 0, // amphora, clutter
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
