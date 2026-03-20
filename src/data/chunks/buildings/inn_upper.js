// 14x10 inn upper floor — wood floor, central hallway, 3 guest rooms, stairs
// Row 0 is north (top), row 9 is south (bottom)
// Layout:
//   Central hallway: rows 4-5, cols 1-12
//   Room 1 (west): rows 1-3, cols 1-3
//   Room 2 (center): rows 1-3, cols 5-9
//   Room 3 (east): rows 1-3, cols 11-12
//   South rooms 4-6 (mirror): rows 6-8
//   Stairs: row 8, col 2
export default {
  id: 'inn_upper',
  type: 'building',
  tags: ['inn', 'settlement', 'indoor', 'upper_floor'],
  source: 'curated',
  width: 14,
  height: 10,
  palette: [
    '',                                                              // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',                        // 1 = wood floor (hallway)
    'atlas-floors:shack_floor_wood_light_a3',                       // 2 = wood floor (rooms)
    'atlas-floors:flat_stones_overlay_a3',                          // 3 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                       // 4 = door
    'atlas-props-furniture:single_bed_ladder_wood_ashen_a_1x1',     // 5 = bed
    'atlas-props-furniture:rolled_bedroll_cloth_beige_d_1x1',       // 6 = bedroll
    'atlas-props-decor:arranged_clutter_a10_1x1',                   // 7 = pack/clutter
    'atlas-structures:stair_wood_ashen_a_1x1',                      // 8 = stairs
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',              // 9 = wash bucket
  ],
  layers: {
    // prettier-ignore
    floor: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 0
      0,  2,  2,  2,  0,  2,  2,  2,  2,  2,  0,  2,  2,  0, // row 1 — north rooms
      0,  2,  2,  2,  0,  2,  2,  2,  2,  2,  0,  2,  2,  0, // row 2
      0,  2,  2,  2,  0,  2,  2,  2,  2,  2,  0,  2,  2,  0, // row 3
      0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0, // row 4 — hallway
      0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0, // row 5 — hallway
      0,  2,  2,  2,  0,  2,  2,  2,  2,  2,  0,  2,  2,  0, // row 6 — south rooms
      0,  2,  2,  2,  0,  2,  2,  2,  2,  2,  0,  2,  2,  0, // row 7
      0,  2,  2,  2,  0,  2,  2,  2,  2,  2,  0,  2,  2,  0, // row 8
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 9
    ],
    // prettier-ignore
    walls: [
      3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3, // row 0 — north wall
      3,  0,  0,  0,  3,  0,  0,  0,  0,  0,  3,  0,  0,  3, // row 1
      3,  0,  0,  0,  3,  0,  0,  0,  0,  0,  3,  0,  0,  3, // row 2
      3,  0,  0,  0,  3,  0,  0,  0,  0,  0,  3,  0,  0,  3, // row 3
      3,  0,  4,  0,  3,  0,  4,  0,  0,  4,  3,  0,  4,  3, // row 4 — doors to north rooms
      3,  0,  4,  0,  3,  0,  4,  0,  0,  4,  3,  0,  4,  3, // row 5 — doors to south rooms
      3,  0,  0,  0,  3,  0,  0,  0,  0,  0,  3,  0,  0,  3, // row 6
      3,  0,  0,  0,  3,  0,  0,  0,  0,  0,  3,  0,  0,  3, // row 7
      3,  0,  0,  0,  3,  0,  0,  0,  0,  0,  3,  0,  0,  3, // row 8
      3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3, // row 9 — south wall
    ],
    // prettier-ignore
    props: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  5,  0,  0,  0,  5,  0,  0,  0,  0,  0,  5,  0,  0, // beds in north rooms
      0,  0,  0,  7,  0,  0,  9,  0,  9,  0,  0,  0,  7,  0, // packs + wash buckets
      0,  6,  0,  0,  0,  6,  0,  0,  0,  6,  0,  6,  0,  0, // bedrolls
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  8,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // stairs in hallway
      0,  5,  0,  0,  0,  5,  0,  0,  0,  0,  0,  5,  0,  0, // beds in south rooms
      0,  0,  0,  7,  0,  0,  9,  0,  9,  0,  0,  0,  7,  0,
      0,  6,  0,  0,  0,  6,  0,  0,  0,  6,  0,  6,  0,  0,
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
