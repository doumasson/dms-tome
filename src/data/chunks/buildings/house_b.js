// 6x6 house variant B — stone walls, light wood floor, bed NE, desk SW
export default {
  id: 'house_b',
  type: 'building',
  tags: ['house', 'settlement', 'indoor'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                         // 0 = empty
    'atlas-floors:shack_floor_wood_light_a3',                  // 1 = wood floor
    'atlas-floors:flat_stones_overlay_a2',                     // 2 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                  // 3 = door
    'atlas-props-furniture:single_bed_ladder_wood_ashen_a_1x1', // 4 = bed
    'atlas-props-furniture:school_desk_wood_ashen_a1_1x1',     // 5 = desk
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',      // 6 = chair
    'atlas-props-decor:candles_black_arranged_a1_1x1',        // 7 = candles
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
      0, 0, 0, 0, 4, 0, // bed NE
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 7, 0, 0, // candles
      0, 5, 6, 0, 0, 0, // desk + chair SW
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
