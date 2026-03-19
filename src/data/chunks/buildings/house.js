// 6x6 small house — stone walls, wood floor, door on south
export default {
  id: 'house_small',
  type: 'building',
  tags: ['house', 'settlement', 'indoor'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:shack_floor_wood_light_a3',              // 1 = wood floor
    'atlas-structures:wall_stone_earthy_a_connector_a_1x1', // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',              // 3 = door
    'atlas-props-furniture:single_bed_ladder_wood_ashen_a_1x1', // 4 = bed
    'atlas-props-furniture:rolled_bedroll_cloth_beige_d_1x1',   // 5 = bedroll
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
      0, 4, 0, 0, 0, 0, // bed in top-left corner
      0, 0, 0, 0, 5, 0, // bedroll
      0, 0, 0, 0, 0, 0,
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
