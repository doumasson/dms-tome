// 16x12 tavern ground floor — common room, kitchen, storeroom, stair tile
// Row 0 is north (top), row 11 is south (bottom)
// Layout:
//   col 0-15 width, row 0-11 height
//   Common room: rows 1-7, cols 1-9
//   Kitchen: rows 1-5, cols 11-14
//   Storeroom: rows 7-10, cols 11-14
//   Stair tile: row 10, col 2
export default {
  id: 'tavern_ground',
  type: 'building',
  tags: ['tavern', 'settlement', 'indoor', 'multi-floor'],
  source: 'curated',
  width: 16,
  height: 12,
  palette: [
    '',                                                         // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',                   // 1 = wood floor (common room)
    'atlas-floors:flat_stones_overlay_a3',                     // 2 = stone wall (solid fill)
    'atlas-structures:door_metal_gray_a_1x1',                  // 3 = door
    'atlas-floors:flat_stones_overlay_a1',                     // 4 = stone floor (kitchen/store)
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',      // 5 = table
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',      // 6 = chair
    'atlas-props-decor:arranged_clutter_a10_1x1',              // 7 = clutter
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',          // 8 = barrel
    'atlas-props-decor:crate_wood_ashen_a_1x1',                // 9 = crate
    'atlas-props-decor:amphora_clay_brown_a1_1x1',             // 10 = amphora
    'atlas-structures:stair_wood_ashen_a_1x1',                 // 11 = stair tile
  ],
  layers: {
    // prettier-ignore
    floor: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 0
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 1
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 2
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 3
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 4
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 5
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  0,  0,  0,  0,  0, // row 6
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 7
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 8
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 9
      0,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  4,  4,  4,  4,  0, // row 10
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 11
    ],
    // prettier-ignore
    walls: [
      2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2, // row 0  — north wall
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  0,  0,  2, // row 1
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  0,  0,  2, // row 2
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  0,  0,  2, // row 3
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  0,  0,  2, // row 4
      2,  0,  0,  0,  0,  0,  0,  0,  0,  3,  3,  0,  0,  0,  0,  2, // row 5  — kitchen door
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  2,  2,  2,  2,  2, // row 6  — kitchen/storeroom divider
      2,  0,  0,  0,  0,  0,  0,  0,  0,  3,  3,  0,  0,  0,  0,  2, // row 7  — storeroom door
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  0,  0,  2, // row 8
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  0,  0,  2, // row 9
      2,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  0,  0,  0,  0,  2, // row 10
      2,  2,  2,  2,  3,  3,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2, // row 11 — south wall, main door
    ],
    // prettier-ignore
    props: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  8,  0,  0,  0, // barrel in kitchen
      0,  0,  5,  0,  5,  0,  0,  0,  0,  0,  0,  0,  0, 10,  0,  0,
      0,  0,  6,  0,  6,  0,  0,  6,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  7,  0,  0,  0,
      0,  0,  5,  7,  0,  0,  5,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  6,  0,  0,  0,  6,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  9,  0,  9,  0,  0, // crates in storeroom
      0,  0,  5,  0,  5,  0,  0,  0,  0,  0,  0,  0,  8,  0,  8,  0,
      0,  0,  6,  0,  6,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0, 11,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // stair at col 2
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    ],
    // prettier-ignore
    roof: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    ],
  },
};
