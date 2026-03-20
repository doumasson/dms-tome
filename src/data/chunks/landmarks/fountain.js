// 4x4 fountain — stone water feature, outdoor landmark
export default {
  id: 'fountain_stone',
  type: 'landmark',
  tags: ['fountain', 'outdoor', 'settlement', 'landmark', 'water'],
  source: 'curated',
  width: 4,
  height: 4,
  palette: [
    '',                                                      // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                  // 1 = stone plaza
    'atlas-floors:flat_stones_overlay_a3',                  // 2 = stone surround
    'atlas-structures:well_cover_handle_wood_ashen_a_1x1',  // 3 = fountain basin (reuse well)
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',     // 4 = water bucket
    'atlas-props-decor:amphora_clay_brown_a1_1x1',         // 5 = amphora/planter
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 2, 1,
      2, 1, 1, 2,
      2, 1, 1, 2,
      1, 2, 2, 1,
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
      5, 0, 0, 5, // planters at corners
      0, 3, 3, 0, // fountain basin spans center
      0, 3, 3, 0,
      5, 0, 4, 5, // planters + bucket
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
