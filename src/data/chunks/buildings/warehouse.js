// 14x8 warehouse — stone floor, crate stacks, barrel rows, loading area near south door
// Row 0 is north (top), row 7 is south (bottom)
export default {
  id: 'warehouse',
  type: 'building',
  tags: ['warehouse', 'settlement', 'indoor'],
  source: 'curated',
  width: 14,
  height: 8,
  palette: [
    '',                                                      // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                   // 1 = stone floor A
    'atlas-floors:flat_stones_overlay_a2',                   // 2 = stone floor B
    'atlas-floors:flat_stones_overlay_a3',                   // 3 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                // 4 = door
    'atlas-props-decor:crate_wood_ashen_a_1x1',              // 5 = crate
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',        // 6 = barrel
    'atlas-props-decor:sack_black_a1_1x1',                   // 7 = sack
    'atlas-props-decor:arranged_clutter_a10_1x1',            // 8 = clutter/rope
    'atlas-props-decor:amphora_clay_brown_a1_1x1',           // 9 = amphora/cask
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 1
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 2
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 3
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 4
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 5
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 0 — north wall
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 3
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 4
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 5
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 6
      3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, // row 7 — south wall, loading door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 5, 5, 0, 6, 6, 0, 0, 6, 6, 0, 5, 5, 0, // crate stacks + barrel rows
      0, 5, 0, 0, 6, 0, 0, 0, 0, 6, 0, 0, 5, 0,
      0, 0, 0, 7, 0, 0, 8, 8, 0, 0, 7, 0, 0, 0, // sacks + rope clutter (center aisle)
      0, 9, 0, 0, 6, 0, 0, 0, 0, 6, 0, 0, 9, 0, // casks + barrels
      0, 5, 5, 0, 6, 6, 0, 0, 6, 6, 0, 5, 5, 0,
      0, 0, 0, 8, 0, 0, 7, 7, 0, 0, 8, 0, 0, 0, // loading area — sacks + rope near door
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
