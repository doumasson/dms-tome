// 10x8 farm field with crop rows and grass paths
export default {
  id: 'farm_field',
  type: 'terrain',
  tags: ['farm', 'crops', 'outdoor'],
  source: 'curated',
  width: 10,
  height: 8,
  palette: [
    '',                                                // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',         // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',         // 2 = grass B
    'atlas-floors:grass_overlay_medium_c_01',         // 3 = grass C
    'atlas-terrain:corn_a1',                          // 4 = corn
    'atlas-terrain:wheat_field_a1',                   // 5 = wheat
    'atlas-terrain:cabbage_green_a1',                 // 6 = cabbage
    'atlas-terrain:carrot_a1',                        // 7 = carrot
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2,
      1, 1, 2, 1, 1, 2, 1, 1, 2, 1,
      2, 1, 1, 2, 1, 1, 2, 1, 1, 2,
      1, 2, 1, 1, 2, 1, 1, 2, 1, 1,
      2, 1, 2, 1, 1, 2, 1, 1, 2, 1,
      1, 1, 1, 2, 1, 1, 2, 1, 1, 2,
      2, 1, 2, 1, 2, 1, 1, 2, 1, 1,
      1, 2, 1, 1, 2, 1, 2, 1, 2, 1,
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      0, 4, 4, 4, 4, 4, 4, 4, 4, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 5, 5, 5, 5, 5, 5, 5, 5, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 6, 6, 6, 6, 6, 6, 6, 6, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 7, 7, 7, 7, 7, 7, 7, 7, 0,
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
    ],
  },
};
