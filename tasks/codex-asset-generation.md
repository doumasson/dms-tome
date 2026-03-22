# Codex Task: Generate Original Asset Library

## Overview
Use every asset in the catalog (`scripts/assets/asset-catalog.json`) as a REFERENCE to generate a brand new, original asset that the project owner fully owns. The source assets are Forgotten Adventures tiles — they serve as style/content references only. The OUTPUT must be original AI-generated art.

## Setup
1. Run `node scripts/assets/catalog-all.js` to generate the catalog
2. Read `scripts/assets/asset-catalog.json`
3. Create output directory: `assets/generated/`

## For Each Entry in the Catalog

1. **Read the source image** at `entry.sourcePath` as a visual reference
2. **Use `entry.prompt`** as the generation prompt — it describes what to create
3. **Generate a NEW original image** using OpenAI image generation (DALL-E 3 or GPT-Image):
   - Use the source image as a style reference, NOT as a direct copy
   - The output should be a similar type of asset but distinctly original
   - Size: 200×200px for 1x1 tiles (most common)
   - Format: PNG with transparency where appropriate
4. **Save to** `assets/generated/{entry.category}/{entry.outputFilename}`

## Wall Tiles: Generate 4 Variants
For entries where `entry.needsVariants === true`:
- Generate `{name}_north.png` — wall facing north (horizontal, top edge)
- Generate `{name}_south.png` — wall facing south (horizontal, bottom edge)
- Generate `{name}_east.png` — wall facing east (vertical, right edge)
- Generate `{name}_west.png` — wall facing west (vertical, left edge)

## Quality Requirements
- **Art style**: Hand-painted dark fantasy, consistent with Baldur's Gate / Icewind Dale aesthetic
- **Perspective**: Top-down / bird's eye view (~45° isometric for 3D objects)
- **Color palette**: Rich earth tones, deep shadows, warm highlights
- **Transparency**: Props/furniture/decor MUST have transparent backgrounds
- **Floors**: Must tile seamlessly in all 4 directions
- **No text, no watermarks, no borders**

## Output Structure
```
assets/generated/
  floor/
    stone_dark_tile.png
    brick_floor.png
    ...
  wall/
    stone_wall_north.png
    stone_wall_south.png
    stone_wall_east.png
    stone_wall_west.png
    ...
  furniture/
    table_round_wood.png
    ...
  terrain/
    tree_oak_large.png
    ...
  token/
    goblin_warrior.png
    ...
  effect/
    fire_burst.png
    ...
```

## Rate Limiting
- Process in batches of 5-10 to avoid API rate limits
- Wait 2-3 seconds between generations
- Log progress: `[gen] 42/6291: floor/stone_dark_tile.png ✓`

## After Generation
Run the existing atlas builder to pack generated assets:
```bash
node scripts/assets/build.js --source assets/generated/ --output public/tilesets/
```

## Context
Read `AGENTS.md` for full project context. This is a D&D 5e browser RPG using PixiJS for tile rendering. Every generated asset will be used in the live game.
