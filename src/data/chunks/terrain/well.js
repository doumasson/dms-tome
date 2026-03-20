// 3x3 well/fountain — small outdoor landmark
export default {
  id: 'well_stone',
  type: 'terrain',
  tags: ['well', 'outdoor', 'settlement', 'landmark'],
  source: 'curated',
  width: 3,
  height: 3,
  palette: [
    '',                                                               // 0 = empty
    'atlas-floors:flat_stones_overlay_a1',                           // 1 = stone ground
    'atlas-structures:well_cover_handle_wood_ashen_a_1x1',           // 2 = well
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',              // 3 = bucket
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 1, 1,
      1, 1, 1,
      1, 1, 1,
    ],
    // prettier-ignore
    walls: [
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ],
    // prettier-ignore
    props: [
      0, 0, 0,
      0, 2, 0, // well in center
      0, 0, 3, // bucket nearby
    ],
    // prettier-ignore
    roof: [
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ],
  },
};
