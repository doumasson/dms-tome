// 8x8 treasure vault — chests, locked door on south, heavy stone walls
// Row 0 is north (top), row 7 is south (bottom)
export default {
  id: 'treasure_vault',
  type: 'room',
  tags: ['dungeon', 'underground', 'treasure', 'vault'],
  source: 'curated',
  width: 8,
  height: 8,
  palette: [
    '',                                                     // 0 = empty
    'atlas-floors:brick_floor_04_d1',                      // 1 = brick floor A
    'atlas-floors:flat_stones_overlay_a3',                  // 2 = stone wall
    'atlas-structures:door_metal_gray_b_1x1',              // 3 = metal door (locked)
    'atlas-props-decor:chest_wood_ashen_a1_1x1',           // 4 = chest
    'atlas-props-decor:crate_wood_ashen_a_1x1',            // 5 = crate
    'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',      // 6 = barrel
    'atlas-props-decor:sack_black_a1_1x1',                 // 7 = sack of loot
    'atlas-props-decor:amphora_clay_brown_a1_1x1',         // 8 = amphora
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
      2, 2, 2, 3, 3, 2, 2, 2, // row 7 — south wall, locked door center
    ],
    // prettier-ignore
    props: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 4, 0, 4, 0, 4, 0, 0, // chests along north wall
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 5, 0, 0, 0, 0, 6, 0, // crate west, barrel east
      0, 0, 0, 7, 0, 7, 0, 0, // sacks center
      0, 8, 0, 0, 0, 0, 8, 0, // amphorae
      0, 4, 0, 0, 0, 4, 0, 0, // chests near door
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
