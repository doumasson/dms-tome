// 6x6 volcanic lava pool with brick floor and stone center
export default {
  id: 'lava_pool',
  type: 'terrain',
  tags: ['volcanic', 'hazard', 'underground'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                      // 0 = empty
    'atlas-floors:brick_floor_01_d1',                       // 1 = brick A
    'atlas-floors:brick_floor_01_d2',                       // 2 = brick B
    'atlas-floors:flat_stones_overlay_a1',                  // 3 = lava (stone)
    'atlas-props-decor:rock_stone_earthy_a10_1x1',         // 4 = earthy rock
    'atlas-props-decor:rock_stone_slate_blue_b10_1x1',     // 5 = slate rock
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 2, 1, 2,
      2, 1, 1, 1, 2, 1,
      1, 1, 3, 3, 1, 2,
      2, 1, 3, 3, 1, 1,
      1, 2, 1, 1, 2, 1,
      2, 1, 2, 1, 1, 2,
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      4, 0, 5, 0, 0, 4,
      0, 4, 0, 0, 5, 0,
      5, 0, 0, 0, 0, 4,
      0, 0, 0, 0, 0, 5,
      0, 5, 0, 0, 4, 0,
      4, 0, 0, 5, 0, 4,
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
