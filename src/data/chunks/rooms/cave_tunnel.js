// 16x4 cave tunnel — narrow passage, rough stone, torch sconces on walls
// Row 0 is north (top), row 3 is south (bottom)
export default {
  id: 'cave_tunnel',
  type: 'room',
  tags: ['cave', 'underground', 'corridor'],
  source: 'curated',
  width: 16,
  height: 4,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:flat_stones_overlay_a3',                  // 1 = stone floor A
    'atlas-floors:flat_stones_overlay_a1',                  // 2 = stone floor B
    'atlas-floors:flat_stones_overlay_a2',                  // 3 = cave wall
    'atlas-props-decor:amphora_clay_brown_a1_1x1',          // 4 = rubble/debris
    'atlas-props-decor:arranged_clutter_a10_1x1',           // 5 = clutter/pebbles
    'atlas-props-decor:candles_black_arranged_a1_1x1',      // 6 = torch sconce (candle stand-in)
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 1 — tunnel floor
      0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 2 — tunnel floor
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 3
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 0 — north wall
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 3 — south wall
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 6, 0, 0, 4, 0, 0, 6, 0, 0, 5, 0, 0, 6, 0, // torches + debris on north wall side
      0, 0, 0, 0, 5, 0, 0, 4, 0, 0, 0, 0, 6, 0, 0, 0, // debris + torch on south wall side
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
