// 8x6 shop — stone walls, wood floor, shelves + counter, door on south
// Row 0 is north (top), row 5 is south (bottom)
export default {
  id: 'shop_general',
  type: 'building',
  tags: ['shop', 'settlement', 'indoor', 'market'],
  source: 'curated',
  width: 8,
  height: 6,
  palette: [
    '',                                                               // 0 = empty
    'atlas-floors:shack_floor_wood_dark_a3',                         // 1 = wood floor
    'atlas-floors:flat_stones_overlay_a2',                           // 2 = stone wall (solid fill)
    'atlas-structures:door_metal_gray_a_1x1',                        // 3 = door
    'atlas-props-furniture:scroll_shelf_wood_ashen_filled_a2_1x1',   // 4 = shelf (filled)
    'atlas-props-decor:crate_wood_ashen_a_1x1',                      // 5 = crate
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',            // 6 = counter table
    'atlas-props-decor:sack_black_a1_1x1',                           // 7 = sack
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
      2, 2, 2, 3, 3, 2, 2, 2, // row 5 — south wall, door at center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 4, 4, 0, 0, 4, 4, 0, // shelves along north wall
      0, 5, 0, 0, 0, 0, 7, 0, // crate SW, sack SE
      0, 0, 0, 6, 6, 0, 0, 0, // counter in center
      0, 0, 0, 0, 0, 0, 5, 0, // crate near door
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
