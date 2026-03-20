// 12x8 prison cells — cell block with guard post, doors on east and west walls
// Row 0 is north (top), row 7 is south (bottom)
// Layout:
//   Guard corridor: rows 1-6, cols 4-7
//   Cell block west: rows 1-6, cols 1-3
//   Cell block east: rows 1-6, cols 8-10
export default {
  id: 'prison_cells',
  type: 'room',
  tags: ['dungeon', 'underground', 'prison', 'combat'],
  source: 'curated',
  width: 12,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_03_d1',                      // 1 = brick floor (cells)
    'atlas-floors:flat_stones_overlay_a3',                  // 2 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 3 = metal door (cell bars)
    'atlas-floors:brick_floor_04_d1',                      // 4 = brick floor (corridor)
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',  // 5 = guard chair
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',  // 6 = guard table
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 7 = clutter
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',     // 8 = bucket (cell)
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 0, 4, 4, 4, 4, 0, 1, 1, 0, // row 1
      0, 1, 1, 0, 4, 4, 4, 4, 0, 1, 1, 0, // row 2
      0, 1, 1, 0, 4, 4, 4, 4, 0, 1, 1, 0, // row 3 — cell divider
      0, 1, 1, 0, 4, 4, 4, 4, 0, 1, 1, 0, // row 4
      0, 1, 1, 0, 4, 4, 4, 4, 0, 1, 1, 0, // row 5
      0, 1, 1, 0, 4, 4, 4, 4, 0, 1, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 2, // row 1 — cell doors (col 3 & 8)
      2, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, // row 2
      2, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, // row 3 — cell divider wall
      2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, // row 4 — cell midwall
      2, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 2, // row 5 — cell doors
      2, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, // row 6
      2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, // row 7 — south wall
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 8, 0, 0, 0, 0, 0, 0, 8, 0, 0, // buckets in cells
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 6, 5, 0, 0, 0, 0, 0, // guard table + chair
      0, 0, 8, 0, 0, 0, 0, 0, 0, 8, 0, 0, // buckets in lower cells
      0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, // clutter
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
    ],
  },
};
