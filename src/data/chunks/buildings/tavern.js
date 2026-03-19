// 10x8 tavern building — stone walls, wood floor, door on south center
// Row 0 is north (top), row 7 is south (bottom)
export default {
  id: 'tavern_main',
  type: 'building',
  tags: ['tavern', 'settlement', 'indoor'],
  source: 'curated',
  width: 10,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',               // 1 = wood floor
    'atlas-structures:wall_stone_earthy_a_connector_a_1x1', // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',              // 3 = door
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',  // 4 = chair
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 5 = table clutter
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0 — walls, no floor under perimeter
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 4
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 5
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 7 — walls
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
      2, 2, 2, 2, 3, 3, 2, 2, 2, 2, // row 7 — south wall, door at center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 4, 0, 5, 0, 0, 4, 0, 0, // chairs + clutter (tables)
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 5, 0, 0, 5, 0, 0, 0, // more table clutter
      0, 0, 4, 0, 0, 0, 0, 4, 0, 0, // chairs
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
