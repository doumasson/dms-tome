// 10x6 cliff ledge — rocky floor, boulders along north edge, narrow walkable path
// Row 0 is north (top), row 5 is south (bottom)
// Boulder wall along rows 0-1 (north), open path rows 2-5
export default {
  id: 'cliff_ledge',
  type: 'terrain',
  tags: ['cliff', 'outdoor', 'elevation'],
  source: 'curated',
  width: 10,
  height: 6,
  palette: [
    '',                                                 // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',              // 1 = rocky floor A
    'atlas-floors:flat_stones_overlay_a2',              // 2 = rocky floor B
    'atlas-floors:flat_stones_overlay_a3',              // 3 = cliff wall/boulder (solid)
    'atlas-terrain:bush_multicolor2_a1_1x1',            // 4 = scrub brush
    'atlas-props-decor:amphora_clay_brown_a1_1x1',      // 5 = boulder/rock pile
    'atlas-props-decor:arranged_clutter_a10_1x1',       // 6 = gravel/scree
    'atlas-terrain:branch_wood_ashen_a6_1x1',           // 7 = dead branch
  ],
  layers: {
    // prettier-ignore
    floor: [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 0 — cliff face (wall)
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 1 — cliff face
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, // row 2 — ledge path
      2, 1, 2, 1, 2, 1, 2, 1, 2, 1, // row 3 — ledge path
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2, // row 4 — ledge outer edge
      2, 1, 2, 1, 2, 1, 2, 1, 2, 1, // row 5 — ledge outer edge
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 0 — cliff wall
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, // row 1 — cliff wall
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 2 — open
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 3
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 4
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 5
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      5, 0, 5, 0, 0, 5, 0, 0, 5, 0, // boulders at cliff base
      0, 4, 0, 6, 0, 0, 6, 0, 4, 0, // scrub + gravel
      6, 0, 0, 0, 7, 0, 0, 6, 0, 0, // dead branch + gravel
      0, 0, 4, 0, 0, 0, 0, 0, 4, 0,
      4, 0, 0, 6, 0, 5, 0, 0, 0, 4, // scrub at outer edge
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
