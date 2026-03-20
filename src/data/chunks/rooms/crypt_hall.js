// 14x8 crypt hall — marble/brick floor, sarcophagi in rows, candle alcoves
// Row 0 is north (top), row 7 is south (bottom)
export default {
  id: 'crypt_hall',
  type: 'room',
  tags: ['crypt', 'underground', 'religious'],
  source: 'curated',
  width: 14,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                  // 1 = marble/stone floor
    'atlas-floors:flat_stones_overlay_a2',                  // 2 = stone floor B
    'atlas-floors:flat_stones_overlay_a3',                  // 3 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',               // 4 = iron door
    'atlas-props-furniture:bench_base_stone_earthy_b1_1x1', // 5 = sarcophagus lid (stone bench)
    'atlas-props-decor:candles_black_arranged_a1_1x1',      // 6 = candle alcove
    'atlas-props-decor:amphora_clay_brown_a1_1x1',          // 7 = funerary urn
    'atlas-props-decor:arranged_clutter_a10_1x1',           // 8 = dust/clutter
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 1
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 2
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 3
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 4
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 5
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 0 — north wall
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 3
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 4
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 5
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 6
      3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, // row 7 — south wall, double door
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 6, 0, 5, 0, 5, 0, 5, 0, 5, 0, 5, 6, 0, // sarcophagi N row, candles at ends
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, // urns at walls
      0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, // dust/clutter
      0, 6, 0, 5, 0, 5, 0, 5, 0, 5, 0, 5, 6, 0, // sarcophagi S row, candles at ends
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
