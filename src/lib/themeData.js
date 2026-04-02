/**
 * Theme configuration for procedural map generation.
 * Defines terrain tiles, road tiles, scatter props, and blocking tiles per theme.
 * Extracted from areaBuilder.js to keep file sizes manageable and centralize tile data.
 */

/* ── Dungeon theme detection ────────────────────────────────── */

export const DUNGEON_THEMES = new Set(['dungeon', 'cave', 'crypt', 'sewer', 'underdark'])

/* ── Terrain floor tiles per theme ──────────────────────────── */
// Each theme gets 6-12 variants for noise-based blending

// Each theme uses visually compatible tiles from the same atlas family.
// Primary tiles cover ~80%, secondary ~20% (accent edges/patches).
// No cross-family mixing within a single noise region.
export const THEME_TERRAIN = {
  village: [
    'atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01',
    'atlas-floors:grass_overlay_medium_c_01', 'atlas-floors:grass_overlay_long_a_01',
    'atlas-floors:grass_overlay_long_b_01',   'atlas-floors:grass_overlay_long_c_01',
  ],
  forest: [
    'atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01',
    'atlas-floors:grass_overlay_medium_c_01', 'atlas-floors:grass_overlay_long_a_01',
    'atlas-floors:grass_overlay_long_b_01',   'atlas-floors:grass_overlay_long_c_01',
    'atlas-floors:grass_overlay_medium_a_02', 'atlas-floors:grass_overlay_medium_b_02',
    'atlas-floors:grass_overlay_medium_c_02',
  ],
  dungeon: [
    'atlas-floors:brick_floor_03_d1', 'atlas-floors:brick_floor_03_d2',
    'atlas-floors:brick_floor_03_d3', 'atlas-floors:brick_floor_03_d4',
  ],
  cave: [
    'atlas-floors:flat_stones_overlay_a1', 'atlas-floors:flat_stones_overlay_a2',
    'atlas-floors:flat_stones_overlay_a3',
  ],
  town: [
    'atlas-floors:brick_floor_01_d1', 'atlas-floors:brick_floor_01_d2',
    'atlas-floors:brick_floor_01_d3', 'atlas-floors:brick_floor_01_d4',
    'atlas-floors:brick_floor_02_d1', 'atlas-floors:brick_floor_02_d2',
  ],
  crypt: [
    'atlas-floors:brick_floor_03_d1', 'atlas-floors:brick_floor_03_d2',
    'atlas-floors:brick_floor_03_d3', 'atlas-floors:brick_floor_03_d4',
  ],
  sewer: [
    'atlas-floors:brick_floor_04_d1', 'atlas-floors:brick_floor_04_d2',
    'atlas-floors:brick_floor_04_d3', 'atlas-floors:brick_floor_04_d4',
  ],
  mountain: [
    'atlas-floors:flat_stones_overlay_a1', 'atlas-floors:flat_stones_overlay_a2',
    'atlas-floors:flat_stones_overlay_a3',
  ],
  desert: [
    'atlas-floors:flat_stones_overlay_a1', 'atlas-floors:flat_stones_overlay_a2',
    'atlas-floors:flat_stones_overlay_a3',
  ],
  coastal: [
    'atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01',
    'atlas-floors:grass_overlay_medium_c_01',
  ],
  swamp: [
    'atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01',
    'atlas-floors:grass_overlay_medium_c_01', 'atlas-floors:grass_overlay_long_a_01',
    'atlas-floors:mycelial_overlay_a_01',     'atlas-floors:mycelial_overlay_a_02',
    'atlas-floors:mycelial_overlay_b_01',
  ],
  graveyard: [
    'atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01',
    'atlas-floors:flat_stones_overlay_a1', 'atlas-floors:flat_stones_overlay_a2',
  ],
  // --- New themes ---
  underdark: [
    'atlas-floors:mycelial_overlay_a_01', 'atlas-floors:mycelial_overlay_a_02',
    'atlas-floors:mycelial_overlay_a_03', 'atlas-floors:mycelial_overlay_b_01',
    'atlas-floors:mycelial_overlay_b_02', 'atlas-floors:mycelial_overlay_b_03',
  ],
  drow: [
    'atlas-floors:drow_overlay_crystal_01_a1', 'atlas-floors:drow_overlay_crystal_01_a2',
    'atlas-floors:drow_overlay_crystal_01_a3', 'atlas-floors:drow_overlay_crystal_01_a4',
    'atlas-floors:drow_overlay_crystal_02_a1', 'atlas-floors:drow_overlay_crystal_02_a2',
  ],
  farm: [
    'atlas-floors:grass_overlay_medium_a_01', 'atlas-floors:grass_overlay_medium_b_01',
    'atlas-floors:grass_overlay_medium_c_01', 'atlas-floors:grass_overlay_long_a_01',
    'atlas-floors:grass_overlay_long_b_01',
  ],
  ruins: [
    'atlas-floors:flat_stones_overlay_a1', 'atlas-floors:flat_stones_overlay_a2',
    'atlas-floors:flat_stones_overlay_a3', 'atlas-floors:grass_overlay_medium_a_01',
    'atlas-floors:grass_overlay_medium_b_01',
  ],
}

/* ── Road tiles per theme ───────────────────────────────────── */

export const THEME_ROAD = {
  village:   'atlas-floors:brick_floor_01_d1',
  forest:    'atlas-floors:brick_floor_02_d1',
  dungeon:   'atlas-floors:brick_floor_03_d1',
  cave:      'atlas-floors:brick_floor_04_d1',
  town:      'atlas-floors:brick_floor_01_d3',
  crypt:     'atlas-floors:brick_floor_03_d1',
  sewer:     'atlas-floors:brick_floor_04_d1',
  mountain:  'atlas-floors:flat_stones_overlay_a1',
  desert:    'atlas-floors:flat_stones_overlay_a2',
  coastal:   'atlas-floors:brick_floor_01_d2',
  swamp:     'atlas-floors:grass_overlay_medium_a_01',
  graveyard: 'atlas-floors:brick_floor_03_d2',
  underdark: 'atlas-floors:mycelial_overlay_a_glow_01',
  drow:      'atlas-floors:drow_overlay_crystal_01_a1',
  farm:      'atlas-floors:flat_stones_overlay_a1',
  ruins:     'atlas-floors:brick_floor_01_d3',
}

/* ── Road width per theme ───────────────────────────────────── */

export const THEME_ROAD_WIDTH = {
  village: 2, town: 2, coastal: 2, farm: 2,
  forest: 1, mountain: 1, swamp: 1, desert: 1,
  dungeon: 2, cave: 2, crypt: 2, sewer: 2,
  underdark: 1, drow: 2, ruins: 1, graveyard: 2,
}

/* ── Scatter decoration config per theme ────────────────────── */
// Structured format: { id, weight, group, size }
// group: enables clustering (trees cluster, rocks cluster)
// weight: relative probability (higher = more common)
// size: [w,h] for multi-tile collision checking

export const THEME_SCATTER = {
  village: [
    { id: 'atlas-terrain:fir_tree_green_small_a1_2x2', weight: 3, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a2_2x2', weight: 3, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a3_2x2', weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a4_2x2', weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a5_2x2', weight: 1, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_stump_a1_1x1',       weight: 2, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:fir_tree_stump_a2_1x1',       weight: 1, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',     weight: 3, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a2_1x1',     weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_ashen_a6_1x1',    weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1', weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:crate_wood_ashen_a_1x1',       weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',    weight: 1, group: 'rock', size: [1, 1] },
    { id: 'atlas-terrain:fir_log_mossy_a1_1x4',             weight: 1, group: 'ground', size: [1, 4] },
  ],
  forest: [
    { id: 'atlas-terrain:fir_tree_green_large_a1_4x4',  weight: 2, group: 'tree', size: [4, 4] },
    { id: 'atlas-terrain:fir_tree_green_large_a2_4x4',  weight: 2, group: 'tree', size: [4, 4] },
    { id: 'atlas-terrain:fir_tree_green_large_a3_4x4',  weight: 1, group: 'tree', size: [4, 4] },
    { id: 'atlas-terrain:fir_tree_green_medium_a1_3x3', weight: 3, group: 'tree', size: [3, 3] },
    { id: 'atlas-terrain:fir_tree_green_medium_a2_3x3', weight: 3, group: 'tree', size: [3, 3] },
    { id: 'atlas-terrain:fir_tree_green_medium_a3_3x3', weight: 2, group: 'tree', size: [3, 3] },
    { id: 'atlas-terrain:fir_tree_green_small_a1_2x2',  weight: 3, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a2_2x2',  weight: 3, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a3_2x2',  weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:tree_multicolor2_c6_3x3',      weight: 1, group: 'tree', size: [3, 3] },
    { id: 'atlas-terrain:tree_multicolor3_c6_3x3',      weight: 1, group: 'tree', size: [3, 3] },
    { id: 'atlas-terrain:fir_tree_stump_a1_1x1',        weight: 2, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:fir_tree_stump_a2_1x1',        weight: 1, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:fir_tree_stump_a3_1x1',        weight: 1, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',      weight: 4, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a2_1x1',      weight: 3, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a3_1x1',      weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_ashen_a6_1x1',     weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:fir_log_mossy_a1_1x4',         weight: 1, group: 'ground', size: [1, 4] },
    { id: 'atlas-terrain:fir_log_mossy_a2_1x4',         weight: 1, group: 'ground', size: [1, 4] },
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1', weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_slate_blue_b10_1x1', weight: 1, group: 'rock', size: [1, 1] },
  ],
  town: [
    { id: 'atlas-terrain:fir_tree_green_small_a4_2x2',  weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a5_2x2',  weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',      weight: 3, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a2_1x1',      weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1', weight: 2, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:crate_wood_ashen_a_1x1',       weight: 2, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:sack_black_a1_1x1',            weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:bucket_pail_metal_gray_a1_1x1', weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:sign_bracket_brace_metal_gray_a1_1x1', weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:storage_arrangement_a10_1x1',   weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-craft:wheel_broken_wood_ashen_a2_1x1', weight: 1, group: 'clutter', size: [1, 1] },
  ],
  dungeon: [
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',     weight: 3, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_slate_blue_b10_1x1', weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:candles_black_arranged_a1_1x1', weight: 2, group: 'light', size: [1, 1] },
    { id: 'atlas-props-decor:candles_black_arranged_a2_1x1', weight: 1, group: 'light', size: [1, 1] },
    { id: 'atlas-props-decor:arranged_clutter_a10_1x1',      weight: 2, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:arranged_clutter_a11_1x1',      weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_ashen_a6_1x1',          weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a1_1x1',               weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a2_1x1',               weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:blood_pool_black_a10_1x1',          weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-props-decor:pile_dirt_01_a1_1x1',           weight: 1, group: 'rock', size: [1, 1] },
  ],
  cave: [
    { id: 'atlas-props-decor:stalagmite_hole_rock_earthy_a10_1x1', weight: 3, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',     weight: 3, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_slate_blue_b10_1x1', weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:underdark_crystal_rock_sliver_blue_a10_1x1', weight: 2, group: 'crystal', size: [1, 1] },
    { id: 'atlas-terrain:ceremorph_blue_bioluminescent_plant_a10_1x1', weight: 1, group: 'plant', size: [1, 1] },
    { id: 'atlas-terrain:ceremorph_blue_bioluminescent_plant_a11_1x1', weight: 1, group: 'plant', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a1_1x1',               weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:spore_cloud_blue_a10_1x1',          weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-props-decor:pile_dirt_01_a1_1x1',           weight: 1, group: 'rock', size: [1, 1] },
  ],
  mountain: [
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',     weight: 4, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_slate_blue_b10_1x1', weight: 3, group: 'rock', size: [1, 1] },
    { id: 'atlas-terrain:fir_tree_green_small_a1_2x2',       weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a2_2x2',       weight: 1, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_stump_a1_1x1',             weight: 2, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:fir_tree_stump_a4_1x1',             weight: 1, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',           weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_ashen_a6_1x1',          weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_burnt_a2_1x1',          weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:stick_large_wood_burnt_a1_1x1',     weight: 1, group: 'ground', size: [1, 1] },
  ],
  desert: [
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',     weight: 4, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_slate_blue_b10_1x1', weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_burnt_a2_1x1',          weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_burnt_a3_1x1',          weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:stick_large_wood_burnt_a10_1x1',    weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:twig_wood_burnt_a1_1x1',            weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a3_1x1',           weight: 1, group: 'undergrowth', size: [1, 1] },
  ],
  swamp: [
    { id: 'atlas-terrain:tree_branch_ashen_a19_3x3',  weight: 2, group: 'tree', size: [3, 3] },
    { id: 'atlas-terrain:tree_branch_ashen_a1_2x2',   weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:tree_branch_ashen_a11_2x2',  weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_stump_a4_1x1',      weight: 2, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:fir_tree_stump_a5_1x1',      weight: 2, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',    weight: 3, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a2_1x1',    weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:cattail_blue_a10_1x1',       weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:cattail_blue_a11_1x1',       weight: 1, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_ashen_a6_1x1',   weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1', weight: 1, group: 'rock', size: [1, 1] },
    { id: 'atlas-terrain:fir_log_mossy_a3_1x4',       weight: 1, group: 'ground', size: [1, 4] },
  ],
  coastal: [
    { id: 'atlas-terrain:palm_tree_trunk_shadow_a3_3x3', weight: 3, group: 'tree', size: [3, 3] },
    { id: 'atlas-terrain:palm_tree_trunk_shadow_a6_3x3', weight: 2, group: 'tree', size: [3, 3] },
    { id: 'atlas-terrain:palm_tree_trunk_shadow_a4_3x4', weight: 1, group: 'tree', size: [3, 4] },
    { id: 'atlas-terrain:fir_tree_green_small_a4_2x2',   weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',       weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a3_1x1',       weight: 1, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1', weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1', weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-craft:rowboat_wood_ashen_a1_1x3',    weight: 1, group: 'clutter', size: [1, 3] },
    { id: 'atlas-terrain:branch_wood_ashen_a6_1x1',         weight: 2, group: 'ground', size: [1, 1] },
  ],
  graveyard: [
    { id: 'atlas-terrain:gravestone_stone_gray_a1_1x1', weight: 4, group: 'grave', size: [1, 1] },
    { id: 'atlas-terrain:gravestone_stone_gray_b1_1x1', weight: 3, group: 'grave', size: [1, 1] },
    { id: 'atlas-terrain:tree_branch_ashen_a11_2x2',    weight: 2, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:tree_branch_ashen_a1_2x2',     weight: 1, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_stump_a4_1x1',        weight: 2, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:fir_tree_stump_a5_1x1',        weight: 1, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',      weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1', weight: 1, group: 'rock', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a3_1x1',          weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-props-decor:candles_black_arranged_a1_1x1', weight: 1, group: 'light', size: [1, 1] },
    { id: 'atlas-props-decor:pile_dirt_01_a1_1x1',      weight: 1, group: 'ground', size: [1, 1] },
  ],
  crypt: [
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',     weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:candles_black_arranged_a1_1x1', weight: 3, group: 'light', size: [1, 1] },
    { id: 'atlas-props-decor:candles_black_arranged_a2_1x1', weight: 2, group: 'light', size: [1, 1] },
    { id: 'atlas-props-decor:arranged_clutter_a10_1x1',      weight: 2, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:arranged_clutter_a11_1x1',      weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:amphora_clay_brown_a1_1x1',     weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a1_1x1',               weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a2_1x1',               weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-props-decor:coffin_wood_dark_top_a1_1x2',   weight: 1, group: 'clutter', size: [1, 2] },
    { id: 'atlas-effects:blood_pool_black_a10_1x1',          weight: 1, group: 'ground', size: [1, 1] },
  ],
  sewer: [
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',     weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:arranged_clutter_a10_1x1',      weight: 2, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:arranged_clutter_a11_1x1',      weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_ashen_a6_1x1',          weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:refuse_pile_01_a1_1x1',             weight: 2, group: 'clutter', size: [1, 1] },
    { id: 'atlas-effects:refuse_pile_01_a2_1x1',             weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a3_1x1',               weight: 1, group: 'ground', size: [1, 1] },
  ],
  // --- New themes ---
  underdark: [
    { id: 'atlas-props-decor:stalagmite_hole_rock_earthy_a10_1x1', weight: 3, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:underdark_crystal_rock_sliver_blue_a10_1x1', weight: 3, group: 'crystal', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',     weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_slate_blue_b10_1x1', weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-terrain:ceremorph_blue_bioluminescent_plant_a10_1x1', weight: 3, group: 'plant', size: [1, 1] },
    { id: 'atlas-terrain:ceremorph_blue_bioluminescent_plant_a11_1x1', weight: 2, group: 'plant', size: [1, 1] },
    { id: 'atlas-terrain:ceremorph_blue_bioluminescent_plant_a12_1x1', weight: 2, group: 'plant', size: [1, 1] },
    { id: 'atlas-effects:spore_cloud_blue_a10_1x1',          weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:spore_cloud_blue_a11_1x1',          weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:spore_cloud_light_blue_a10_1x1',    weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a1_1x1',               weight: 1, group: 'ground', size: [1, 1] },
  ],
  drow: [
    { id: 'atlas-props-decor:underdark_crystal_rock_sliver_blue_a10_1x1', weight: 3, group: 'crystal', size: [1, 1] },
    { id: 'atlas-props-decor:underdark_crystal_rock_stone_drow_a1_1x1',   weight: 3, group: 'crystal', size: [1, 1] },
    { id: 'atlas-props-decor:candles_black_arranged_a1_1x1', weight: 2, group: 'light', size: [1, 1] },
    { id: 'atlas-props-decor:candles_black_arranged_a2_1x1', weight: 1, group: 'light', size: [1, 1] },
    { id: 'atlas-terrain:ceremorph_blue_bioluminescent_plant_a10_1x1', weight: 2, group: 'plant', size: [1, 1] },
    { id: 'atlas-terrain:ceremorph_blue_bioluminescent_plant_a11_1x1', weight: 1, group: 'plant', size: [1, 1] },
    { id: 'atlas-props-decor:stalagmite_hole_rock_earthy_a10_1x1', weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_slate_blue_b10_1x1', weight: 1, group: 'rock', size: [1, 1] },
    { id: 'atlas-effects:spiderweb_black_a10_1x1',           weight: 1, group: 'ground', size: [1, 1] },
  ],
  farm: [
    { id: 'atlas-terrain:fir_tree_green_small_a1_2x2', weight: 1, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_green_small_a4_2x2', weight: 1, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',     weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a2_1x1',     weight: 1, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-terrain:corn_a1',                      weight: 3, group: 'crop', size: [1, 1] },
    { id: 'atlas-terrain:corn_a2',                      weight: 2, group: 'crop', size: [1, 1] },
    { id: 'atlas-terrain:wheat_field_a1',               weight: 3, group: 'crop', size: [1, 1] },
    { id: 'atlas-terrain:wheat_field_a2',               weight: 2, group: 'crop', size: [1, 1] },
    { id: 'atlas-terrain:cabbage_green_a1',             weight: 2, group: 'crop', size: [1, 1] },
    { id: 'atlas-terrain:carrot_a1',                    weight: 2, group: 'crop', size: [1, 1] },
    { id: 'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1', weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:crate_wood_ashen_a_1x1',       weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_ashen_a6_1x1',         weight: 1, group: 'ground', size: [1, 1] },
  ],
  ruins: [
    { id: 'atlas-props-decor:rock_stone_earthy_a10_1x1',     weight: 4, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:rock_stone_slate_blue_b10_1x1', weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_burnt_a2_1x1',          weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:branch_wood_burnt_a3_1x1',          weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-terrain:tree_branch_ashen_a11_2x2',         weight: 1, group: 'tree', size: [2, 2] },
    { id: 'atlas-terrain:fir_tree_stump_a4_1x1',             weight: 2, group: 'tree', size: [1, 1] },
    { id: 'atlas-terrain:bush_multicolor2_a1_1x1',           weight: 2, group: 'undergrowth', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a1_1x1',               weight: 2, group: 'ground', size: [1, 1] },
    { id: 'atlas-effects:cobweb_black_a2_1x1',               weight: 1, group: 'ground', size: [1, 1] },
    { id: 'atlas-props-decor:pile_dirt_01_a1_1x1',           weight: 2, group: 'rock', size: [1, 1] },
    { id: 'atlas-props-decor:arranged_clutter_a10_1x1',      weight: 1, group: 'clutter', size: [1, 1] },
    { id: 'atlas-props-decor:flag_angled_ripped_fabric_black_a2_1x1', weight: 1, group: 'clutter', size: [1, 1] },
  ],
}

/* ── Scatter density per theme ──────────────────────────────── */

export const THEME_SCATTER_DENSITY = {
  village: 0.08, forest: 0.14, town: 0.07, dungeon: 0.05,
  cave: 0.06, mountain: 0.10, desert: 0.06, swamp: 0.12,
  coastal: 0.08, graveyard: 0.10, crypt: 0.04, sewer: 0.04,
  underdark: 0.07, drow: 0.05, farm: 0.10, ruins: 0.09,
}

/* ── Cluster settings per scatter group ─────────────────────── */
// Probability that items of this group will be placed in clusters vs scattered uniformly

export const CLUSTER_CONFIG = {
  tree:        { clusterChance: 0.7, radius: 5, minClusters: 2, maxClusters: 5 },
  undergrowth: { clusterChance: 0.5, radius: 4, minClusters: 2, maxClusters: 4 },
  rock:        { clusterChance: 0.6, radius: 3, minClusters: 1, maxClusters: 3 },
  crystal:     { clusterChance: 0.7, radius: 4, minClusters: 1, maxClusters: 3 },
  plant:       { clusterChance: 0.5, radius: 3, minClusters: 1, maxClusters: 3 },
  crop:        { clusterChance: 0.8, radius: 5, minClusters: 2, maxClusters: 4 },
  grave:       { clusterChance: 0.9, radius: 4, minClusters: 2, maxClusters: 3 },
  ground:      { clusterChance: 0.2, radius: 3, minClusters: 1, maxClusters: 2 },
  clutter:     { clusterChance: 0.3, radius: 3, minClusters: 1, maxClusters: 2 },
  light:       { clusterChance: 0.1, radius: 2, minClusters: 1, maxClusters: 2 },
}

/* ── Blocking tiles (movement collision) ────────────────────── */

export const V2_BLOCKING_TILES = new Set([
  // Trees — stumps (1x1)
  'atlas-terrain:fir_tree_stump_a1_1x1', 'atlas-terrain:fir_tree_stump_a2_1x1',
  'atlas-terrain:fir_tree_stump_a3_1x1', 'atlas-terrain:fir_tree_stump_a4_1x1',
  'atlas-terrain:fir_tree_stump_a5_1x1', 'atlas-terrain:fir_tree_stump_b1_1x1',
  'atlas-terrain:fir_tree_stump_b2_1x1', 'atlas-terrain:fir_tree_stump_b3_1x1',
  // Trees — full canopy (2x2, 3x3, 4x4)
  'atlas-terrain:fir_tree_green_small_a1_2x2', 'atlas-terrain:fir_tree_green_small_a2_2x2',
  'atlas-terrain:fir_tree_green_small_a3_2x2', 'atlas-terrain:fir_tree_green_small_a4_2x2',
  'atlas-terrain:fir_tree_green_small_a5_2x2',
  'atlas-terrain:fir_tree_green_medium_a1_3x3', 'atlas-terrain:fir_tree_green_medium_a2_3x3',
  'atlas-terrain:fir_tree_green_medium_a3_3x3',
  'atlas-terrain:fir_tree_green_large_a1_4x4', 'atlas-terrain:fir_tree_green_large_a2_4x4',
  'atlas-terrain:fir_tree_green_large_a3_4x4',
  'atlas-terrain:tree_branch_ashen_a19_3x3', 'atlas-terrain:tree_branch_ashen_a1_2x2',
  'atlas-terrain:tree_branch_ashen_a11_2x2',
  'atlas-terrain:palm_tree_trunk_shadow_a3_3x3', 'atlas-terrain:palm_tree_trunk_shadow_a6_3x3',
  'atlas-terrain:palm_tree_trunk_shadow_a4_3x4',
  'atlas-terrain:tree_multicolor2_c6_3x3', 'atlas-terrain:tree_multicolor3_c6_3x3',
  // Rocks and boulders
  'atlas-props-decor:rock_stone_earthy_a10_1x1',
  'atlas-props-decor:rock_stone_slate_blue_b10_1x1',
  'atlas-props-decor:stalagmite_hole_rock_earthy_a10_1x1',
  'atlas-props-decor:underdark_crystal_rock_sliver_blue_a10_1x1',
  'atlas-props-decor:underdark_crystal_rock_stone_drow_a1_1x1',
  // Gravestones
  'atlas-terrain:gravestone_stone_gray_a1_1x1',
  'atlas-terrain:gravestone_stone_gray_b1_1x1',
  // Containers
  'atlas-props-decor:barrel_lid_wood_ashen_a1_1x1',
  'atlas-props-decor:crate_wood_ashen_a_1x1',
  'atlas-props-decor:amphora_clay_brown_a1_1x1',
  // Furniture
  'atlas-props-furniture:table_misc_wood_ashen_a1_1x1',
  'atlas-props-furniture:armchair_fabric_black_a1_1x1',
  // Logs
  'atlas-terrain:fir_log_mossy_a1_1x4', 'atlas-terrain:fir_log_mossy_a2_1x4',
  'atlas-terrain:fir_log_mossy_a3_1x4',
])

/**
 * Helper: extract flat tile ID array from structured scatter config.
 * Used for backward-compatible palette building.
 */
export function getScatterTileIds(theme) {
  const items = THEME_SCATTER[theme] || THEME_SCATTER.village
  return items.map(item => item.id)
}
