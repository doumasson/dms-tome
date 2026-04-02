// 10x8 tavern variant B — stone walls, dark wood floor, bar along north wall
export default {
  id: 'tavern_b',
  type: 'building',
  tags: ['tavern', 'settlement', 'indoor'],
  source: 'curated',
  width: 10,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',               // 1 = wood floor
    'atlas-floors:flat_stones_overlay_a2',                 // 2 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 3 = door
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',  // 4 = table
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',  // 5 = chair
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 6 = clutter (bar top)
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',     // 7 = barrel
    'atlas-props-decor:candles_black_arranged_a1_1x1',    // 8 = candles
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
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 7
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
      2, 2, 2, 2, 3, 3, 2, 2, 2, 2, // row 7 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 4, 6, 4, 6, 4, 6, 4, 7, 0, // bar along north: tables+clutter
      0, 0, 0, 0, 0, 0, 0, 0, 7, 0, // barrels NE corner
      0, 0, 5, 0, 4, 0, 0, 5, 0, 0, // scattered seating
      0, 0, 0, 8, 0, 0, 8, 0, 0, 0, // candles on tables
      0, 0, 5, 0, 4, 0, 4, 0, 5, 0, // more seating
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
    ],
  },
};
