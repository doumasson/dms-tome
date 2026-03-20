// 10x10 temple — stone walls, stone floor, altar + benches, door on south
// Row 0 is north (top), row 9 is south (bottom)
export default {
  id: 'temple_stone',
  type: 'building',
  tags: ['temple', 'settlement', 'indoor', 'religious'],
  source: 'curated',
  width: 10,
  height: 10,
  palette: [
    '',                                                          // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                      // 1 = stone floor
    'atlas-floors:flat_stones_overlay_a2',                      // 2 = stone wall (solid fill)
    'atlas-structures:door_metal_gray_a_1x1',                   // 3 = door
    'atlas-props-furniture:bench_base_stone_earthy_b1_1x1',     // 4 = bench (pew)
    'atlas-props-decor:candles_black_arranged_a1_1x1',          // 5 = candles
    'atlas-props-decor:altar_runner_black_a1_path',             // 6 = altar runner
    'atlas-props-furniture:table_base_stone_earthy_a1_1x1',     // 7 = stone table (altar)
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 4
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 5
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 6
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 7
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 8
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 9
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 0, 0, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 0, 0, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 0, 0, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 0, 0, 0, 0, 2, // row 4
      2, 0, 0, 0, 0, 0, 0, 0, 0, 2, // row 5
      2, 0, 0, 0, 0, 0, 0, 0, 0, 2, // row 6
      2, 0, 0, 0, 0, 0, 0, 0, 0, 2, // row 7
      2, 0, 0, 0, 0, 0, 0, 0, 0, 2, // row 8
      2, 2, 2, 2, 3, 3, 2, 2, 2, 2, // row 9 — south wall, door at center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 5, 0, 0, 0, 0, 0, 0, 5, 0, // candles flanking
      0, 0, 0, 0, 7, 7, 0, 0, 0, 0, // altar (stone tables)
      0, 0, 0, 0, 6, 6, 0, 0, 0, 0, // altar runner
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 4, 0, 0, 0, 0, 4, 0, 0, // pews row 1
      0, 0, 4, 0, 0, 0, 0, 4, 0, 0, // pews row 2
      0, 0, 4, 0, 0, 0, 0, 4, 0, 0, // pews row 3
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
