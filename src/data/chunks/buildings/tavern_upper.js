// 16x12 tavern upper floor — hallway, 4 guest rooms, stair tile
// Row 0 is north (top), row 11 is south (bottom)
// Layout:
//   Central hallway: rows 5-6, cols 1-14
//   North rooms: rows 1-4, cols 1-3 / 5-7 / 9-11 / 13-14
//   South rooms: rows 7-10, cols 1-3 / 5-7 / 9-11 / 13-14
//   Stair tile: row 10, col 2
export default {
  id: 'tavern_upper',
  type: 'building',
  tags: ['tavern', 'settlement', 'indoor', 'multi-floor', 'upper-floor'],
  source: 'curated',
  width: 16,
  height: 12,
  palette: [
    '',                                                              // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',                        // 1 = wood floor (hallway)
    'atlas-floors:shack_floor_wood_light_a3',                       // 2 = wood floor (rooms)
    'atlas-floors:flat_stones_overlay_a3',                          // 3 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                       // 4 = door
    'atlas-props-furniture:single_bed_ladder_wood_ashen_a_1x1',     // 5 = bed
    'atlas-props-furniture:rolled_bedroll_cloth_beige_d_1x1',       // 6 = bedroll
    'atlas-props-decor:arranged_clutter_a10_1x1',                   // 7 = clutter/pack
    'atlas-structures:stair_wood_ashen_a_1x1',                      // 8 = stair tile
  ],
  layers: {
    // prettier-ignore
    floor: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 0
      0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  0, // row 1 — north rooms
      0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  0, // row 2
      0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  0, // row 3
      0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  0, // row 4
      0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0, // row 5 — hallway
      0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0, // row 6 — hallway
      0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  0, // row 7 — south rooms
      0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  0, // row 8
      0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  0, // row 9
      0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  2,  0,  2,  2,  0, // row 10
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 11
    ],
    // prettier-ignore
    walls: [
      3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3, // row 0  — north wall
      3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  3, // row 1
      3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  3, // row 2
      3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  3, // row 3
      3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  3, // row 4
      3,  0,  4,  0,  3,  0,  4,  0,  3,  0,  4,  0,  3,  0,  4,  3, // row 5  — doors to north rooms
      3,  0,  4,  0,  3,  0,  4,  0,  3,  0,  4,  0,  3,  0,  4,  3, // row 6  — doors to south rooms
      3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  3, // row 7
      3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  3, // row 8
      3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  3, // row 9
      3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  0,  3,  0,  0,  3, // row 10
      3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3, // row 11 — south wall
    ],
    // prettier-ignore
    props: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  5,  0,  0,  0,  5,  0,  0,  0,  5,  0,  0,  0,  5,  0,  0, // beds in NW of each room
      0,  0,  0,  7,  0,  0,  0,  7,  0,  0,  0,  7,  0,  0,  0,  0,
      0,  6,  0,  0,  0,  6,  0,  0,  0,  6,  0,  0,  0,  6,  0,  0, // bedrolls
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  8,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // stair at col 1 hallway
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  5,  0,  0,  0,  5,  0,  0,  0,  5,  0,  0,  0,  5,  0,  0, // beds in south rooms
      0,  0,  0,  7,  0,  0,  0,  7,  0,  0,  0,  7,  0,  0,  0,  0,
      0,  6,  0,  0,  0,  6,  0,  0,  0,  6,  0,  0,  0,  6,  0,  0,
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
