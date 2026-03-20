// 8x10 chapel — stone floor, pews in rows, altar at north end, vestry room with wall divider
// Row 0 is north (top), row 9 is south (bottom)
// Layout:
//   Sanctuary: rows 0-6, cols 0-7
//   Vestry: rows 7-9, cols 5-7 (divided by internal wall)
export default {
  id: 'chapel',
  type: 'building',
  tags: ['chapel', 'settlement', 'indoor', 'religious'],
  source: 'curated',
  width: 8,
  height: 10,
  palette: [
    '',                                                          // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                      // 1 = stone floor (sanctuary)
    'atlas-floors:flat_stones_overlay_a2',                      // 2 = stone floor B
    'atlas-floors:flat_stones_overlay_a3',                      // 3 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                   // 4 = door
    'atlas-props-furniture:bench_base_stone_earthy_b1_1x1',     // 5 = pew
    'atlas-props-decor:candles_black_arranged_a1_1x1',          // 6 = candles
    'atlas-props-furniture:table_base_stone_earthy_a1_1x1',     // 7 = altar
    'atlas-props-decor:banner_cloth_red_a1_1x1',                // 8 = devotional banner
    'atlas-floors:flat_stones_overlay_a1',                      // 9 = vestry floor (reuse)
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 2, 1, 2, 0, // row 1
      0, 2, 1, 2, 1, 2, 1, 0, // row 2
      0, 1, 2, 1, 2, 1, 2, 0, // row 3
      0, 2, 1, 2, 1, 2, 1, 0, // row 4
      0, 1, 2, 1, 2, 1, 2, 0, // row 5
      0, 2, 1, 2, 1, 2, 1, 0, // row 6
      0, 1, 2, 1, 0, 1, 2, 0, // row 7 — vestry divides at col 4
      0, 2, 1, 2, 0, 2, 1, 0, // row 8
      0, 0, 0, 0, 0, 0, 0, 0, // row 9
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 3, 3, 3, 3, // row 0 — north wall
      3, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 0, 0, 0, 0, 0, 0, 3, // row 3
      3, 0, 0, 0, 0, 0, 0, 3, // row 4
      3, 0, 0, 0, 0, 0, 0, 3, // row 5
      3, 0, 0, 0, 0, 0, 0, 3, // row 6
      3, 0, 0, 0, 3, 0, 0, 3, // row 7 — vestry internal wall at col 4
      3, 0, 0, 0, 3, 0, 0, 3, // row 8
      3, 3, 4, 3, 3, 4, 3, 3, // row 9 — south wall, two doors (nave + vestry)
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 6, 0, 7, 7, 0, 6, 0, // candles flanking altar
      0, 8, 0, 0, 0, 0, 8, 0, // banners on walls
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 5, 0, 0, 5, 0, 0, // pews row 1
      0, 0, 5, 0, 0, 5, 0, 0, // pews row 2
      0, 0, 5, 0, 0, 5, 0, 0, // pews row 3
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 6, 0, 0, 0, 0, // candle in vestry
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
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
