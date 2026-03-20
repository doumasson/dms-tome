// 10x10 library — stone floor, bookshelf props along walls, reading tables, candelabras
// Row 0 is north (top), row 9 is south (bottom)
export default {
  id: 'library',
  type: 'building',
  tags: ['library', 'settlement', 'indoor'],
  source: 'curated',
  width: 10,
  height: 10,
  palette: [
    '',                                                          // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                      // 1 = stone floor A
    'atlas-floors:flat_stones_overlay_a2',                      // 2 = stone floor B
    'atlas-floors:flat_stones_overlay_a3',                      // 3 = stone wall
    'atlas-structures:door_metal_gray_a_1x1',                   // 4 = door
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',       // 5 = reading table
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',       // 6 = reading chair
    'atlas-props-decor:candles_black_arranged_a1_1x1',          // 7 = candelabra
    'atlas-props-decor:arranged_clutter_a10_1x1',               // 8 = books/scrolls
    'atlas-props-decor:amphora_clay_brown_a1_1x1',              // 9 = scroll/vase
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 1
      0, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 2
      0, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 3
      0, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 4
      0, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 5
      0, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 6
      0, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 7
      0, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 8
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 9
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 0 — north wall
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 3
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 4
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 5
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 6
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 7
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 8
      3, 3, 3, 3, 4, 4, 3, 3, 3, 3, // row 9 — south wall, double door
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 8, 8, 0, 0, 0, 0, 8, 8, 0, // bookshelves along N wall
      0, 8, 0, 0, 0, 0, 0, 0, 8, 0, // bookshelves on E/W walls
      0, 8, 0, 7, 0, 5, 0, 7, 8, 0, // candelabras + reading table
      0, 8, 0, 0, 6, 6, 0, 0, 8, 0, // chairs at table
      0, 8, 0, 5, 6, 6, 5, 0, 8, 0, // more reading areas
      0, 8, 0, 0, 0, 0, 0, 0, 8, 0,
      0, 8, 0, 7, 0, 9, 0, 7, 8, 0, // candelabras + scroll vases
      0, 8, 8, 0, 0, 0, 0, 8, 8, 0, // bookshelves near south
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
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
