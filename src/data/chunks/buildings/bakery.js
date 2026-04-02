// 8x6 bakery — stone walls, brick floor, stove on north wall, counter desk, barrels, sacks
export default {
  id: 'bakery',
  type: 'building',
  tags: ['bakery', 'shop', 'settlement', 'indoor'],
  source: 'curated',
  width: 8,
  height: 6,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_01_d1',                      // 1 = brick floor
    'atlas-floors:flat_stones_overlay_a2',                 // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',              // 3 = door
    'atlas-props-furniture:stove_wood_ashen_a1_1x1',       // 4 = stove
    'atlas-props-furniture:school_desk_wood_ashen_a1_1x1', // 5 = desk (counter)
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',     // 6 = barrel
    'atlas-props-decor:sack_black_a1_1x1',               // 7 = sack of flour
    'atlas-props-decor:crate_wood_ashen_a_1x1',          // 8 = crate
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 1, 1, 0, // row 4
      0, 0, 0, 0, 0, 0, 0, 0, // row 5
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 0, 0, 2, // row 4
      2, 2, 2, 3, 3, 2, 2, 2, // row 5 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 4, 4, 0, 0, 6, 6, 0, // stoves on north, barrels NE
      0, 0, 0, 0, 0, 0, 7, 0, // sack
      0, 0, 5, 5, 5, 0, 7, 0, // counter desk, sack
      0, 8, 0, 0, 0, 0, 0, 0, // crate SW
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
