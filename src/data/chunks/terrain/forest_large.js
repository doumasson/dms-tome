// 12x12 large forest — varied grass, tree props, fallen logs, mushrooms, underbrush
// Row 0 is north (top), row 11 is south (bottom)
export default {
  id: 'forest_large',
  type: 'terrain',
  tags: ['forest', 'outdoor', 'wilderness'],
  source: 'curated',
  width: 12,
  height: 12,
  palette: [
    '',                                                 // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',           // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',           // 2 = grass B
    'atlas-floors:grass_overlay_medium_c_01',           // 3 = grass C
    'atlas-terrain:bush_multicolor2_a1_1x1',            // 4 = bush/underbrush
    'atlas-terrain:branch_wood_ashen_a6_1x1',           // 5 = fallen log/branch
    'atlas-terrain:gravestone_stone_gray_a1_1x1',       // 6 = large mushroom (stone stand-in)
    'atlas-props-decor:arranged_clutter_a10_1x1',       // 7 = leaf litter
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 2, 1,
      2, 1, 2, 3, 1, 3, 2, 1, 2, 1, 3, 2,
      3, 2, 1, 2, 3, 2, 1, 3, 1, 2, 1, 3,
      1, 3, 2, 1, 2, 1, 3, 2, 3, 1, 2, 1,
      2, 1, 3, 2, 1, 3, 2, 1, 2, 3, 1, 2,
      3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1,
      1, 3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3,
      2, 1, 3, 2, 1, 3, 3, 1, 2, 3, 1, 2,
      3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1,
      1, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2, 3,
      2, 1, 3, 2, 3, 1, 2, 1, 2, 3, 1, 2,
      3, 2, 1, 3, 1, 2, 3, 2, 1, 2, 3, 1,
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      4, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 4, // dense bushes at edges
      0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, // fallen logs
      0, 0, 4, 0, 0, 7, 0, 0, 4, 0, 0, 0,
      0, 5, 0, 0, 0, 0, 6, 0, 0, 0, 5, 0, // mushrooms, logs
      0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0,
      0, 0, 7, 0, 0, 0, 0, 0, 7, 0, 0, 0, // leaf litter
      0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 4, 0,
      0, 0, 5, 0, 7, 0, 0, 0, 0, 5, 0, 0,
      0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0,
      4, 0, 0, 5, 0, 0, 0, 7, 0, 0, 0, 4,
      0, 0, 4, 0, 0, 0, 0, 0, 6, 0, 0, 0,
      4, 0, 0, 0, 4, 5, 0, 0, 0, 4, 0, 4, // dense bushes at south edge
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
