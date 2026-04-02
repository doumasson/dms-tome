// 8x8 crypt room — amphora urns in rows, candles, cobwebs
export default {
  id: 'crypt_room_b',
  type: 'room',
  tags: ['crypt', 'underground', 'religious'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_03_d1',                      // 1 = brick A
    'atlas-floors:brick_floor_03_d2',                      // 2 = brick B
    'atlas-floors:brick_floor_04_d1',                      // 3 = brick C
    'atlas-floors:flat_stones_overlay_a3',                 // 4 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 5 = metal door
    'atlas-props-decor:amphora_clay_brown_a1_1x1',         // 6 = amphora (urn)
    'atlas-props-decor:candles_black_arranged_a1_1x1',     // 7 = candles
    'atlas-effects:cobweb_black_a1_1x1',                   // 8 = cobweb
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
      0, 8, 0, 0, 0, 0, 8, 0, // cobwebs in corners
      0, 7, 6, 0, 0, 6, 7, 0, // candles flanking amphora urns
      0, 0, 6, 0, 0, 6, 0, 0, // urns row
      0, 0, 6, 0, 0, 6, 0, 0, // urns row
      0, 7, 6, 0, 0, 6, 7, 0, // candles flanking amphora urns
      0, 8, 0, 0, 0, 0, 8, 0, // cobwebs in corners
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
