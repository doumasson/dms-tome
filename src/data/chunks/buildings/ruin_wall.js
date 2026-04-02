// 8x8 crumbling ruins — partial broken walls, stone floor patches, no door, outdoor terrain
export default {
  id: 'ruin_wall',
  type: 'terrain',
  tags: ['ruin', 'outdoor'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                 // 1 = stone floor patch
    'atlas-floors:flat_stones_overlay_a2',                 // 2 = wall fragment
    'atlas-props-decor:arranged_clutter_a10_1x1',         // 3 = rubble clutter
    'atlas-props-decor:crate_wood_ashen_a_1x1',           // 4 = broken crate
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 0, 0, 0, 0, 0, // row 1
      0, 1, 1, 1, 0, 0, 0, 0, // row 2
      0, 1, 1, 1, 1, 0, 0, 0, // row 3
      0, 0, 1, 1, 1, 1, 0, 0, // row 4
      0, 0, 0, 1, 1, 1, 1, 0, // row 5
      0, 0, 0, 0, 1, 1, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 2, 2, 0, 0, 0, 0, 0, // row 1 — broken north fragment
      0, 2, 0, 0, 0, 0, 0, 0, // row 2 — west fragment
      0, 0, 0, 0, 2, 0, 0, 0, // row 3 — lone fragment
      0, 0, 0, 0, 0, 0, 2, 0, // row 4 — east fragment
      0, 0, 0, 0, 0, 0, 2, 0, // row 5 — east fragment continues
      0, 0, 0, 2, 2, 0, 0, 0, // row 6 — south fragment
      0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 3, 0, 0, 0, 0, 0, // rubble near wall
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 3, 0, 0, 0, 0, // rubble in center
      0, 0, 0, 0, 0, 4, 0, 0, // broken crate
      0, 0, 0, 0, 0, 3, 0, 0, // more rubble
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
    ],
  },
};
