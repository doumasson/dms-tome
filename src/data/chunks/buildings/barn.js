// 10x8 barn — stone walls, light wood floor, mostly open interior, sacks/barrels along walls
export default {
  id: 'barn',
  type: 'building',
  tags: ['barn', 'farm', 'settlement', 'indoor'],
  source: 'curated',
  width: 10,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:shack_floor_wood_light_a3',              // 1 = wood floor
    'atlas-floors:flat_stones_overlay_a2',                 // 2 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 3 = door
    'atlas-props-decor:sack_black_a1_1x1',               // 4 = sack
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',    // 5 = barrel
    'atlas-props-decor:crate_wood_ashen_a_1x1',          // 6 = crate
    'atlas-props-furniture:rolled_bedroll_cloth_beige_d_1x1', // 7 = bedroll (hay)
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 4
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 5
      0, 1, 1, 1, 1, 1, 1, 1, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 7
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
      2, 2, 2, 2, 3, 3, 2, 2, 2, 2, // row 7 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 4, 4, 0, 0, 0, 0, 5, 5, 0, // sacks NW, barrels NE
      0, 4, 0, 0, 0, 0, 0, 0, 6, 0, // sack, crate
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // open center
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // open center
      0, 7, 0, 0, 0, 0, 0, 0, 7, 0, // bedrolls (hay)
      0, 5, 6, 0, 0, 0, 0, 6, 5, 0, // barrels + crates along south
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
