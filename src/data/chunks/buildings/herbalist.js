// 6x8 herbalist shop — stone walls, wood floor, alchemy table center, clutter shelves, amphoras
export default {
  id: 'herbalist',
  type: 'building',
  tags: ['herbalist', 'shop', 'settlement', 'indoor'],
  source: 'curated',
  width: 6,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',               // 1 = wood floor
    'atlas-floors:flat_stones_overlay_a3',                 // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',              // 3 = door
    'atlas-props-craft:alchemy_arrangement_a10_1x1',       // 4 = alchemy table
    'atlas-props-decor:arranged_clutter_a10_1x1',         // 5 = clutter (shelves)
    'atlas-props-decor:amphora_clay_brown_a1_1x1',       // 6 = amphora
    'atlas-props-decor:candles_black_arranged_a1_1x1',   // 7 = candles
    'atlas-props-decor:sack_black_a1_1x1',               // 8 = sack
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 0, // row 4
      0, 1, 1, 1, 1, 0, // row 5
      0, 1, 1, 1, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 2, // row 4
      2, 0, 0, 0, 0, 2, // row 5
      2, 0, 0, 0, 0, 2, // row 6
      2, 2, 3, 3, 2, 2, // row 7 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0,
      0, 5, 5, 5, 6, 0, // clutter shelves along north, amphora NE
      0, 6, 0, 0, 0, 0, // amphora NW
      0, 0, 4, 4, 0, 0, // alchemy table center
      0, 0, 7, 0, 0, 0, // candles
      0, 5, 0, 0, 5, 0, // clutter along walls
      0, 8, 0, 0, 6, 0, // sack, amphora
      0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ],
  },
};
