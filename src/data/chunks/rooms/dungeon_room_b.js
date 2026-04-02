// 10x10 dungeon room — corner pillars, clutter and amphoras
export default {
  id: 'dungeon_room_b',
  type: 'room',
  tags: ['dungeon', 'underground', 'combat'],
  source: 'curated',
  width: 10,
  height: 10,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_03_d1',                      // 1 = brick A
    'atlas-floors:brick_floor_03_d2',                      // 2 = brick B
    'atlas-floors:brick_floor_04_d1',                      // 3 = brick C
    'atlas-floors:brick_floor_04_d2',                      // 4 = brick D
    'atlas-floors:brick_floor_04_d3',                      // 5 = brick E
    'atlas-floors:flat_stones_overlay_a3',                 // 6 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 7 = metal door
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 8 = clutter
    'atlas-props-decor:amphora_clay_brown_a1_1x1',         // 9 = amphora
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 3, 4, 5, 1, 2, 3, 0, // row 1
      0, 2, 1, 4, 5, 3, 2, 1, 4, 0, // row 2
      0, 3, 5, 1, 2, 4, 3, 5, 1, 0, // row 3
      0, 4, 3, 2, 1, 5, 4, 3, 2, 0, // row 4
      0, 5, 1, 4, 3, 2, 1, 4, 5, 0, // row 5
      0, 1, 2, 5, 4, 1, 3, 2, 1, 0, // row 6
      0, 3, 4, 1, 2, 5, 4, 1, 3, 0, // row 7
      0, 2, 1, 3, 5, 4, 2, 3, 1, 0, // row 8
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 9
    ],
    // prettier-ignore
    walls: [
      6, 6, 6, 6, 7, 7, 6, 6, 6, 6, // row 0 — north wall, door center
      6, 0, 0, 0, 0, 0, 0, 0, 0, 6, // row 1
      6, 0, 6, 0, 0, 0, 0, 6, 0, 6, // row 2 — pillars at (2,2) and (7,2)
      6, 0, 0, 0, 0, 0, 0, 0, 0, 6, // row 3
      6, 0, 0, 0, 0, 0, 0, 0, 0, 6, // row 4
      6, 0, 0, 0, 0, 0, 0, 0, 0, 6, // row 5
      6, 0, 0, 0, 0, 0, 0, 0, 0, 6, // row 6
      6, 0, 6, 0, 0, 0, 0, 6, 0, 6, // row 7 — pillars at (2,7) and (7,7)
      6, 0, 0, 0, 0, 0, 0, 0, 0, 6, // row 8
      6, 6, 6, 6, 7, 7, 6, 6, 6, 6, // row 9 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 9, 0, 0, 0, 0, 0, 0, 8, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 8, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 9, 0, 0, 0,
      0, 8, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 9, 0, 0, 0, 0, 9, 0,
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
