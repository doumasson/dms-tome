// 8x8 flooded room — water patches mixed with brick, debris and rocks
export default {
  id: 'flooded_room',
  type: 'room',
  tags: ['sewer', 'underground', 'water'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_03_d1',                      // 1 = brick A
    'atlas-floors:brick_floor_03_d2',                      // 2 = brick B
    'atlas-floors:flat_stones_overlay_a1',                 // 3 = water patch
    'atlas-floors:brick_floor_04_d1',                      // 4 = brick C
    'atlas-floors:flat_stones_overlay_a3',                 // 5 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 6 = metal door
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 7 = clutter (debris)
    'atlas-props-decor:rock_stone_earthy_a10_1x1',         // 8 = rock
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 3, 1, 2, 3, 1, 0, // row 1
      0, 3, 1, 3, 3, 1, 2, 0, // row 2
      0, 1, 2, 3, 1, 3, 4, 0, // row 3
      0, 4, 3, 1, 3, 2, 3, 0, // row 4
      0, 3, 1, 3, 1, 3, 1, 0, // row 5
      0, 1, 2, 4, 3, 1, 2, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      5, 5, 5, 6, 6, 5, 5, 5, // row 0 — north wall, door center
      5, 0, 0, 0, 0, 0, 0, 5, // row 1
      5, 0, 0, 0, 0, 0, 0, 5, // row 2
      5, 0, 0, 0, 0, 0, 0, 5, // row 3
      5, 0, 0, 0, 0, 0, 0, 5, // row 4
      5, 0, 0, 0, 0, 0, 0, 5, // row 5
      5, 0, 0, 0, 0, 0, 0, 5, // row 6
      5, 5, 5, 6, 6, 5, 5, 5, // row 7 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 8, 0, 0, 0, 0, 7, 0, // rock, debris
      0, 0, 0, 7, 0, 0, 0, 0, // debris
      0, 0, 8, 0, 0, 0, 0, 0, // rock
      0, 7, 0, 0, 0, 8, 0, 0, // debris, rock
      0, 0, 0, 0, 7, 0, 0, 0, // debris
      0, 0, 0, 8, 0, 0, 7, 0, // rock, debris
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
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
