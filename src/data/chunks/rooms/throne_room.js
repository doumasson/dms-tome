// 14x14 throne room — boss arena with throne dais, pillars, doors on south
// Row 0 is north (top), row 13 is south (bottom)
export default {
  id: 'throne_room',
  type: 'room',
  tags: ['dungeon', 'underground', 'boss', 'combat', 'throne'],
  source: 'curated',
  width: 14,
  height: 14,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_03_d1',                      // 1 = brick floor A
    'atlas-floors:brick_floor_03_d2',                      // 2 = brick floor B
    'atlas-floors:flat_stones_overlay_a3',                  // 3 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 4 = metal door
    'atlas-floors:flat_stones_overlay_a1',                  // 5 = dais stone (raised)
    'atlas-structures:pillar_stone_a_1x1',                 // 6 = pillar
    'atlas-props-furniture:armchair_fabric_black_a1_1x1',  // 7 = throne (chair)
    'atlas-props-decor:amphora_clay_brown_a1_1x1',         // 8 = amphora
    'atlas-props-decor:arranged_clutter_a10_1x1',          // 9 = clutter
    'atlas-props-decor:banner_cloth_red_a1_1x1',           // 10 = banner
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 1
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 2
      0, 1, 2, 5, 5, 5, 5, 5, 5, 5, 5, 2, 1, 0, // row 3 — dais begin
      0, 2, 1, 5, 5, 5, 5, 5, 5, 5, 5, 1, 2, 0, // row 4
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 5
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 6
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 7
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 8
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 9
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 10
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 11
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 12
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 13
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 0  — north wall
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 3
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 4
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 5
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 6
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 7
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 8
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 9
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 10
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 11
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 12
      3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, // row 13 — south wall, double door
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, // pillars near dais
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0,10, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0,10, 0, // throne center, banners flanking
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, // pillars mid
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, // amphorae at walls
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, // pillars lower
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, // clutter near south
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
