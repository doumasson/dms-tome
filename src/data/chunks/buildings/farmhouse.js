// 8x8 farmhouse — stone walls, dark wood floor, cozy interior with bed, table, chairs, barrel
export default {
  id: 'farmhouse',
  type: 'building',
  tags: ['farmhouse', 'farm', 'settlement', 'indoor'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                         // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',                   // 1 = wood floor
    'atlas-floors:flat_stones_overlay_a2',                     // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                  // 3 = door
    'atlas-props-furniture:single_bed_ladder_wood_ashen_a_1x1', // 4 = bed
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',      // 5 = table
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',      // 6 = chair
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',         // 7 = barrel
    'atlas-props-furniture:stove_wood_ashen_a1_1x1',           // 8 = stove
    'atlas-props-decor:candles_black_arranged_a1_1x1',        // 9 = candles
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 1, 1, 0, // row 4
      0, 1, 1, 1, 1, 1, 1, 0, // row 5
      0, 1, 1, 1, 1, 1, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 0, 0, 2, // row 4
      2, 0, 0, 0, 0, 0, 0, 2, // row 5
      2, 0, 0, 0, 0, 0, 0, 2, // row 6
      2, 2, 2, 3, 3, 2, 2, 2, // row 7 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 8, 0, 0, 0, 0, 7, 0, // stove NW, barrel NE
      0, 0, 0, 0, 0, 4, 4, 0, // bed NE (2 tiles)
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 6, 5, 9, 6, 0, 0, // chair, table+candles, chair
      0, 0, 0, 5, 0, 0, 0, 0, // table extension
      0, 7, 0, 0, 0, 0, 0, 0, // barrel SW
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
