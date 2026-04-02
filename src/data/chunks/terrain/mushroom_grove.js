// 8x8 underdark mushroom grove with bioluminescent plants and stalagmites
export default {
  id: 'mushroom_grove',
  type: 'terrain',
  tags: ['underdark', 'mushroom', 'underground'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                                  // 0 = empty
    'atlas-floors:mycelial_overlay_a_01',                               // 1 = mycelial A
    'atlas-floors:mycelial_overlay_b_01',                               // 2 = mycelial B
    'atlas-terrain:ceremorph_blue_bioluminescent_plant_a10_1x1',        // 3 = glowing plant
    'atlas-props-decor:stalagmite_hole_rock_earthy_a10_1x1',           // 4 = stalagmite
    'atlas-props-decor:underdark_crystal_rock_sliver_blue_a10_1x1',    // 5 = crystal
  ],
  layers: {
    // prettier-ignore
    floor: [
      1, 2, 1, 1, 2, 1, 2, 1,
      2, 1, 2, 1, 1, 2, 1, 2,
      1, 1, 1, 2, 1, 1, 2, 1,
      2, 1, 2, 1, 2, 1, 1, 2,
      1, 2, 1, 1, 1, 2, 1, 1,
      1, 1, 2, 1, 2, 1, 2, 1,
      2, 1, 1, 2, 1, 1, 1, 2,
      1, 2, 1, 1, 2, 1, 2, 1,
    ],
    // prettier-ignore
    walls: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
    // prettier-ignore
    props: [
      4, 0, 3, 0, 0, 3, 0, 4,
      0, 3, 0, 0, 5, 0, 3, 0,
      0, 0, 5, 3, 0, 0, 0, 0,
      3, 0, 0, 4, 0, 3, 0, 5,
      0, 5, 0, 0, 3, 0, 4, 0,
      0, 0, 3, 0, 0, 5, 0, 0,
      4, 0, 0, 5, 0, 0, 3, 0,
      0, 3, 0, 0, 4, 0, 0, 3,
    ],
    // prettier-ignore
    roof: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
