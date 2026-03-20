// 6x6 guard tower — stone walls, stone floor, weapon rack + table, door on south
// Row 0 is north (top), row 5 is south (bottom)
export default {
  id: 'guard_tower',
  type: 'building',
  tags: ['guard_tower', 'settlement', 'indoor', 'military'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                           // 0 = empty
    'atlas-floors:flat_stones_overlay_a3',                       // 1 = stone floor
    'atlas-floors:flat_stones_overlay_a2',                       // 2 = stone wall (solid fill)
    'atlas-structures:door_metal_gray_a_1x1',                    // 3 = door
    'atlas-props-craft:hand_axe_wood_ashen_a1_1x1',             // 4 = weapon (axe on rack)
    'atlas-props-furniture:table_square_wood_ashen_e1_1x1',      // 5 = table
    'atlas-props-furniture:chair_wood_ashen_a_1x1',              // 6 = chair
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
      0, 4, 0, 0, 4, 0, // weapons along north wall
      0, 0, 0, 0, 0, 0,
      0, 0, 5, 0, 0, 0, // table
      0, 0, 6, 0, 6, 0, // chairs
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
