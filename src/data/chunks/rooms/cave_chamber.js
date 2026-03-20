// 12x10 cave chamber — rough stone floor, stalactites, water pools, rubble
// Row 0 is north (top), row 9 is south (bottom)
export default {
  id: 'cave_chamber',
  type: 'room',
  tags: ['cave', 'underground', 'combat'],
  source: 'curated',
  width: 12,
  height: 10,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:flat_stones_overlay_a3',                  // 1 = stone floor A
    'atlas-floors:flat_stones_overlay_a1',                  // 2 = stone floor B (lighter)
    'atlas-floors:flat_stones_overlay_a2',                  // 3 = stone wall (cave wall)
    'atlas-floors:brick_floor_04_d1',                       // 4 = water pool floor (dark)
    'atlas-structures:pillar_stone_a_1x1',                  // 5 = stalactite/column
    'atlas-props-decor:amphora_clay_brown_a1_1x1',          // 6 = rubble/stone pile
    'atlas-props-decor:arranged_clutter_a10_1x1',           // 7 = rubble clutter
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',      // 8 = water bucket (pool marker)
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 3, 3, 1, 2, 1, 1, 2, 1, 3, 3, 0, // row 1
      0, 3, 1, 2, 1, 2, 1, 2, 1, 2, 3, 0, // row 2
      0, 1, 2, 1, 4, 4, 1, 2, 1, 2, 1, 0, // row 3 — water pool west
      0, 1, 2, 4, 4, 4, 1, 2, 1, 2, 1, 0, // row 4
      0, 1, 2, 1, 4, 1, 2, 1, 4, 4, 1, 0, // row 5 — water pool east
      0, 1, 2, 1, 1, 2, 1, 2, 4, 4, 1, 0, // row 6
      0, 3, 1, 2, 1, 2, 1, 2, 1, 2, 3, 0, // row 7
      0, 3, 3, 1, 2, 1, 2, 1, 1, 3, 3, 0, // row 8
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 9
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 0 — north wall
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 3
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 4
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 5
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 6
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 7
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 8
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 9 — south wall (no door — tunnel entrance)
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, // stalactites N
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 7, 0, 0, 0, 0, 0, 6, 0, 0, // rubble + stone pile
      0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0,
      0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, // stalactites mid-east
      0, 0, 0, 6, 0, 0, 0, 0, 0, 7, 0, 0, // rubble
      0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0,
      0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, // stalactites S
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
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
    ],
  },
};
