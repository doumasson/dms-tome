// 6x6 rocky outcrop with dense rock cluster
export default {
  id: 'rock_outcrop',
  type: 'terrain',
  tags: ['rocks', 'mountain', 'outdoor'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                      // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',               // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',               // 2 = grass B
    'atlas-floors:grass_overlay_medium_c_01',               // 3 = grass C
    'atlas-props-decor:rock_stone_earthy_a10_1x1',         // 4 = earthy rock
    'atlas-props-decor:rock_stone_slate_blue_b10_1x1',     // 5 = slate rock
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 3, 1, 2, 1,
      2, 1, 1, 2, 1, 3,
      1, 3, 1, 1, 3, 1,
      3, 1, 2, 1, 1, 2,
      1, 2, 1, 3, 2, 1,
      2, 1, 3, 1, 1, 3,
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
      4, 0, 0, 0, 0, 5,
      0, 5, 4, 5, 0, 0,
      0, 4, 5, 4, 5, 0,
      0, 5, 4, 5, 4, 0,
      0, 0, 5, 4, 0, 0,
      5, 0, 0, 0, 0, 4,
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
