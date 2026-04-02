// 6x6 shrine — stone walls, stone floor, candles, amphora altar, clutter
export default {
  id: 'shrine',
  type: 'building',
  tags: ['shrine', 'religious', 'settlement', 'indoor'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                 // 1 = stone floor
    'atlas-floors:flat_stones_overlay_a3',                 // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',              // 3 = door
    'atlas-props-decor:candles_black_arranged_a1_1x1',    // 4 = candles
    'atlas-props-decor:amphora_clay_brown_a1_1x1',       // 5 = amphora (altar)
    'atlas-props-decor:arranged_clutter_a10_1x1',        // 6 = clutter
    'atlas-effects:fire_blue_a10_1x1',                    // 7 = blue fire
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 0, // row 4
      0, 0, 0, 0, 0, 0, // row 5
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 2, // row 4
      2, 2, 3, 3, 2, 2, // row 5 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0,
      0, 4, 0, 5, 0, 0, // candles, amphora altar
      0, 6, 0, 0, 6, 0, // clutter along walls
      0, 0, 7, 0, 0, 0, // blue fire center
      0, 4, 0, 0, 4, 0, // candles flanking entrance
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
    ],
  },
};
