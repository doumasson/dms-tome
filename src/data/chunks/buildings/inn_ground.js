// 14x10 inn ground floor — wood floor, lobby + dining room, fireplace, internal walls, stairs
// Row 0 is north (top), row 9 is south (bottom)
// Layout:
//   Lobby/entrance: rows 1-2, cols 1-5
//   Dining room: rows 1-7, cols 1-9
//   Kitchen: rows 1-7, cols 11-12
//   Dividing wall: col 10
//   Stairs: row 7, col 2
export default {
  id: 'inn_ground',
  type: 'building',
  tags: ['inn', 'settlement', 'indoor'],
  source: 'curated',
  width: 14,
  height: 10,
  palette: [
    '',                                                          // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',                    // 1 = wood floor (dining)
    'atlas-floors:flat_stones_overlay_a3',                      // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                   // 3 = door
    'atlas-floors:flat_stones_overlay_a1',                      // 4 = stone floor (kitchen)
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',       // 5 = table
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',       // 6 = chair
    'atlas-props-decor:campfire_stone_ring_a1_1x1',             // 7 = fireplace
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',           // 8 = barrel
    'atlas-props-decor:arranged_clutter_a10_1x1',               // 9 = clutter
    'atlas-props-decor:crate_wood_ashen_a_1x1',                 // 10 = crate
    'atlas-structures:stair_wood_ashen_a_1x1',                  // 11 = stairs
  ],
  layers: {
    // prettier-ignore
    floor: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 0
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  0, // row 1 — dining + kitchen
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  0, // row 2
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  0, // row 3
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  0, // row 4
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  0, // row 5
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  0, // row 6
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  0, // row 7
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  0,  0,  0, // row 8
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 9
    ],
    // prettier-ignore
    walls: [
      2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2, // row 0 — north wall
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  2, // row 1
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  2, // row 2
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  2, // row 3
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  2, // row 4
      2,  0,  0,  0,  0,  0,  0,  0,  0,  3,  3,  0,  0,  2, // row 5 — kitchen door
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  2,  2,  2, // row 6 — kitchen divider
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  2, // row 7 — upper access
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  2,  2,  2, // row 8 — south kitchen wall
      2,  2,  2,  2,  3,  3,  2,  2,  2,  2,  2,  2,  2,  2, // row 9 — south wall, main door
    ],
    // prettier-ignore
    props: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  7,  0,  0,  0,  0,  0,  0,  0,  0,  0,  8,  0,  0, // fireplace NW, barrel in kitchen
      0,  0,  0,  5,  0,  5,  0,  0,  0,  0,  0,  0,  9,  0, // tables
      0,  0,  6,  0,  6,  0,  6,  0,  0,  0,  0,  0,  0,  0, // chairs
      0,  0,  0,  5,  0,  5,  0,  0,  0,  0,  0,  8,  0,  0, // tables + barrel
      0,  0,  6,  0,  6,  0,  6,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0, 11,  0,  5,  0,  0,  0,  0,  0,  0,  0,  0,  0, // stairs + lobby table
      0,  0,  6,  0,  0,  0,  0,  9,  0,  0,  0,  0,  0,  0, // chair + clutter near entrance
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    ],
    // prettier-ignore
    roof: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    ],
  },
};
