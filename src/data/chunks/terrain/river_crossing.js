// 14x6 river crossing — water tiles center rows, bridge/stepping stones, reeds on banks
// Row 0 is north (top), row 5 is south (bottom)
// Water channel: rows 2-3 (center), banks: rows 0-1 and 4-5
export default {
  id: 'river_crossing',
  type: 'terrain',
  tags: ['river', 'outdoor', 'path'],
  source: 'curated',
  width: 14,
  height: 6,
  palette: [
    '',                                                 // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',           // 1 = grass bank A
    'atlas-floors:grass_overlay_medium_b_01',           // 2 = grass bank B
    'atlas-floors:flat_stones_overlay_a1',              // 3 = stone bridge/stepping stone
    'atlas-floors:flat_stones_overlay_a3',              // 4 = water floor (dark stone)
    'atlas-terrain:bush_multicolor2_a1_1x1',            // 5 = reeds/riverside bushes
    'atlas-terrain:branch_wood_ashen_a6_1x1',           // 6 = driftwood on bank
    'atlas-props-decor:arranged_clutter_a10_1x1',       // 7 = river debris
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, // row 0 — north bank
      2, 1, 2, 1, 3, 3, 3, 3, 3, 1, 2, 1, 2, 1, // row 1 — bank with bridge approach
      1, 2, 1, 2, 3, 4, 4, 4, 3, 2, 1, 2, 1, 2, // row 2 — water with bridge stones
      2, 1, 2, 1, 3, 4, 4, 4, 3, 1, 2, 1, 2, 1, // row 3 — water with bridge stones
      1, 2, 1, 2, 3, 3, 3, 3, 3, 2, 1, 2, 1, 2, // row 4 — bank with bridge approach
      2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, // row 5 — south bank
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      5, 0, 0, 5, 0, 0, 0, 0, 0, 0, 5, 0, 0, 5, // reeds on north bank
      0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, // driftwood
      0, 5, 0, 0, 0, 7, 0, 0, 7, 0, 0, 0, 5, 0, // reeds + debris in water
      0, 0, 0, 5, 0, 0, 7, 0, 0, 5, 0, 0, 0, 0,
      0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0,
      5, 0, 0, 5, 0, 0, 0, 0, 0, 0, 5, 0, 0, 5, // reeds on south bank
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
