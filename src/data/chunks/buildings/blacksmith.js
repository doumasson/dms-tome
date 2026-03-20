// 8x8 blacksmith — stone walls, stone floor, forge + anvil, door on south
// Row 0 is north (top), row 7 is south (bottom)
export default {
  id: 'blacksmith_forge',
  type: 'building',
  tags: ['blacksmith', 'forge', 'settlement', 'indoor'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:flat_stones_overlay_a3',                 // 1 = stone floor
    'atlas-floors:flat_stones_overlay_a2',                 // 2 = stone wall (solid fill)
    'atlas-structures:door_metal_gray_a_1x1',              // 3 = door
    'atlas-props-craft:anvil_metal_gray_a1_1x1',           // 4 = anvil
    'atlas-props-craft:bellows_wood_ashen_1x1',            // 5 = bellows (forge)
    'atlas-props-craft:cobbler_hammer_wood_ashen_a_1x1',   // 6 = hammer
    'atlas-props-craft:toolbox_metal_gray_a1_1x1',         // 7 = toolbox
    'atlas-props-decor:bucket_pail_metal_gray_a1_1x1',    // 8 = bucket
  ],
  layers: {
    // prettier-ignore
    floor: [
      0, 0, 0, 0, 0, 0, 0, 0, // row 0
      0, 1, 1, 1, 1, 1, 1, 0, // row 1
      0, 1, 1, 1, 1, 1, 1, 0, // row 2
      0, 1, 1, 1, 1, 1, 1, 0, // row 3
      0, 1, 1, 1, 1, 1, 1, 0, // row 4
      0, 1, 1, 1, 1, 1, 1, 0, // row 5
      0, 1, 1, 1, 1, 1, 1, 0, // row 6
      0, 0, 0, 0, 0, 0, 0, 0, // row 7
    ],
    // prettier-ignore
    walls: [
      2, 2, 2, 2, 2, 2, 2, 2, // row 0 — north wall
      2, 0, 0, 0, 0, 0, 0, 2, // row 1
      2, 0, 0, 0, 0, 0, 0, 2, // row 2
      2, 0, 0, 0, 0, 0, 0, 2, // row 3
      2, 0, 0, 0, 0, 0, 0, 2, // row 4
      2, 0, 0, 0, 0, 0, 0, 2, // row 5
      2, 0, 0, 0, 0, 0, 0, 2, // row 6
      2, 2, 2, 3, 3, 2, 2, 2, // row 7 — south wall, door at center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 5, 0, 0, 0, 0, 7, 0, // bellows NW, toolbox NE
      0, 0, 0, 4, 0, 0, 0, 0, // anvil center-left
      0, 0, 0, 0, 0, 6, 0, 0, // hammer
      0, 8, 0, 0, 0, 0, 0, 0, // bucket
      0, 0, 0, 0, 0, 0, 7, 0, // toolbox SE
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
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
