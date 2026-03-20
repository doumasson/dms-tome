// 12x6 stable — wood floor, stall dividers, hay bale props, trough, tack room
// Row 0 is north (top), row 5 is south (bottom)
// Layout:
//   Main stalls: rows 1-4, cols 1-9 (3 stalls divided by walls)
//   Tack room: rows 1-4, cols 10-10
export default {
  id: 'stable',
  type: 'building',
  tags: ['stable', 'settlement', 'indoor'],
  source: 'curated',
  width: 12,
  height: 6,
  palette: [
    '',                                                          // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',                    // 1 = wood floor (stalls)
    'atlas-floors:flat_stones_overlay_a3',                      // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                   // 3 = door
    'atlas-floors:flat_stones_overlay_a1',                      // 4 = stone floor (tack room)
    'atlas-props-decor:sack_black_a1_1x1',                      // 5 = hay bale (sack)
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',       // 6 = trough (table)
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',          // 7 = water bucket
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',           // 8 = feed barrel
    'atlas-props-decor:arranged_clutter_a10_1x1',               // 9 = straw/clutter
  ],
  layers: {
    // prettier-ignore
    floor: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 0
      0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  4,  0, // row 1 — stalls + tack room
      0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  4,  0, // row 2
      0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  4,  0, // row 3
      0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  4,  0, // row 4
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, // row 5
    ],
    // prettier-ignore
    walls: [
      2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2, // row 0 — north wall
      2,  0,  0,  0,  2,  0,  0,  0,  2,  0,  2,  2, // row 1 — stall dividers + tack wall
      2,  0,  0,  0,  2,  0,  0,  0,  2,  0,  0,  2, // row 2
      2,  0,  0,  0,  2,  0,  0,  0,  2,  0,  0,  2, // row 3
      2,  0,  0,  0,  2,  0,  0,  0,  2,  0,  2,  2, // row 4 — tack door at col 9
      2,  2,  3,  2,  2,  2,  3,  2,  2,  3,  2,  2, // row 5 — south wall, 3 stall doors
    ],
    // prettier-ignore
    props: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  5,  0,  0,  0,  5,  0,  0,  0,  7,  8,  0, // hay + bucket + barrel in tack
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  6,  0,  0,  0,  6,  0,  0,  0,  6,  0,  0, // troughs in each stall
      0,  9,  0,  0,  0,  9,  0,  5,  0,  0,  0,  0, // straw + hay bale
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    ],
    // prettier-ignore
    roof: [
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    ],
  },
};
