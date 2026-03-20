// 10x10 sewer junction — brick floor, water channel down center, grates, walkways
// Row 0 is north (top), row 9 is south (bottom)
// Layout:
//   Water channel: cols 4-5 (center)
//   Walkways: cols 1-3 (west) and cols 6-8 (east)
export default {
  id: 'sewer_junction',
  type: 'room',
  tags: ['sewer', 'underground'],
  source: 'curated',
  width: 10,
  height: 10,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_03_d1',                       // 1 = brick floor (walkway)
    'atlas-floors:brick_floor_03_d2',                       // 2 = brick floor B
    'atlas-floors:flat_stones_overlay_a3',                  // 3 = stone wall
    'atlas-floors:brick_floor_04_d1',                       // 4 = water channel floor (dark)
    'atlas-structures:door_metal_gray_b_1x1',               // 5 = grate/door opening
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',      // 6 = bucket/grate prop
    'atlas-props-decor:arranged_clutter_a10_1x1',           // 7 = sludge/clutter
    'atlas-props-decor:amphora_clay_brown_a1_1x1',          // 8 = barrel/debris
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 4, 4, 1, 2, 1, 0, // row 1
      0, 2, 1, 2, 4, 4, 2, 1, 2, 0, // row 2
      0, 1, 2, 1, 4, 4, 1, 2, 1, 0, // row 3
      0, 2, 1, 2, 4, 4, 2, 1, 2, 0, // row 4
      0, 1, 2, 1, 4, 4, 1, 2, 1, 0, // row 5
      0, 2, 1, 2, 4, 4, 2, 1, 2, 0, // row 6
      0, 1, 2, 1, 4, 4, 1, 2, 1, 0, // row 7
      0, 2, 1, 2, 4, 4, 2, 1, 2, 0, // row 8
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 9
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 5, 5, 3, 3, 3, 3, // row 0 — north wall, channel opening
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 3
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 4
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 5
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 6
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 7
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 8
      3, 3, 3, 3, 5, 5, 3, 3, 3, 3, // row 9 — south wall, channel exit
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 6, 0, 0, 6, 0, 0, 0, // grates at channel edges N
      0, 0, 8, 0, 0, 0, 0, 8, 0, 0, // debris on walkways
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 7, 0, 0, 0, 0, 0, 0, 7, 0, // sludge puddles
      0, 0, 0, 6, 0, 0, 6, 0, 0, 0, // grates mid
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 8, 0, 0, 0, 0, 7, 0, 0,
      0, 0, 0, 6, 0, 0, 6, 0, 0, 0, // grates S
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
