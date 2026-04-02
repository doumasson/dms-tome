// 6x6 herb garden with organized rows of bushes and crops
export default {
  id: 'herb_garden',
  type: 'terrain',
  tags: ['garden', 'settlement', 'outdoor'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',         // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',         // 2 = grass B
    'atlas-floors:grass_overlay_medium_c_01',         // 3 = grass C
    'atlas-terrain:bush_multicolor2_a1_1x1',          // 4 = bush
    'atlas-terrain:bush_multicolor2_a2_1x1',          // 5 = bush variant
    'atlas-terrain:cabbage_green_a1',                 // 6 = cabbage
    'atlas-terrain:carrot_a1',                        // 7 = carrot
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 3, 1, 2,
      2, 1, 2, 1, 2, 1,
      1, 3, 1, 2, 1, 3,
      3, 1, 2, 1, 3, 1,
      1, 2, 1, 3, 1, 2,
      2, 1, 3, 1, 2, 1,
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      4, 5, 4, 5, 4, 5,
      0, 0, 0, 0, 0, 0,
      6, 6, 6, 6, 6, 6,
      0, 0, 0, 0, 0, 0,
      7, 7, 7, 7, 7, 7,
      5, 4, 5, 4, 5, 4,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ],
  },
};
