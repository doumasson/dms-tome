// 8x8 stone plaza with candle arrangement in center and rocks at corners
export default {
  id: 'statue_plaza',
  type: 'landmark',
  tags: ['landmark', 'plaza', 'settlement'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                      // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                  // 1 = stone A
    'atlas-floors:flat_stones_overlay_a2',                  // 2 = stone B
    'atlas-props-decor:candles_black_arranged_a1_1x1',     // 3 = candles
    'atlas-props-decor:rock_stone_earthy_a10_1x1',         // 4 = earthy rock
    'atlas-props-decor:rock_stone_slate_blue_b10_1x1',     // 5 = slate rock
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 2, 1, 2, 1, 2,
      2, 1, 2, 1, 2, 1, 2, 1,
      1, 2, 1, 2, 1, 2, 1, 2,
      2, 1, 2, 1, 2, 1, 2, 1,
      1, 2, 1, 2, 1, 2, 1, 2,
      2, 1, 2, 1, 2, 1, 2, 1,
      1, 2, 1, 2, 1, 2, 1, 2,
      2, 1, 2, 1, 2, 1, 2, 1,
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
      4, 0, 0, 0, 0, 0, 0, 5,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 3, 0, 0, 3, 0, 0,
      0, 0, 0, 3, 3, 0, 0, 0,
      0, 0, 0, 3, 3, 0, 0, 0,
      0, 0, 3, 0, 0, 3, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      5, 0, 0, 0, 0, 0, 0, 4,
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
