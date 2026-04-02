// 6x6 watchtower — stone walls, stone floor, sparse military interior
export default {
  id: 'watchtower',
  type: 'building',
  tags: ['watchtower', 'military', 'settlement', 'indoor'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                 // 1 = stone floor
    'atlas-floors:flat_stones_overlay_a3',                 // 2 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 3 = door
    'atlas-effects:arranged_armor_a1_1x1',                 // 4 = armor
    'atlas-props-furniture:school_desk_wood_ashen_a1_1x1', // 5 = desk
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',  // 6 = chair
    'atlas-props-decor:crate_wood_ashen_a_1x1',           // 7 = crate
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 0, // row 4
      0, 0, 0, 0, 0, 0, // row 5
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 2, // row 4
      2, 2, 3, 3, 2, 2, // row 5 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0,
      0, 4, 0, 0, 7, 0, // armor NW, crate NE
      0, 0, 0, 0, 0, 0,
      0, 0, 5, 6, 0, 0, // desk + chair center
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ],
  },
};
