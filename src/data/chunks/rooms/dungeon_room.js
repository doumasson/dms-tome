// 8x8 dungeon room — stone walls, brick floor, doors on north and south
export default {
  id: 'dungeon_room_basic',
  type: 'room',
  tags: ['dungeon', 'underground', 'combat'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_03_d1',                      // 1 = brick floor A
    'atlas-floors:brick_floor_03_d2',                      // 2 = brick floor B
    'atlas-floors:brick_floor_04_d1',                      // 3 = brick floor C
    'atlas-structures:wall_stone_earthy_a_connector_a_1x1', // 4 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 5 = metal door
    'atlas-props-decor:amphora_clay_brown_a1_1x1',         // 6 = amphora
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 7 = clutter
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 3, 1, 2, 0, // row 1
      0, 2, 1, 3, 1, 2, 1, 0, // row 2
      0, 1, 3, 1, 2, 1, 3, 0, // row 3
      0, 3, 1, 2, 1, 3, 1, 0, // row 4
      0, 1, 2, 1, 3, 1, 2, 0, // row 5
      0, 2, 1, 3, 1, 2, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      4, 4, 4, 5, 5, 4, 4, 4, // row 0 — north wall, door center
      4, 0, 0, 0, 0, 0, 0, 4, // row 1
      4, 0, 0, 0, 0, 0, 0, 4, // row 2
      4, 0, 0, 0, 0, 0, 0, 4, // row 3
      4, 0, 0, 0, 0, 0, 0, 4, // row 4
      4, 0, 0, 0, 0, 0, 0, 4, // row 5
      4, 0, 0, 0, 0, 0, 0, 4, // row 6
      4, 4, 4, 5, 5, 4, 4, 4, // row 7 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 6, 0, 0, 0, 0, 0, 0, // amphora in corner
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 7, 0, // clutter
      0, 0, 0, 0, 0, 0, 6, 0, // amphora
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
