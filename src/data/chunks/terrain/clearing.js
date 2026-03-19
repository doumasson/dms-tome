// 8x8 grass clearing with bushes/branches on edges
export default {
  id: 'clearing_grass',
  type: 'terrain',
  tags: ['clearing', 'outdoor', 'grassland'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',         // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',         // 2 = grass B
    'atlas-floors:grass_overlay_medium_c_01',         // 3 = grass C
    'atlas-terrain:bush_multicolor2_a1_1x1',          // 4 = bush
    'atlas-terrain:branch_wood_ashen_a6_1x1',         // 5 = branch
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 1, 2, 1, 3, 1,
      2, 1, 3, 1, 1, 2, 1, 2,
      1, 1, 1, 2, 1, 1, 1, 1,
      3, 1, 1, 1, 1, 3, 1, 2,
      1, 2, 1, 1, 2, 1, 1, 1,
      1, 1, 2, 1, 1, 1, 2, 1,
      2, 1, 1, 1, 2, 1, 1, 3,
      1, 3, 1, 2, 1, 1, 2, 1,
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
      4, 0, 0, 0, 0, 0, 0, 4,  // bushes in corners
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 5, 0,  // branch
      0, 0, 0, 0, 0, 0, 0, 0,
      5, 0, 0, 4, 0, 0, 0, 4,  // branch + bushes
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
