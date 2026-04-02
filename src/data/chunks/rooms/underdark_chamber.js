// 10x10 underdark chamber — mycelial floor, glowing plants, stalagmites, crystals
export default {
  id: 'underdark_chamber',
  type: 'room',
  tags: ['underdark', 'underground', 'combat'],
  source: 'curated',
  width: 10,
  height: 10,
  palette: [
    '',                                                                       // 0 = empty
    'atlas-floors:mycelial_overlay_a_01',                                    // 1 = mycelial A
    'atlas-floors:mycelial_overlay_b_01',                                    // 2 = mycelial B
    'atlas-floors:flat_stones_overlay_a3',                                   // 3 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',                                // 4 = metal door
    'atlas-terrain:ceremorph_blue_bioluminescent_plant_a10_1x1',             // 5 = glowing plant
    'atlas-props-decor:stalagmite_hole_rock_earthy_a10_1x1',                // 6 = stalagmite
    'atlas-props-decor:underdark_crystal_rock_sliver_blue_a10_1x1',         // 7 = crystal
    'atlas-props-decor:rock_stone_earthy_a10_1x1',                          // 8 = rock
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 1
      0, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 2
      0, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 3
      0, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 4
      0, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 5
      0, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 6
      0, 1, 2, 1, 2, 1, 2, 1, 2, 0, // row 7
      0, 2, 1, 2, 1, 2, 1, 2, 1, 0, // row 8
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // row 9
    ],
    // prettier-ignore
    walls: [
      3, 3, 3, 3, 4, 4, 3, 3, 3, 3, // row 0 — north wall, door center
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 1
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 2
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 3
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 4
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 5
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 6
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 7
      3, 0, 0, 0, 0, 0, 0, 0, 0, 3, // row 8
      3, 3, 3, 3, 4, 4, 3, 3, 3, 3, // row 9 — south wall, door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 6, 0, 0, 0, 0, 0, 0, 5, 0, // stalagmite, glowing plant
      0, 0, 0, 5, 0, 0, 7, 0, 0, 0, // glowing plant, crystal
      0, 0, 7, 0, 0, 0, 0, 8, 0, 0, // crystal, rock
      0, 5, 0, 0, 6, 0, 0, 0, 0, 0, // glowing plant, stalagmite
      0, 0, 0, 0, 0, 0, 5, 0, 6, 0, // glowing plant, stalagmite
      0, 0, 8, 0, 0, 7, 0, 0, 0, 0, // rock, crystal
      0, 7, 0, 0, 0, 0, 0, 5, 0, 0, // crystal, glowing plant
      0, 0, 0, 6, 0, 0, 0, 0, 8, 0, // stalagmite, rock
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
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};
