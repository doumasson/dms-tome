// 12x10 barracks — main bunk room, armory side room, door on south
// Row 0 is north (top), row 9 is south (bottom)
// Layout:
//   Bunk room: rows 1-8, cols 1-7
//   Armory: rows 1-8, cols 9-10
export default {
  id: 'barracks',
  type: 'building',
  tags: ['barracks', 'military', 'settlement', 'indoor'],
  source: 'curated',
  width: 12,
  height: 10,
  palette: [
    '',                                                              // 0 = empty
    'atlas-floors:flat_stones_overlay_a3',                          // 1 = stone floor
    'atlas-floors:flat_stones_overlay_a2',                          // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                       // 3 = door
    'atlas-props-furniture:single_bed_ladder_wood_ashen_a_1x1',     // 4 = bunk bed
    'atlas-props-craft:toolbox_metal_gray_a1_1x1',                  // 5 = weapons rack (toolbox)
    'atlas-props-decor:crate_wood_ashen_a_1x1',                     // 6 = crate (gear)
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',               // 7 = barrel
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',           // 8 = chair (guard post)
    'atlas-props-decor:arranged_clutter_a10_1x1',                   // 9 = clutter
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, // row 4
      0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, // row 5
      0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, // row 6
      0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, // row 7
      0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, // row 8
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 9
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 2, // row 4 — armory door
      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, // row 5
      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, // row 6
      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, // row 7
      2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, // row 8
      2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, // row 9 — south wall, main door
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 4, 0, 4, 0, 4, 0, 0, 0, 5, 0, 0, // bunks N side, weapons rack armory
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 4, 0, 4, 0, 4, 0, 0, 0, 6, 0, 0, // bunks, crate armory
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 4, 0, 4, 0, 4, 0, 0, 0, 7, 0, 0, // bunks, barrel armory
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 9, 0, 0, 8, 0, 6, 0, 0, // clutter, guard chair, crate
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
