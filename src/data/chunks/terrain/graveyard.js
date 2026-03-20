// 10x8 graveyard — headstones, dirt paths, outdoor
export default {
  id: 'graveyard',
  type: 'terrain',
  tags: ['graveyard', 'outdoor', 'undead', 'settlement'],
  source: 'curated',
  width: 10,
  height: 8,
  palette: [
    '',                                                      // 0 = empty
    'atlas-floors:grass_overlay_medium_a_01',               // 1 = grass A
    'atlas-floors:grass_overlay_medium_b_01',               // 2 = grass B
    'atlas-floors:flat_stones_overlay_a2',                  // 3 = dirt path stone
    'atlas-terrain:gravestone_stone_gray_a1_1x1',           // 4 = headstone A
    'atlas-terrain:gravestone_stone_gray_b1_1x1',           // 5 = headstone B
    'atlas-terrain:bush_multicolor2_a1_1x1',                // 6 = bush/overgrowth
    'atlas-props-decor:arranged_clutter_a10_1x1',           // 7 = clutter (leaves)
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 2, 1, 2, 1, 2, 1, 2,
      2, 1, 2, 1, 2, 1, 2, 1, 2, 1,
      1, 2, 3, 3, 3, 3, 3, 1, 2, 1,
      2, 1, 3, 1, 2, 1, 3, 2, 1, 2,
      1, 2, 3, 2, 1, 2, 3, 1, 2, 1,
      2, 1, 3, 1, 2, 1, 3, 2, 1, 2,
      1, 2, 3, 3, 3, 3, 3, 1, 2, 1,
      2, 1, 2, 1, 2, 1, 2, 1, 2, 1,
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
      6, 0, 0, 0, 0, 0, 0, 0, 0, 6, // bushes corners
      0, 4, 0, 0, 0, 0, 0, 5, 0, 0, // headstones N
      0, 0, 0, 4, 0, 5, 0, 0, 0, 0,
      0, 5, 0, 0, 0, 0, 0, 4, 0, 0, // headstones mid
      0, 0, 0, 5, 0, 4, 0, 0, 0, 0,
      0, 4, 0, 0, 0, 0, 0, 5, 0, 0, // headstones S
      0, 0, 7, 0, 0, 0, 7, 0, 0, 0, // clutter
      6, 0, 0, 0, 0, 0, 0, 0, 0, 6, // bushes corners
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
