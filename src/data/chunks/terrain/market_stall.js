// 4x4 open-air market stall — no walls, no roof
export default {
  id: 'market_stall',
  type: 'terrain',
  tags: ['market', 'outdoor', 'settlement'],
  source: 'curated',
  width: 4,
  height: 4,
  palette: [
    '',                                                           // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',                    // 1 = grass
    'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',        // 2 = table (counter)
    'atlas-props-decor:crate_wood_ashen_a_1x1',                  // 3 = crate
    'atlas-props-decor:sack_black_a1_1x1',                       // 4 = sack
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',            // 5 = barrel
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      3, 2, 2, 5, // crate, counter, counter, barrel
      0, 0, 0, 0,
      0, 0, 0, 4, // sack
      0, 0, 0, 0,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ],
  },
};
