// 6x6 campsite — fire ring, bedrolls, outdoor
export default {
  id: 'campsite',
  type: 'terrain',
  tags: ['campsite', 'outdoor', 'rest', 'wilderness'],
  source: 'curated',
  width: 6,
  height: 6,
  palette: [
    '',                                                      // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',               // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',               // 2 = grass B
    'atlas-floors:flat_stones_overlay_a1',                  // 3 = stone ground (firepit ring)
    'atlas-props-decor:campfire_stone_ring_a1_1x1',         // 4 = campfire
    'atlas-props-furniture:rolled_bedroll_cloth_beige_d_1x1', // 5 = bedroll
    'atlas-terrain:branch_wood_ashen_a6_1x1',              // 6 = branch/log
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',     // 7 = bucket (water)
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 2, 1, 2,
      2, 1, 3, 3, 1, 2,
      1, 3, 3, 3, 3, 1,
      2, 3, 3, 3, 1, 2,
      1, 2, 1, 2, 2, 1,
      2, 1, 2, 1, 2, 1,
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
      5, 0, 0, 0, 5, 0, // bedrolls N
      0, 0, 0, 0, 0, 0,
      0, 0, 4, 0, 0, 0, // campfire center
      0, 0, 0, 0, 0, 0,
      5, 6, 0, 0, 7, 0, // bedroll S, log, bucket
      0, 0, 0, 6, 0, 5, // logs, bedroll SE
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
