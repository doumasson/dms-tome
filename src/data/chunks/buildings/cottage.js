// 6x6 cottage — single room with hearth, door on south
// Row 0 is north (top), row 5 is south (bottom)
export default {
  id: 'cottage_hearth',
  type: 'building',
  tags: ['cottage', 'house', 'settlement', 'indoor'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                              // 0 = empty
    'atlas-floors:shack_floor_wood_light_a3',                       // 1 = wood floor
    'atlas-floors:flat_stones_overlay_a1',                          // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                       // 3 = door
    'atlas-props-furniture:single_bed_ladder_wood_ashen_a_1x1',     // 4 = bed
    'atlas-props-decor:campfire_stone_ring_a1_1x1',                 // 5 = hearth/fire
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',           // 6 = table
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',           // 7 = chair
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 0, // row 4
      0, 0, 0, 0, 0, 0, // row 5
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 2, // row 4
      2, 2, 3, 3, 2, 2, // row 5 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0,
      0, 4, 0, 0, 0, 0, // bed NW
      0, 0, 0, 5, 0, 0, // hearth center-north
      0, 0, 0, 0, 0, 0,
      0, 6, 0, 7, 0, 0, // table + chair SW
      0, 0, 0, 0, 0, 0,
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
