// 12x3 horizontal road segment — stone brick path
export default {
  id: 'road_horizontal',
  type: 'terrain',
  tags: ['road', 'settlement', 'path'],
  source: 'curated',
  width: 12,
  height: 3,
  palette: [
    '',                                          // 0 = empty
    'atlas-floors:brick_floor_01_d1',           // 1 = brick A
    'atlas-floors:brick_floor_01_d2',           // 2 = brick B
    'atlas-floors:brick_floor_02_d1',           // 3 = brick C
    'atlas-floors:brick_floor_02_d2',           // 4 = brick D
    'atlas-terrain:bank_stone_earthy_path_a1',  // 5 = stone edge
  ],
  layers: {
    // prettier-ignore
    floor: [
      5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,  // row 0 — north edge
      1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3,  // row 1 — road surface
      5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,  // row 2 — south edge
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
