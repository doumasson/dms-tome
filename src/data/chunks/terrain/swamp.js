// 10x10 swamp — mix of water and muddy ground, dead tree props, lily pad decor
// Row 0 is north (top), row 9 is south (bottom)
export default {
  id: 'swamp',
  type: 'terrain',
  tags: ['swamp', 'outdoor', 'water'],
  source: 'curated',
  width: 10,
  height: 10,
  palette: [
    '',                                                 // 0 = empty
    'atlas-floors:grass_overlay_medium_b_01',           // 1 = muddy ground A
    'atlas-floors:grass_overlay_medium_c_01',           // 2 = muddy ground B (darker)
    'atlas-floors:flat_stones_overlay_a3',              // 3 = mud/dark ground
    'atlas-floors:brick_floor_04_d1',                   // 4 = swamp water (dark)
    'atlas-terrain:bush_multicolor2_a1_1x1',            // 5 = marsh grass/reeds
    'atlas-terrain:branch_wood_ashen_a6_1x1',           // 6 = dead tree branch
    'atlas-props-decor:arranged_clutter_a10_1x1',       // 7 = rotting debris/lily pad
    'atlas-terrain:gravestone_stone_gray_a1_1x1',       // 8 = dead tree stump
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 4, 4, 2, 1, 4, 4, 2, 1,
      2, 4, 4, 2, 1, 2, 4, 2, 1, 2,
      4, 4, 2, 1, 3, 2, 2, 1, 2, 4,
      4, 2, 1, 3, 3, 1, 2, 4, 4, 2,
      2, 1, 3, 3, 2, 3, 1, 4, 2, 1,
      1, 3, 3, 2, 1, 2, 3, 2, 1, 2,
      2, 2, 1, 3, 3, 1, 2, 1, 4, 4,
      1, 4, 4, 2, 1, 3, 2, 4, 4, 2,
      2, 4, 2, 1, 2, 2, 4, 4, 2, 1,
      1, 2, 1, 2, 4, 4, 2, 1, 2, 1,
    ],
    // prettier-ignore
    walls: [
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
    // prettier-ignore
    props: [
      5, 0, 7, 0, 5, 0, 7, 0, 5, 0, // reeds + lily pads
      0, 7, 0, 5, 0, 0, 0, 5, 0, 0,
      8, 0, 0, 0, 5, 0, 0, 0, 0, 6, // dead stump NW, branch NE
      0, 0, 6, 0, 0, 7, 0, 0, 5, 0,
      0, 5, 0, 7, 0, 0, 5, 0, 0, 0,
      7, 0, 0, 0, 0, 8, 0, 0, 6, 0, // dead stump mid, branch
      0, 0, 5, 0, 5, 0, 0, 7, 0, 0,
      0, 7, 0, 0, 0, 5, 0, 7, 0, 5,
      6, 0, 0, 5, 0, 0, 8, 0, 0, 0,
      0, 5, 0, 0, 7, 0, 0, 5, 0, 6,
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
