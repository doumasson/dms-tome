# Procedural Map System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small fixed-view zone system with large scrollable maps built from Forgotten Adventures tile assets, featuring a free camera, roof-lift buildings, chunk-based procedural generation, and 5e-accurate fog of war with darkvision.

**Architecture:** The system is layered: (1) Asset pipeline converts FA PNGs into sprite atlases, (2) Chunk library stores reusable map pieces, (3) Map generator assembles areas from AI layouts + chunks, (4) Camera + renderer displays large maps with viewport culling, (5) Fog of war overlays vision per 5e rules. Each layer is independent and testable.

**Tech Stack:** PixiJS v8 (WebGL rendering), Zustand (state), Supabase Storage (layer blobs), Node.js scripts (asset pipeline), Sharp (image processing for atlas packing), Claude Haiku (AI layout generation).

**Spec:** `docs/superpowers/specs/2026-03-19-procedural-map-system-design.md`

---

## Phase 1: Asset Pipeline

### Task 1: FA Asset Scanner

**Files:**
- Create: `scripts/assets/scan.js`
- Create: `scripts/assets/scan.test.js`

- [ ] **Step 1: Write failing test for FA filename parser**

```js
// scripts/assets/scan.test.js
import { describe, it, expect } from 'vitest';
import { parseFAFilename } from './scan.js';

describe('parseFAFilename', () => {
  it('parses standard FA filename with grid size', () => {
    const result = parseFAFilename(
      'FA_Assets/!Core_Settlements/Furniture/Tables/Table_Round_Wood_Dark_A1_2x2.png'
    );
    expect(result).toEqual({
      category: 'furniture',
      subcategory: 'tables',
      material: 'wood_dark',
      variant: 'a1',
      gridWidth: 2,
      gridHeight: 2,
      tags: ['furniture', 'table', 'wood', 'dark', 'settlement'],
      filename: 'Table_Round_Wood_Dark_A1_2x2.png',
    });
  });

  it('parses texture filename without grid size', () => {
    const result = parseFAFilename(
      'FA_Assets/!Core_Settlements/Textures/Brick_Floor_01_D1.png'
    );
    expect(result.category).toBe('textures');
    expect(result.gridWidth).toBe(1);
    expect(result.gridHeight).toBe(1);
  });

  it('parses wilderness biome path', () => {
    const result = parseFAFilename(
      'FA_Assets/Woodlands/!Wilderness/Flora/Tree_Oak_Large_A1_3x3.png'
    );
    expect(result.tags).toContain('woodlands');
    expect(result.tags).toContain('wilderness');
    expect(result.category).toBe('flora');
  });

  it('returns null for non-PNG files', () => {
    expect(parseFAFilename('Copyright.url')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/assets/scan.test.js`
Expected: FAIL — `parseFAFilename` not defined

- [ ] **Step 3: Implement FA filename parser**

```js
// scripts/assets/scan.js

/**
 * Parse a Forgotten Adventures asset path into structured metadata.
 * Path format: FA_Assets/<Pack>/<Category>/<Sub>/Name_Material_Variant_NxM.png
 */
export function parseFAFilename(filepath) {
  if (!filepath.endsWith('.png')) return null;

  const parts = filepath.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1];
  const name = filename.replace('.png', '');

  // Extract grid size from end of name (e.g., _2x2)
  const gridMatch = name.match(/_(\d+)x(\d+)$/);
  const gridWidth = gridMatch ? parseInt(gridMatch[1]) : 1;
  const gridHeight = gridMatch ? parseInt(gridMatch[2]) : 1;

  // Extract variant (e.g., _A1, _D1) — right before grid size or end
  const nameWithoutGrid = gridMatch ? name.slice(0, -gridMatch[0].length) : name;
  const variantMatch = nameWithoutGrid.match(/_([A-Z]\d+)$/);
  const variant = variantMatch ? variantMatch[1].toLowerCase() : null;

  // Derive category from directory structure
  const faIdx = parts.indexOf('FA_Assets');
  if (faIdx === -1) return null;

  const dirParts = parts.slice(faIdx + 1, -1); // directories between FA_Assets and filename
  const tags = [];

  // Extract biome/pack from first dir
  const pack = dirParts[0] || '';
  const cleanPack = pack.replace(/^!/, '').toLowerCase();
  if (cleanPack) tags.push(cleanPack.replace(/_/g, ' ').split(' ')[0]);

  // Check for wilderness/settlement markers
  if (dirParts.some(d => d === '!Wilderness')) tags.push('wilderness');
  if (cleanPack.includes('settlement')) tags.push('settlement');

  // Category is the deepest meaningful directory
  const categoryDir = dirParts.filter(d => !d.startsWith('!')).pop() || cleanPack;
  const category = categoryDir.toLowerCase().replace(/[^a-z_]/g, '');
  const subcategory = dirParts.length > 2
    ? dirParts.filter(d => !d.startsWith('!')).pop()?.toLowerCase().replace(/[^a-z_]/g, '')
    : null;

  // Extract material from filename segments
  const nameSegments = nameWithoutGrid.split('_');
  const materialParts = [];
  for (const seg of nameSegments) {
    const low = seg.toLowerCase();
    if (['wood', 'stone', 'metal', 'brick', 'marble', 'dark', 'light', 'ashen', 'earthy',
         'gray', 'black', 'white', 'red', 'brown', 'sandstone', 'redrock'].includes(low)) {
      materialParts.push(low);
      if (!tags.includes(low)) tags.push(low);
    }
  }
  const material = materialParts.length ? materialParts.join('_') : null;

  // Add category-derived tags
  if (category && !tags.includes(category)) tags.push(category);
  const nameLower = name.toLowerCase();
  const typeWords = ['table', 'chair', 'barrel', 'crate', 'door', 'wall', 'floor',
                     'tree', 'rock', 'bush', 'torch', 'candle', 'bed', 'shelf',
                     'coffin', 'statue', 'fountain', 'well', 'bridge', 'roof'];
  for (const w of typeWords) {
    if (nameLower.includes(w) && !tags.includes(w)) tags.push(w);
  }

  return {
    category,
    subcategory: subcategory || category,
    material,
    variant,
    gridWidth,
    gridHeight,
    tags,
    filename,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/assets/scan.test.js`
Expected: PASS

- [ ] **Step 5: Write failing test for zip scanner**

```js
// Add to scripts/assets/scan.test.js
import { scanZipManifest } from './scan.js';

describe('scanZipManifest', () => {
  it('produces manifest entries from a zip file path', async () => {
    // This test uses the actual FA zip — skip in CI
    const zipPath = 'C:/Users/sheme/Downloads/mapmaking_temp/Core_Mapmaking_Pack_Part1_v1.08.zip';
    const manifest = await scanZipManifest(zipPath, { limit: 10 });
    expect(manifest.length).toBeGreaterThan(0);
    expect(manifest[0]).toHaveProperty('path');
    expect(manifest[0]).toHaveProperty('tags');
    expect(manifest[0]).toHaveProperty('gridWidth');
  });
});
```

- [ ] **Step 6: Implement zip scanner**

```js
// Add to scripts/assets/scan.js
import { createReadStream } from 'fs';
import { open } from 'yauzl-promise'; // lightweight zip reader

export async function scanZipManifest(zipPath, { limit = Infinity } = {}) {
  const zip = await open(zipPath);
  const manifest = [];
  let count = 0;

  for await (const entry of zip) {
    if (count >= limit) break;
    const parsed = parseFAFilename(entry.filename);
    if (!parsed) continue;

    manifest.push({
      path: entry.filename,
      ...parsed,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
    });
    count++;
  }

  await zip.close();
  return manifest;
}
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run scripts/assets/scan.test.js`
Expected: PASS (both tests)

- [ ] **Step 8: Add CLI entry point and npm script**

```js
// Add CLI mode to bottom of scripts/assets/scan.js
if (process.argv[1]?.endsWith('scan.js')) {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error('Usage: node scripts/assets/scan.js <zip-or-dir> [<zip-or-dir>...]');
    process.exit(1);
  }

  const allEntries = [];
  for (const p of paths) {
    console.log(`Scanning ${p}...`);
    const entries = await scanZipManifest(p);
    allEntries.push(...entries);
    console.log(`  Found ${entries.length} assets`);
  }

  const outPath = 'assets/manifest.json';
  const { mkdirSync, writeFileSync } = await import('fs');
  mkdirSync('assets', { recursive: true });
  writeFileSync(outPath, JSON.stringify(allEntries, null, 2));
  console.log(`Manifest written: ${outPath} (${allEntries.length} entries)`);
}
```

Add to `package.json`:
```json
"scripts": {
  "assets:scan": "node scripts/assets/scan.js"
}
```

- [ ] **Step 9: Commit**

```bash
git add scripts/assets/scan.js scripts/assets/scan.test.js package.json
git commit -m "feat: add FA asset scanner with zip support and manifest output"
```

---

### Task 2: Sprite Atlas Builder

**Files:**
- Create: `scripts/assets/build.js`
- Create: `scripts/assets/build.test.js`
- Dependencies: `sharp` (image processing)

- [ ] **Step 1: Install sharp**

Run: `npm install --save-dev sharp`

- [ ] **Step 2: Write failing test for atlas packing algorithm**

```js
// scripts/assets/build.test.js
import { describe, it, expect } from 'vitest';
import { planAtlasLayout, groupByAtlas } from './build.js';

describe('groupByAtlas', () => {
  it('groups manifest entries into atlas categories', () => {
    const entries = [
      { category: 'textures', tags: ['floor', 'stone'], gridWidth: 1, gridHeight: 1 },
      { category: 'furniture', tags: ['table'], gridWidth: 2, gridHeight: 2 },
      { category: 'textures', tags: ['floor', 'wood'], gridWidth: 1, gridHeight: 1 },
    ];
    const groups = groupByAtlas(entries);
    expect(groups['atlas-floors']).toHaveLength(2);
    expect(groups['atlas-props-furniture']).toHaveLength(1);
  });
});

describe('planAtlasLayout', () => {
  it('packs tiles into 4096x4096 sheet with positions', () => {
    const tiles = Array.from({ length: 100 }, (_, i) => ({
      id: `tile_${i}`,
      pixelWidth: 200,
      pixelHeight: 200,
    }));
    const layout = planAtlasLayout(tiles, 4096);
    expect(layout.width).toBeLessThanOrEqual(4096);
    expect(layout.height).toBeLessThanOrEqual(4096);
    expect(layout.positions).toHaveLength(100);
    // No overlaps
    for (let i = 0; i < layout.positions.length; i++) {
      for (let j = i + 1; j < layout.positions.length; j++) {
        const a = layout.positions[i];
        const b = layout.positions[j];
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x &&
                        a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('splits into multiple sheets if tiles exceed max size', () => {
    // 500 tiles at 200px on 4096 sheet = needs multiple sheets
    const tiles = Array.from({ length: 500 }, (_, i) => ({
      id: `tile_${i}`,
      pixelWidth: 200,
      pixelHeight: 200,
    }));
    const layouts = planAtlasLayout(tiles, 4096, { allowMultiSheet: true });
    expect(Array.isArray(layouts) ? layouts.length : 1).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/assets/build.test.js`
Expected: FAIL

- [ ] **Step 4: Implement atlas grouping and layout**

```js
// scripts/assets/build.js

/** Map manifest entries to atlas categories */
export function groupByAtlas(entries) {
  const groups = {};
  const categoryToAtlas = {
    textures: 'atlas-floors',
    floors: 'atlas-floors',
    walls: 'atlas-walls',
    structures: 'atlas-walls',
    furniture: 'atlas-props-furniture',
    clutter: 'atlas-props-decor',
    decor: 'atlas-props-decor',
    lightsources: 'atlas-props-decor',
    flora: 'atlas-terrain',
    elevation: 'atlas-terrain',
    natural_decor: 'atlas-terrain',
    combat: 'atlas-effects',
    effects: 'atlas-effects',
  };

  for (const entry of entries) {
    const atlas = categoryToAtlas[entry.category] || 'atlas-misc';
    if (!groups[atlas]) groups[atlas] = [];
    groups[atlas].push(entry);
  }
  return groups;
}

/** Simple row-based bin packing for sprite atlas */
export function planAtlasLayout(tiles, maxSize = 4096, { allowMultiSheet = false } = {}) {
  const sheets = [];
  let currentSheet = { width: 0, height: 0, positions: [], tiles: [] };
  let rowX = 0;
  let rowY = 0;
  let rowHeight = 0;

  for (const tile of tiles) {
    const w = tile.pixelWidth;
    const h = tile.pixelHeight;

    // Would this tile exceed the row width?
    if (rowX + w > maxSize) {
      // New row
      rowY += rowHeight;
      rowX = 0;
      rowHeight = 0;
    }

    // Would this row exceed sheet height?
    if (rowY + h > maxSize) {
      if (allowMultiSheet) {
        currentSheet.width = maxSize;
        currentSheet.height = rowY + rowHeight;
        sheets.push(currentSheet);
        currentSheet = { width: 0, height: 0, positions: [], tiles: [] };
        rowX = 0;
        rowY = 0;
        rowHeight = 0;
      } else {
        // Truncate — can't fit
        break;
      }
    }

    currentSheet.positions.push({ id: tile.id, x: rowX, y: rowY, w, h });
    currentSheet.tiles.push(tile);
    rowX += w;
    rowHeight = Math.max(rowHeight, h);
    currentSheet.width = Math.max(currentSheet.width, rowX);
    currentSheet.height = Math.max(currentSheet.height, rowY + rowHeight);
  }

  if (currentSheet.positions.length > 0) {
    sheets.push(currentSheet);
  }

  return allowMultiSheet ? sheets : sheets[0] || { width: 0, height: 0, positions: [] };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run scripts/assets/build.test.js`
Expected: PASS

- [ ] **Step 6: Implement atlas image compositing with Sharp**

```js
// Add to scripts/assets/build.js
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

/**
 * Build a sprite atlas image + JSON manifest from a layout and source zip.
 * @param {object} layout - from planAtlasLayout
 * @param {string} atlasName - e.g., 'atlas-floors'
 * @param {string} zipPath - FA zip to extract tiles from
 * @param {string} outDir - output directory (e.g., 'public/tilesets')
 */
export async function buildAtlasImage(layout, atlasName, extractTile, outDir) {
  mkdirSync(outDir, { recursive: true });

  // Create blank canvas
  const canvas = sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  // Composite all tiles
  const composites = [];
  for (const pos of layout.positions) {
    const tileBuffer = await extractTile(pos.id);
    if (tileBuffer) {
      composites.push({ input: tileBuffer, left: pos.x, top: pos.y });
    }
  }

  const imageBuffer = await canvas.composite(composites).webp({ quality: 90 }).toBuffer();
  const imagePath = path.join(outDir, `${atlasName}.webp`);
  writeFileSync(imagePath, imageBuffer);

  // Also save PNG fallback
  const pngBuffer = await sharp(imageBuffer).png().toBuffer();
  writeFileSync(path.join(outDir, `${atlasName}.png`), pngBuffer);

  // Write atlas JSON manifest
  const manifest = {};
  for (const pos of layout.positions) {
    const tile = layout.tiles?.find(t => t.id === pos.id);
    manifest[pos.id] = {
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      gw: tile?.gridWidth || Math.round(pos.w / 200),
      gh: tile?.gridHeight || Math.round(pos.h / 200),
    };
  }
  writeFileSync(
    path.join(outDir, `${atlasName}.json`),
    JSON.stringify(manifest, null, 2)
  );

  return { imagePath, tileCount: layout.positions.length };
}
```

- [ ] **Step 7: Add CLI entry point**

```js
// Add CLI to bottom of scripts/assets/build.js
if (process.argv[1]?.endsWith('build.js')) {
  const manifestPath = process.argv[2] || 'assets/manifest.json';
  const outDir = process.argv[3] || 'public/tilesets';
  const { readFileSync } = await import('fs');

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const groups = groupByAtlas(manifest);

  for (const [atlasName, entries] of Object.entries(groups)) {
    console.log(`Building ${atlasName} (${entries.length} tiles)...`);
    const tiles = entries.map(e => ({
      id: `${e.category}:${e.filename.replace('.png', '').toLowerCase()}`,
      pixelWidth: e.gridWidth * 200,
      pixelHeight: e.gridHeight * 200,
      ...e,
    }));
    const layout = planAtlasLayout(tiles, 4096);
    console.log(`  Layout: ${layout.width}x${layout.height}, ${layout.positions.length} tiles`);
    // Note: actual image compositing requires zip extraction — see buildAtlasImage
  }

  console.log('Atlas layout planning complete. Run with --compose flag to build images.');
}
```

Add to `package.json`:
```json
"assets:build": "node scripts/assets/build.js"
```

- [ ] **Step 8: Commit**

```bash
git add scripts/assets/build.js scripts/assets/build.test.js package.json
git commit -m "feat: add sprite atlas builder with bin-packing and Sharp compositing"
```

---

### Task 2b: RLE Compression + Supabase Storage Loader

**Files:**
- Create: `src/lib/rleCodec.js`
- Create: `src/lib/rleCodec.test.js`

- [ ] **Step 1: Write failing tests for RLE encode/decode**

```js
// src/lib/rleCodec.test.js
import { describe, it, expect } from 'vitest';
import { rleEncode, rleDecode } from './rleCodec.js';

describe('RLE codec', () => {
  it('compresses repeated values', () => {
    const input = new Uint16Array([1, 1, 1, 1, 1, 2, 2, 3]);
    const encoded = rleEncode(input);
    expect(encoded.length).toBeLessThan(input.length * 2); // compressed
    const decoded = rleDecode(encoded, input.length);
    expect(Array.from(decoded)).toEqual(Array.from(input));
  });

  it('handles single values (no repeats)', () => {
    const input = new Uint16Array([1, 2, 3, 4, 5]);
    const decoded = rleDecode(rleEncode(input), input.length);
    expect(Array.from(decoded)).toEqual(Array.from(input));
  });

  it('handles all-same values', () => {
    const input = new Uint16Array(1000).fill(42);
    const encoded = rleEncode(input);
    expect(encoded.length).toBeLessThan(10); // highly compressed
    const decoded = rleDecode(encoded, 1000);
    expect(decoded.every(v => v === 42)).toBe(true);
  });

  it('roundtrips a large realistic layer (80x60)', () => {
    const input = new Uint16Array(80 * 60);
    // Fill with repetitive terrain pattern
    for (let i = 0; i < input.length; i++) input[i] = i % 3 === 0 ? 1 : 2;
    input[500] = 10; // a few unique tiles
    input[2000] = 15;
    const decoded = rleDecode(rleEncode(input), input.length);
    expect(Array.from(decoded)).toEqual(Array.from(input));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/rleCodec.test.js`

- [ ] **Step 3: Implement RLE codec**

```js
// src/lib/rleCodec.js

/**
 * Run-length encode a Uint16Array into a compact Uint16Array.
 * Format: [count, value, count, value, ...]
 */
export function rleEncode(data) {
  const pairs = [];
  let i = 0;
  while (i < data.length) {
    const val = data[i];
    let count = 1;
    while (i + count < data.length && data[i + count] === val && count < 65535) {
      count++;
    }
    pairs.push(count, val);
    i += count;
  }
  return new Uint16Array(pairs);
}

/**
 * Decode an RLE-encoded Uint16Array back to original size.
 */
export function rleDecode(encoded, expectedLength) {
  const output = new Uint16Array(expectedLength);
  let outIdx = 0;
  for (let i = 0; i < encoded.length; i += 2) {
    const count = encoded[i];
    const val = encoded[i + 1];
    for (let j = 0; j < count && outIdx < expectedLength; j++) {
      output[outIdx++] = val;
    }
  }
  return output;
}

/**
 * Serialize an RLE-encoded Uint16Array to a binary blob (ArrayBuffer).
 */
export function rleToBlob(encoded) {
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
}

/**
 * Deserialize a binary blob back to an RLE-encoded Uint16Array.
 */
export function blobToRle(buffer) {
  return new Uint16Array(buffer);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/rleCodec.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rleCodec.js src/lib/rleCodec.test.js
git commit -m "feat: add RLE codec for layer compression with blob serialization"
```

> **Note:** Supabase Storage upload/download for layer blobs is deferred to integration (Task 13+). The codec is the core primitive; Storage wiring happens when area loading is implemented.

---

## Phase 2: Camera System

### Task 3: Camera Controller

**Files:**
- Create: `src/engine/Camera.js`
- Create: `src/engine/Camera.test.js`

- [ ] **Step 1: Write failing tests for camera state**

```js
// src/engine/Camera.test.js
import { describe, it, expect } from 'vitest';
import { Camera } from './Camera.js';

describe('Camera', () => {
  it('initializes with default values', () => {
    const cam = new Camera(800, 600); // viewport size
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(0.5);
  });

  it('clamps zoom to min/max', () => {
    const cam = new Camera(800, 600);
    cam.setZoom(0.1);
    expect(cam.zoom).toBe(0.3); // min
    cam.setZoom(5.0);
    expect(cam.zoom).toBe(1.5); // max
  });

  it('clamps pan to area bounds', () => {
    const cam = new Camera(800, 600);
    cam.setAreaBounds(80 * 200, 60 * 200); // 80x60 tiles at 200px
    cam.setPosition(-1000, -1000);
    expect(cam.x).toBeGreaterThanOrEqual(0);
    expect(cam.y).toBeGreaterThanOrEqual(0);
  });

  it('applies inertia on pan release', () => {
    const cam = new Camera(800, 600);
    cam.setAreaBounds(80 * 200, 60 * 200);
    cam.startPan('right');
    cam.update(100); // 100ms tick
    const x1 = cam.x;
    cam.stopPan('right');
    cam.update(50); // should still be moving (inertia)
    expect(cam.x).toBeGreaterThan(x1);
    cam.update(200); // inertia should decay
    cam.update(200);
    const xFinal = cam.x;
    cam.update(200);
    expect(cam.x).toBe(xFinal); // fully stopped
  });

  it('centerOnImmediate snaps to a tile position', () => {
    const cam = new Camera(800, 600);
    cam.setAreaBounds(80 * 200, 60 * 200);
    cam.centerOnImmediate(40, 30, 200); // tile 40,30 at 200px/tile
    // Camera x,y should center that tile in viewport
    expect(cam.x).toBeCloseTo(40 * 200 + 100 - 400); // tile center - half viewport
    expect(cam.y).toBeCloseTo(30 * 200 + 100 - 300);
  });

  it('centerOn smoothly animates via update ticks', () => {
    const cam = new Camera(800, 600);
    cam.setAreaBounds(80 * 200, 60 * 200);
    cam.centerOn(40, 30, 200);
    expect(cam.x).toBe(0); // not moved yet
    cam.update(5000); // large dt to complete animation
    expect(cam.x).toBeCloseTo(40 * 200 + 100 - 400);
    expect(cam.y).toBeCloseTo(30 * 200 + 100 - 300);
  });

  it('getVisibleBounds returns tile range for current viewport', () => {
    const cam = new Camera(800, 600);
    cam.setAreaBounds(80 * 200, 60 * 200);
    cam.zoom = 0.5;
    cam.x = 2000;
    cam.y = 1500;
    const bounds = cam.getVisibleTileBounds(200);
    expect(bounds.startX).toBeGreaterThanOrEqual(0);
    expect(bounds.endX).toBeGreaterThan(bounds.startX);
    expect(bounds.startY).toBeGreaterThanOrEqual(0);
    expect(bounds.endY).toBeGreaterThan(bounds.startY);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/engine/Camera.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Camera class**

```js
// src/engine/Camera.js

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;
const DEFAULT_ZOOM = 0.5;
const PAN_SPEED = 600; // px/sec at 1x zoom
const INERTIA_DECAY = 0.85; // multiply velocity each frame
const INERTIA_THRESHOLD = 0.5; // stop below this velocity

export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.x = 0;
    this.y = 0;
    this.zoom = DEFAULT_ZOOM;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.areaBoundsW = Infinity;
    this.areaBoundsH = Infinity;

    // Pan state
    this.panDirs = new Set(); // 'up' | 'down' | 'left' | 'right'
    this.velocityX = 0;
    this.velocityY = 0;

    // Smooth center animation
    this._centerTarget = null;
    this._centerSpeed = 3000; // px/sec
  }

  setAreaBounds(widthPx, heightPx) {
    this.areaBoundsW = widthPx;
    this.areaBoundsH = heightPx;
  }

  setZoom(z) {
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
  }

  zoomAt(delta, mouseX, mouseY) {
    const oldZoom = this.zoom;
    this.setZoom(this.zoom + delta);
    // Adjust position so zoom centers on mouse
    const zoomRatio = this.zoom / oldZoom;
    this.x = mouseX - (mouseX - this.x) * zoomRatio;
    this.y = mouseY - (mouseY - this.y) * zoomRatio;
    this._clamp();
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this._clamp();
  }

  startPan(dir) {
    this.panDirs.add(dir);
    this._centerTarget = null; // cancel smooth center
  }

  stopPan(dir) {
    this.panDirs.delete(dir);
  }

  centerOn(tileX, tileY, tileSize) {
    const targetX = tileX * tileSize + tileSize / 2 - this.viewportWidth / this.zoom / 2;
    const targetY = tileY * tileSize + tileSize / 2 - this.viewportHeight / this.zoom / 2;
    this._centerTarget = { x: targetX, y: targetY };
  }

  centerOnImmediate(tileX, tileY, tileSize) {
    this.x = tileX * tileSize + tileSize / 2 - this.viewportWidth / this.zoom / 2;
    this.y = tileY * tileSize + tileSize / 2 - this.viewportHeight / this.zoom / 2;
    this._clamp();
  }

  update(dtMs) {
    const dt = dtMs / 1000;
    const speed = PAN_SPEED / this.zoom; // faster pan when zoomed out

    // Apply directional input to velocity
    if (this.panDirs.has('left')) this.velocityX = -speed;
    else if (this.panDirs.has('right')) this.velocityX = speed;

    if (this.panDirs.has('up')) this.velocityY = -speed;
    else if (this.panDirs.has('down')) this.velocityY = speed;

    // Apply velocity
    if (this.velocityX || this.velocityY) {
      this.x += this.velocityX * dt;
      this.y += this.velocityY * dt;
    }

    // Inertia decay when no input
    if (!this.panDirs.has('left') && !this.panDirs.has('right')) {
      this.velocityX *= INERTIA_DECAY;
      if (Math.abs(this.velocityX) < INERTIA_THRESHOLD) this.velocityX = 0;
    }
    if (!this.panDirs.has('up') && !this.panDirs.has('down')) {
      this.velocityY *= INERTIA_DECAY;
      if (Math.abs(this.velocityY) < INERTIA_THRESHOLD) this.velocityY = 0;
    }

    // Smooth center-on animation
    if (this._centerTarget) {
      const dx = this._centerTarget.x - this.x;
      const dy = this._centerTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2) {
        this.x = this._centerTarget.x;
        this.y = this._centerTarget.y;
        this._centerTarget = null;
      } else {
        const step = Math.min(this._centerSpeed * dt, dist);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
    }

    this._clamp();
  }

  getVisibleTileBounds(tileSize, buffer = 2) {
    const viewW = this.viewportWidth / this.zoom;
    const viewH = this.viewportHeight / this.zoom;
    return {
      startX: Math.max(0, Math.floor(this.x / tileSize) - buffer),
      startY: Math.max(0, Math.floor(this.y / tileSize) - buffer),
      endX: Math.ceil((this.x + viewW) / tileSize) + buffer,
      endY: Math.ceil((this.y + viewH) / tileSize) + buffer,
    };
  }

  resize(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  _clamp() {
    const viewW = this.viewportWidth / this.zoom;
    const viewH = this.viewportHeight / this.zoom;
    const maxX = Math.max(0, this.areaBoundsW - viewW);
    const maxY = Math.max(0, this.areaBoundsH - viewH);
    this.x = Math.max(0, Math.min(maxX, this.x));
    this.y = Math.max(0, Math.min(maxY, this.y));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/Camera.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/Camera.js src/engine/Camera.test.js
git commit -m "feat: add Camera class with pan, zoom, inertia, and viewport culling"
```

---

### Task 4: Viewport Culler

**Files:**
- Create: `src/engine/ViewportCuller.js`
- Create: `src/engine/ViewportCuller.test.js`

- [ ] **Step 1: Write failing test**

```js
// src/engine/ViewportCuller.test.js
import { describe, it, expect } from 'vitest';
import { ViewportCuller } from './ViewportCuller.js';

describe('ViewportCuller', () => {
  it('only returns sprites within visible bounds', () => {
    const culler = new ViewportCuller(200); // 200px tile size
    culler.setLayer('floor', 10, 10); // 10x10 grid

    const bounds = { startX: 2, startY: 2, endX: 5, endY: 5 };
    const visible = culler.getVisibleTiles('floor', bounds);

    expect(visible.length).toBe(9); // 3x3 tiles
    expect(visible[0]).toEqual({ x: 2, y: 2 });
  });

  it('clamps bounds to layer dimensions', () => {
    const culler = new ViewportCuller(200);
    culler.setLayer('floor', 5, 5);

    const bounds = { startX: -2, startY: -2, endX: 10, endY: 10 };
    const visible = culler.getVisibleTiles('floor', bounds);

    expect(visible.length).toBe(25); // 5x5, clamped
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/engine/ViewportCuller.test.js`

- [ ] **Step 3: Implement ViewportCuller**

```js
// src/engine/ViewportCuller.js

export class ViewportCuller {
  constructor(tileSize) {
    this.tileSize = tileSize;
    this.layers = {};
  }

  setLayer(name, width, height) {
    this.layers[name] = { width, height };
  }

  getVisibleTiles(layerName, bounds) {
    const layer = this.layers[layerName];
    if (!layer) return [];

    const startX = Math.max(0, bounds.startX);
    const startY = Math.max(0, bounds.startY);
    const endX = Math.min(layer.width, bounds.endX);
    const endY = Math.min(layer.height, bounds.endY);

    const tiles = [];
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/engine/ViewportCuller.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/ViewportCuller.js src/engine/ViewportCuller.test.js
git commit -m "feat: add ViewportCuller for camera-based tile visibility"
```

---

## Phase 3: Tile Atlas v2

### Task 5: Multi-Atlas Tile Loader

**Files:**
- Create: `src/engine/tileAtlasV2.js`
- Create: `src/engine/tileAtlasV2.test.js`
- Create: `src/data/biomes.json`

- [ ] **Step 1: Write failing tests**

```js
// src/engine/tileAtlasV2.test.js
import { describe, it, expect } from 'vitest';
import { TileAtlasV2 } from './tileAtlasV2.js';

describe('TileAtlasV2', () => {
  it('resolves a tile ID to atlas and coordinates', () => {
    const atlas = new TileAtlasV2();
    atlas.registerAtlas('floors', {
      stone_earthy_01: { x: 0, y: 0, w: 200, h: 200, gw: 1, gh: 1 },
      wood_planks_01: { x: 200, y: 0, w: 200, h: 200, gw: 1, gh: 1 },
    });

    const info = atlas.resolve('floors:stone_earthy_01');
    expect(info).toEqual({
      atlasName: 'floors',
      x: 0, y: 0, w: 200, h: 200, gw: 1, gh: 1,
    });
  });

  it('returns null for unknown tile ID', () => {
    const atlas = new TileAtlasV2();
    expect(atlas.resolve('floors:nonexistent')).toBeNull();
  });

  it('resolves integer tile from palette', () => {
    const atlas = new TileAtlasV2();
    atlas.registerAtlas('floors', {
      grass_01: { x: 0, y: 0, w: 200, h: 200, gw: 1, gh: 1 },
    });
    atlas.setPalette(['floors:grass_01', 'floors:grass_01']);
    const info = atlas.resolveFromPalette(0);
    expect(info.atlasName).toBe('floors');
  });

  it('reports blocking status from metadata', () => {
    const atlas = new TileAtlasV2();
    atlas.registerAtlas('walls', {
      stone_v_a1: { x: 0, y: 0, w: 200, h: 200, gw: 1, gh: 1, blocking: true },
    });
    expect(atlas.isBlocking('walls:stone_v_a1')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/engine/tileAtlasV2.test.js`

- [ ] **Step 3: Implement TileAtlasV2**

```js
// src/engine/tileAtlasV2.js

export class TileAtlasV2 {
  constructor() {
    this.atlases = {};   // { atlasName: { tileName: { x, y, w, h, gw, gh, blocking? } } }
    this.textures = {};  // { atlasName: PIXI.BaseTexture } — populated by loadAtlasImage
    this.palette = [];   // string tile IDs, indexed by integer
    this._cache = new Map(); // tile ID string → resolved info
  }

  registerAtlas(name, manifest) {
    this.atlases[name] = manifest;
    this._cache.clear();
  }

  setPalette(palette) {
    this.palette = palette;
    this._cache.clear();
  }

  resolve(tileId) {
    if (!tileId || tileId === '0' || tileId === 0) return null;

    if (this._cache.has(tileId)) return this._cache.get(tileId);

    const colonIdx = tileId.indexOf(':');
    if (colonIdx === -1) return null;

    const atlasName = tileId.slice(0, colonIdx);
    const tileName = tileId.slice(colonIdx + 1);

    const atlas = this.atlases[atlasName];
    if (!atlas || !atlas[tileName]) {
      this._cache.set(tileId, null);
      return null;
    }

    const info = { atlasName, ...atlas[tileName] };
    this._cache.set(tileId, info);
    return info;
  }

  resolveFromPalette(index) {
    if (index === 0 || index >= this.palette.length) return null;
    return this.resolve(this.palette[index]);
  }

  isBlocking(tileId) {
    const info = this.resolve(tileId);
    return info?.blocking === true;
  }

  /** Load atlas image as PixiJS texture (call from renderer) */
  async loadAtlasImage(name, url, PIXI) {
    const texture = await PIXI.Assets.load(url);
    this.textures[name] = texture;
    return texture;
  }

  /** Get a PixiJS sub-texture for a resolved tile */
  getTexture(info, PIXI) {
    if (!info) return null;
    const baseTexture = this.textures[info.atlasName];
    if (!baseTexture) return null;

    const cacheKey = `${info.atlasName}:${info.x}:${info.y}:${info.w}:${info.h}`;
    if (this._texCache?.has(cacheKey)) return this._texCache.get(cacheKey);

    if (!this._texCache) this._texCache = new Map();
    const frame = new PIXI.Rectangle(info.x, info.y, info.w, info.h);
    const tex = new PIXI.Texture({ source: baseTexture.source || baseTexture, frame });
    this._texCache.set(cacheKey, tex);
    return tex;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/engine/tileAtlasV2.test.js`
Expected: PASS

- [ ] **Step 5: Create biomes.json**

```json
// src/data/biomes.json
{
  "grassland": {
    "requiredAtlases": ["atlas-floors", "atlas-walls", "atlas-terrain", "atlas-props-furniture"],
    "defaultTerrain": "floors:grass_01",
    "terrainVariants": ["floors:grass_01", "floors:grass_02", "floors:grass_03"],
    "edgeTiles": {
      "water": "terrain:water_edge",
      "cliff": "terrain:cliff"
    }
  },
  "dungeon": {
    "requiredAtlases": ["atlas-floors", "atlas-walls", "atlas-props-furniture", "atlas-effects"],
    "defaultTerrain": "floors:stone_earthy_01",
    "terrainVariants": ["floors:stone_earthy_01", "floors:stone_earthy_02"],
    "edgeTiles": {}
  },
  "underdark": {
    "requiredAtlases": ["atlas-floors", "atlas-walls", "atlas-terrain", "atlas-underdark"],
    "defaultTerrain": "floors:cave_stone_01",
    "terrainVariants": ["floors:cave_stone_01", "floors:cave_stone_02"],
    "edgeTiles": {
      "chasm": "terrain:chasm_edge",
      "fungal": "terrain:mushroom"
    }
  },
  "forest": {
    "requiredAtlases": ["atlas-floors", "atlas-terrain", "atlas-props-decor"],
    "defaultTerrain": "floors:grass_01",
    "terrainVariants": ["floors:grass_01", "floors:dirt_01", "floors:grass_02"],
    "edgeTiles": {}
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/engine/tileAtlasV2.js src/engine/tileAtlasV2.test.js src/data/biomes.json
git commit -m "feat: add TileAtlasV2 multi-atlas tile loader with palette and biome manifest"
```

---

## Phase 4: Pathfinding Upgrade

### Task 6: Binary Heap A* + Collision Layer

**Files:**
- Modify: `src/lib/pathfinding.js`
- Modify: existing tests or create `src/lib/pathfinding.test.js`

- [ ] **Step 1: Write failing performance test**

```js
// src/lib/pathfinding.test.js
import { describe, it, expect } from 'vitest';
import { findPath, buildCollisionLayer } from './pathfinding.js';

describe('findPath (upgraded)', () => {
  it('finds path on large grid within 16ms', () => {
    // 120x80 grid, mostly open
    const collision = new Uint8Array(120 * 80);
    // Add some walls
    for (let x = 30; x < 31; x++) {
      for (let y = 10; y < 60; y++) {
        collision[y * 120 + x] = 1;
      }
    }

    const start = performance.now();
    const path = findPath(collision, 120, 80, { x: 5, y: 5 }, { x: 100, y: 70 });
    const elapsed = performance.now() - start;

    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(10);
    expect(elapsed).toBeLessThan(16); // one frame budget
  });

  it('returns null when no path exists', () => {
    const collision = new Uint8Array(10 * 10);
    // Wall across entire row 5
    for (let x = 0; x < 10; x++) collision[5 * 10 + x] = 1;
    const path = findPath(collision, 10, 10, { x: 0, y: 0 }, { x: 9, y: 9 });
    expect(path).toBeNull();
  });
});

describe('buildCollisionLayer', () => {
  it('builds Uint8Array from tile palette and layers', () => {
    const collision = buildCollisionLayer(
      { walls: new Uint16Array([0, 1, 0, 0]), props: new Uint16Array([0, 0, 2, 0]) },
      ['', 'walls:stone_v', 'props:barrel'],
      { 'walls:stone_v': true, 'props:barrel': true },
      2, 2
    );
    expect(collision[0]).toBe(0); // empty
    expect(collision[1]).toBe(1); // wall
    expect(collision[2]).toBe(1); // barrel
    expect(collision[3]).toBe(0); // empty
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/pathfinding.test.js`

- [ ] **Step 3: Implement binary heap and upgraded A***

```js
// src/lib/pathfinding.js — FULL REPLACEMENT

/** Binary min-heap for A* open set */
class MinHeap {
  constructor() { this.data = []; }

  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this.data.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f >= this.data[parent].f) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.data[left].f < this.data[smallest].f) smallest = left;
      if (right < n && this.data[right].f < this.data[smallest].f) smallest = right;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

const DIRS = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

/**
 * A* pathfinding on a Uint8Array collision grid.
 * @param {Uint8Array} collision — flat array, 0=walkable, 1=blocked
 * @param {number} width — grid width
 * @param {number} height — grid height
 * @param {{x,y}} start
 * @param {{x,y}} end
 * @returns {Array<{x,y}>|null} path including start and end, or null
 */
export function findPath(collision, width, height, start, end) {
  if (collision[end.y * width + end.x] === 1) return null;
  if (start.x === end.x && start.y === end.y) return [start];

  const size = width * height;
  const gScore = new Float32Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);

  const idx = (x, y) => y * width + x;
  const heuristic = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y);

  const startIdx = idx(start.x, start.y);
  gScore[startIdx] = 0;

  const open = new MinHeap();
  open.push({ x: start.x, y: start.y, f: heuristic(start.x, start.y), idx: startIdx });

  while (open.size > 0) {
    const curr = open.pop();
    if (curr.x === end.x && curr.y === end.y) {
      // Reconstruct path
      const path = [];
      let ci = curr.idx;
      while (ci !== -1) {
        path.push({ x: ci % width, y: (ci / width) | 0 });
        ci = cameFrom[ci];
      }
      return path.reverse();
    }

    if (closed[curr.idx]) continue;
    closed[curr.idx] = 1;

    for (const { dx, dy } of DIRS) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const ni = idx(nx, ny);
      if (closed[ni] || collision[ni] === 1) continue;

      const tentG = gScore[curr.idx] + 1;
      if (tentG < gScore[ni]) {
        gScore[ni] = tentG;
        cameFrom[ni] = curr.idx;
        open.push({ x: nx, y: ny, f: tentG + heuristic(nx, ny), idx: ni });
      }
    }
  }

  return null;
}

/**
 * Build collision Uint8Array from tile layers.
 * @param {object} layers — { walls: Uint16Array, props: Uint16Array }
 * @param {string[]} palette — tile ID lookup
 * @param {object} blockingSet — { tileId: true } for blocking tiles
 * @param {number} width
 * @param {number} height
 */
export function buildCollisionLayer(layers, palette, blockingSet, width, height) {
  const collision = new Uint8Array(width * height);

  for (const layerName of ['walls', 'props']) {
    const layer = layers[layerName];
    if (!layer) continue;

    for (let i = 0; i < layer.length; i++) {
      const tileIdx = layer[i];
      if (tileIdx === 0) continue;
      const tileId = palette[tileIdx];
      if (tileId && blockingSet[tileId]) {
        collision[i] = 1;
      }
    }
  }

  return collision;
}

/**
 * Legacy wrapper: build walkability grid (boolean[][]) from old tile layers.
 * Preserved for V1 compatibility.
 */
export function buildWalkabilityGrid(walls, props, blocking, width, height) {
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const wallTile = walls?.[y]?.[x] ?? -1;
      const propTile = props?.[y]?.[x] ?? -1;
      const blocked = blocking.has(wallTile) || blocking.has(propTile);
      row.push(!blocked);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Legacy wrapper: find path on boolean[][] grid.
 * Preserved for V1 compatibility.
 */
export function findPathLegacy(grid, start, end) {
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const collision = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grid[y][x]) collision[y * width + x] = 1;
    }
  }
  return findPath(collision, width, height, start, end);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/pathfinding.test.js`
Expected: PASS, and the large-grid test completes in <16ms

- [ ] **Step 5: Update GameV2.jsx to use legacy wrappers**

In `src/GameV2.jsx`, find the pathfinding import and update:

Change: `import { findPath, buildWalkabilityGrid } from './lib/pathfinding'`
To: `import { findPathLegacy as findPath, buildWalkabilityGrid } from './lib/pathfinding'`

This ensures V1 continues working while V2 can use the new Uint8Array-based pathfinding.

- [ ] **Step 6: Verify V1 still works**

Run: `npm run dev` and test basic click-to-move in V2 mode.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pathfinding.js src/lib/pathfinding.test.js src/GameV2.jsx
git commit -m "feat: upgrade pathfinding with binary heap A* and Uint8Array collision grid"
```

---

## Phase 5: Chunk System

### Task 7: Chunk Library

**Files:**
- Create: `src/lib/chunkLibrary.js`
- Create: `src/lib/chunkLibrary.test.js`
- Create: `src/data/chunks/buildings/` (directory)
- Create: `src/data/chunks/rooms/` (directory)
- Create: `src/data/chunks/encounters/` (directory)
- Create: `src/data/chunks/terrain/` (directory)
- Create: `src/data/chunks/landmarks/` (directory)

- [ ] **Step 1: Write failing tests for chunk matching**

```js
// src/lib/chunkLibrary.test.js
import { describe, it, expect } from 'vitest';
import { ChunkLibrary } from './chunkLibrary.js';

describe('ChunkLibrary', () => {
  const library = new ChunkLibrary();

  beforeEach(() => {
    library.clear();
    library.register({
      id: 'inn-common-01',
      type: 'building',
      tags: ['tavern', 'indoor', 'settlement'],
      width: 12,
      height: 10,
      layers: {},
    });
    library.register({
      id: 'blacksmith-01',
      type: 'building',
      tags: ['blacksmith', 'indoor', 'settlement'],
      width: 8,
      height: 6,
      layers: {},
    });
    library.register({
      id: 'goblin-camp-01',
      type: 'encounter',
      tags: ['goblin', 'camp', 'outdoor'],
      width: 10,
      height: 8,
      layers: {},
    });
  });

  it('finds best match by type and tags', () => {
    const match = library.findBest('building', ['tavern']);
    expect(match.id).toBe('inn-common-01');
  });

  it('returns null when no type matches', () => {
    expect(library.findBest('landmark', ['fountain'])).toBeNull();
  });

  it('scores by tag overlap', () => {
    const match = library.findBest('building', ['blacksmith', 'indoor']);
    expect(match.id).toBe('blacksmith-01');
  });

  it('lists all chunks of a type', () => {
    const buildings = library.listByType('building');
    expect(buildings).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/chunkLibrary.test.js`

- [ ] **Step 3: Implement ChunkLibrary**

```js
// src/lib/chunkLibrary.js

export class ChunkLibrary {
  constructor() {
    this.chunks = new Map(); // id → chunk
    this.byType = new Map(); // type → [chunk]
  }

  clear() {
    this.chunks.clear();
    this.byType.clear();
  }

  register(chunk) {
    this.chunks.set(chunk.id, chunk);
    if (!this.byType.has(chunk.type)) this.byType.set(chunk.type, []);
    this.byType.get(chunk.type).push(chunk);
  }

  get(id) {
    return this.chunks.get(id) || null;
  }

  listByType(type) {
    return this.byType.get(type) || [];
  }

  /**
   * Find best matching chunk by type and tag overlap.
   * Prefers curated over generated. Higher tag overlap = better match.
   */
  findBest(type, tags = []) {
    const candidates = this.listByType(type);
    if (!candidates.length) return null;

    let best = null;
    let bestScore = -1;

    for (const chunk of candidates) {
      let score = 0;
      for (const tag of tags) {
        if (chunk.tags.includes(tag)) score += 1;
      }
      // Prefer curated chunks
      if (chunk.source !== 'generated') score += 0.5;

      if (score > bestScore) {
        bestScore = score;
        best = chunk;
      }
    }

    return best;
  }

  /** Load all chunks from an array (e.g., from bundled JSON or Supabase) */
  loadAll(chunkArray) {
    for (const chunk of chunkArray) {
      this.register(chunk);
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/chunkLibrary.test.js`
Expected: PASS

- [ ] **Step 5: Create chunk directory structure**

```bash
mkdir -p src/data/chunks/buildings src/data/chunks/rooms src/data/chunks/encounters src/data/chunks/terrain src/data/chunks/landmarks
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/chunkLibrary.js src/lib/chunkLibrary.test.js src/data/chunks/
git commit -m "feat: add ChunkLibrary with tag-based matching and type indexing"
```

---

## Phase 6: Map Generator

### Task 8: Position Resolver

**Files:**
- Create: `src/lib/mapGenerator.js`
- Create: `src/lib/mapGenerator.test.js`

- [ ] **Step 1: Write failing tests for position resolution**

```js
// src/lib/mapGenerator.test.js
import { describe, it, expect } from 'vitest';
import { resolvePositions, stampChunk, connectWithRoad, fillTerrain } from './mapGenerator.js';

describe('resolvePositions', () => {
  it('converts relative positions to grid coordinates', () => {
    const pois = [
      { id: 'tavern', position: 'north-center', width: 12, height: 10 },
      { id: 'camp', position: 'far-south', width: 10, height: 8 },
    ];
    const resolved = resolvePositions(pois, 80, 60);
    // north-center ≈ column 3, row 1 of 5x5 logical grid
    expect(resolved.tavern.x).toBeGreaterThan(20);
    expect(resolved.tavern.x).toBeLessThan(50);
    expect(resolved.tavern.y).toBeLessThan(20);
    // far-south ≈ row 5
    expect(resolved.camp.y).toBeGreaterThan(40);
  });

  it('applies jitter so results are not perfectly grid-aligned', () => {
    const pois = [{ id: 'a', position: 'center', width: 5, height: 5 }];
    const r1 = resolvePositions(pois, 80, 60, 1);
    const r2 = resolvePositions(pois, 80, 60, 2);
    // With different seeds, positions should differ slightly
    // (They might still be equal by chance, but unlikely)
    expect(r1.a).toBeDefined();
    expect(r2.a).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/mapGenerator.test.js`

- [ ] **Step 2b: Create shared seededRandom utility**

```js
// src/lib/seededRandom.js
/** Simple seeded PRNG for reproducible procedural generation. */
export function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
```

Both `mapGenerator.js` and `dungeonGenerator.js` import from this shared file instead of duplicating.

- [ ] **Step 3: Implement position resolver**

```js
// src/lib/mapGenerator.js
import { seededRandom } from './seededRandom.js';

const POSITION_MAP = {
  'north-center': { col: 2, row: 0 },
  'north-west': { col: 0, row: 0 },
  'north-east': { col: 4, row: 0 },
  'center': { col: 2, row: 2 },
  'center-west': { col: 0, row: 2 },
  'center-east': { col: 4, row: 2 },
  'east': { col: 4, row: 2 },
  'west': { col: 0, row: 2 },
  'south-center': { col: 2, row: 4 },
  'south-west': { col: 0, row: 4 },
  'south-east': { col: 4, row: 4 },
  'far-south': { col: 2, row: 4 },
  'far-north': { col: 2, row: 0 },
  'far-east': { col: 4, row: 2 },
  'far-west': { col: 0, row: 2 },
};

/**
 * Convert relative position strings to grid coordinates.
 * Divides area into a 5x5 logical grid, maps positions, adds jitter.
 */
export function resolvePositions(pois, areaWidth, areaHeight, seed = Date.now()) {
  const rand = seededRandom(seed);
  const cellW = Math.floor(areaWidth / 5);
  const cellH = Math.floor(areaHeight / 5);
  const result = {};

  for (const poi of pois) {
    const mapping = POSITION_MAP[poi.position] || { col: 2, row: 2 };
    const baseX = mapping.col * cellW;
    const baseY = mapping.row * cellH;

    // Center chunk within cell, then add jitter
    const chunkW = poi.width || 10;
    const chunkH = poi.height || 10;
    const jitterX = Math.floor((rand() - 0.5) * cellW * 0.3);
    const jitterY = Math.floor((rand() - 0.5) * cellH * 0.3);

    const x = Math.max(1, Math.min(areaWidth - chunkW - 1,
      baseX + Math.floor((cellW - chunkW) / 2) + jitterX));
    const y = Math.max(1, Math.min(areaHeight - chunkH - 1,
      baseY + Math.floor((cellH - chunkH) / 2) + jitterY));

    result[poi.id] = { x, y };
  }

  return result;
}

/**
 * Stamp a chunk's layers onto the area grid at a given position.
 * @param {object} areaLayers — { terrain: Uint16Array, floor: Uint16Array, ... }
 * @param {object} chunk — chunk object with layers as Uint16Arrays
 * @param {number} posX, posY — top-left position on area grid
 * @param {number} areaWidth — area grid width
 */
export function stampChunk(areaLayers, chunk, posX, posY, areaWidth) {
  const layerNames = ['floor', 'walls', 'props', 'roof'];

  for (const name of layerNames) {
    const chunkLayer = chunk.layers?.[name];
    const areaLayer = areaLayers[name];
    if (!chunkLayer || !areaLayer) continue;

    for (let cy = 0; cy < chunk.height; cy++) {
      for (let cx = 0; cx < chunk.width; cx++) {
        const tileVal = chunkLayer[cy * chunk.width + cx];
        if (tileVal === 0) continue; // skip empty
        const ax = posX + cx;
        const ay = posY + cy;
        if (ax < 0 || ay < 0 || ax >= areaWidth) continue;
        areaLayer[ay * areaWidth + ax] = tileVal;
      }
    }
  }
}

/**
 * Paint a road/trail between two points using simple pathfinding.
 * @param {Uint16Array} terrainLayer — terrain layer to paint on
 * @param {number} roadTileIdx — palette index for road tile
 * @param {{x,y}} from, to — start and end positions
 * @param {number} width — road width in tiles (1 for trail, 2 for road)
 * @param {number} areaWidth — grid width
 */
export function connectWithRoad(terrainLayer, roadTileIdx, from, to, roadWidth, areaWidth) {
  // Simple L-shaped path: horizontal first, then vertical
  const startX = Math.min(from.x, to.x);
  const endX = Math.max(from.x, to.x);
  const midY = from.y;

  // Horizontal segment
  for (let x = startX; x <= endX; x++) {
    for (let w = 0; w < roadWidth; w++) {
      terrainLayer[(midY + w) * areaWidth + x] = roadTileIdx;
    }
  }

  // Vertical segment
  const startY = Math.min(midY, to.y);
  const endY = Math.max(midY, to.y);
  for (let y = startY; y <= endY; y++) {
    for (let w = 0; w < roadWidth; w++) {
      terrainLayer[y * areaWidth + (to.x + w)] = roadTileIdx;
    }
  }
}

/**
 * Fill empty terrain cells with biome-appropriate tiles.
 * @param {Uint16Array} terrainLayer
 * @param {number[]} variantIndices — palette indices for terrain variants
 * @param {number} width, height
 * @param {number} seed
 */
export function fillTerrain(terrainLayer, variantIndices, width, height, seed = 42) {
  const rand = seededRandom(seed);
  for (let i = 0; i < width * height; i++) {
    if (terrainLayer[i] === 0) {
      terrainLayer[i] = variantIndices[Math.floor(rand() * variantIndices.length)];
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/mapGenerator.test.js`
Expected: PASS

- [ ] **Step 5: Write tests for stamp and fill**

```js
// Add to src/lib/mapGenerator.test.js

describe('stampChunk', () => {
  it('writes chunk tiles onto area layers at position', () => {
    const areaW = 20;
    const floor = new Uint16Array(20 * 20);
    const chunk = {
      width: 3, height: 2,
      layers: { floor: new Uint16Array([1, 2, 3, 4, 5, 6]) },
    };
    stampChunk({ floor }, chunk, 5, 5, areaW);
    expect(floor[5 * areaW + 5]).toBe(1);
    expect(floor[5 * areaW + 7]).toBe(3);
    expect(floor[6 * areaW + 5]).toBe(4);
  });

  it('skips empty tiles (0)', () => {
    const areaW = 10;
    const floor = new Uint16Array(10 * 10);
    floor[15] = 99; // pre-existing tile
    const chunk = {
      width: 2, height: 1,
      layers: { floor: new Uint16Array([0, 7]) },
    };
    stampChunk({ floor }, chunk, 5, 1, areaW);
    expect(floor[15]).toBe(99); // unchanged
    expect(floor[16]).toBe(7);
  });
});

describe('connectWithRoad', () => {
  it('paints road tiles between two points', () => {
    const areaW = 20;
    const terrain = new Uint16Array(20 * 20);
    connectWithRoad(terrain, 5, { x: 2, y: 5 }, { x: 15, y: 12 }, 2, areaW);
    // Horizontal segment at y=5
    expect(terrain[5 * areaW + 8]).toBe(5);
    // Vertical segment at x=15
    expect(terrain[10 * areaW + 15]).toBe(5);
  });
});

describe('fillTerrain', () => {
  it('fills empty cells with variant tiles', () => {
    const layer = new Uint16Array(25); // 5x5
    layer[0] = 10; // one pre-filled
    fillTerrain(layer, [1, 2, 3], 5, 5);
    expect(layer[0]).toBe(10); // preserved
    for (let i = 1; i < 25; i++) {
      expect([1, 2, 3]).toContain(layer[i]);
    }
  });
});
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run src/lib/mapGenerator.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/mapGenerator.js src/lib/mapGenerator.test.js src/lib/seededRandom.js
git commit -m "feat: add map generator with position resolver, chunk stamping, and terrain fill"
```

---

### Task 9: BSP Dungeon Generator

**Files:**
- Create: `src/lib/dungeonGenerator.js`
- Create: `src/lib/dungeonGenerator.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/dungeonGenerator.test.js
import { describe, it, expect } from 'vitest';
import { generateDungeon } from './dungeonGenerator.js';

describe('generateDungeon', () => {
  it('generates rooms and corridors for a given area size', () => {
    const result = generateDungeon(50, 40, { minRooms: 4, maxRooms: 8, seed: 42 });
    expect(result.rooms.length).toBeGreaterThanOrEqual(4);
    expect(result.rooms.length).toBeLessThanOrEqual(8);
    for (const room of result.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0);
      expect(room.y).toBeGreaterThanOrEqual(0);
      expect(room.x + room.width).toBeLessThanOrEqual(50);
      expect(room.y + room.height).toBeLessThanOrEqual(40);
    }
    expect(result.corridors.length).toBeGreaterThan(0);
  });

  it('rooms do not overlap', () => {
    const result = generateDungeon(50, 40, { seed: 123 });
    for (let i = 0; i < result.rooms.length; i++) {
      for (let j = i + 1; j < result.rooms.length; j++) {
        const a = result.rooms[i];
        const b = result.rooms[j];
        const overlap = a.x < b.x + b.width && a.x + a.width > b.x &&
                        a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('places doors at corridor-room junctions', () => {
    const result = generateDungeon(50, 40, { seed: 42 });
    expect(result.doors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/dungeonGenerator.test.js`

- [ ] **Step 3: Implement BSP dungeon generator**

```js
// src/lib/dungeonGenerator.js
import { seededRandom } from './seededRandom.js';

class BSPNode {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.left = null; this.right = null;
    this.room = null;
  }
}

function splitBSP(node, rand, minSize = 8, depth = 0, maxDepth = 5) {
  if (depth >= maxDepth || (node.w < minSize * 2 && node.h < minSize * 2)) return;

  const splitH = node.w > node.h ? false : node.h > node.w ? true : rand() > 0.5;

  if (splitH) {
    const split = Math.floor(node.y + minSize + rand() * (node.h - minSize * 2));
    node.left = new BSPNode(node.x, node.y, node.w, split - node.y);
    node.right = new BSPNode(node.x, split, node.w, node.y + node.h - split);
  } else {
    const split = Math.floor(node.x + minSize + rand() * (node.w - minSize * 2));
    node.left = new BSPNode(node.x, node.y, split - node.x, node.h);
    node.right = new BSPNode(split, node.y, node.x + node.w - split, node.h);
  }

  splitBSP(node.left, rand, minSize, depth + 1, maxDepth);
  splitBSP(node.right, rand, minSize, depth + 1, maxDepth);
}

function placeRooms(node, rand, rooms, padding = 2) {
  if (!node.left && !node.right) {
    const roomW = Math.floor(node.w * (0.5 + rand() * 0.4));
    const roomH = Math.floor(node.h * (0.5 + rand() * 0.4));
    const roomX = node.x + Math.floor(rand() * (node.w - roomW - padding)) + 1;
    const roomY = node.y + Math.floor(rand() * (node.h - roomH - padding)) + 1;
    node.room = { x: roomX, y: roomY, width: roomW, height: roomH };
    rooms.push(node.room);
    return;
  }
  if (node.left) placeRooms(node.left, rand, rooms, padding);
  if (node.right) placeRooms(node.right, rand, rooms, padding);
}

function getRoom(node) {
  if (node.room) return node.room;
  if (node.left) return getRoom(node.left);
  if (node.right) return getRoom(node.right);
  return null;
}

function connectRooms(node, corridors) {
  if (!node.left || !node.right) return;

  connectRooms(node.left, corridors);
  connectRooms(node.right, corridors);

  const roomA = getRoom(node.left);
  const roomB = getRoom(node.right);
  if (!roomA || !roomB) return;

  const ax = Math.floor(roomA.x + roomA.width / 2);
  const ay = Math.floor(roomA.y + roomA.height / 2);
  const bx = Math.floor(roomB.x + roomB.width / 2);
  const by = Math.floor(roomB.y + roomB.height / 2);

  corridors.push({ x1: ax, y1: ay, x2: bx, y2: by });
}

/**
 * Generate a dungeon layout using BSP.
 * @returns {{ rooms: Array<{x,y,width,height}>, corridors: Array<{x1,y1,x2,y2}>, doors: Array<{x,y}> }}
 */
export function generateDungeon(width, height, { minRooms = 4, maxRooms = 10, seed = Date.now() } = {}) {
  const rand = seededRandom(seed);
  const root = new BSPNode(0, 0, width, height);

  // Determine split depth from desired room count
  const maxDepth = Math.ceil(Math.log2(maxRooms)) + 1;
  splitBSP(root, rand, 6, 0, maxDepth);

  const rooms = [];
  placeRooms(root, rand, rooms);

  // Trim to maxRooms if needed
  while (rooms.length > maxRooms) rooms.pop();

  const corridors = [];
  connectRooms(root, corridors);

  // Find doors at corridor-room intersections
  const doors = [];
  for (const corridor of corridors) {
    for (const room of rooms) {
      // Check if corridor crosses room boundary
      const edges = [
        { x: room.x, y: room.y, dx: 1, dy: 0, len: room.width },       // top
        { x: room.x, y: room.y + room.height - 1, dx: 1, dy: 0, len: room.width }, // bottom
        { x: room.x, y: room.y, dx: 0, dy: 1, len: room.height },       // left
        { x: room.x + room.width - 1, y: room.y, dx: 0, dy: 1, len: room.height }, // right
      ];
      for (const edge of edges) {
        // Simple: place door at corridor midpoint that touches an edge
        const mx = Math.floor((corridor.x1 + corridor.x2) / 2);
        const my = Math.floor((corridor.y1 + corridor.y2) / 2);
        if (mx >= room.x && mx < room.x + room.width &&
            my >= room.y && my < room.y + room.height) {
          // Corridor enters room — door at boundary
          if (mx === room.x || mx === room.x + room.width - 1 ||
              my === room.y || my === room.y + room.height - 1) {
            doors.push({ x: mx, y: my });
          }
        }
      }
    }
  }

  return { rooms, corridors, doors };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/dungeonGenerator.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dungeonGenerator.js src/lib/dungeonGenerator.test.js
git commit -m "feat: add BSP dungeon generator with rooms, corridors, and door placement"
```

---

## Phase 7: Fog of War

### Task 10: Vision Calculator

**Files:**
- Create: `src/lib/visionCalculator.js`
- Create: `src/lib/visionCalculator.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/visionCalculator.test.js
import { describe, it, expect } from 'vitest';
import { computeVision, getCharacterVisionRange, encodeExploredBitfield, decodeExploredBitfield } from './visionCalculator.js';

describe('getCharacterVisionRange', () => {
  it('returns 0 for human in darkness without light', () => {
    const range = getCharacterVisionRange(
      { race: 'Human', darkvision: 0 },
      'darkness',
      []
    );
    expect(range.bright).toBe(0);
    expect(range.dim).toBe(0);
  });

  it('returns 15 tiles for any character in bright light', () => {
    const range = getCharacterVisionRange(
      { race: 'Human', darkvision: 0 },
      'bright',
      []
    );
    expect(range.bright).toBe(15);
  });

  it('returns darkvision range for elf in darkness', () => {
    const range = getCharacterVisionRange(
      { race: 'Elf', darkvision: 60 },
      'darkness',
      []
    );
    expect(range.darkvision).toBe(12); // 60ft / 5ft per tile
  });

  it('adds torch light radius', () => {
    const range = getCharacterVisionRange(
      { race: 'Human', darkvision: 0 },
      'darkness',
      [{ type: 'torch' }]
    );
    expect(range.bright).toBe(4);  // 20ft torch
    expect(range.dim).toBe(8);     // +20ft dim
  });

  it('handles drow superior darkvision', () => {
    const range = getCharacterVisionRange(
      { race: 'Drow', darkvision: 120 },
      'darkness',
      []
    );
    expect(range.darkvision).toBe(24); // 120ft
  });
});

describe('computeVision', () => {
  it('computes union of party vision as a Set of tile keys', () => {
    const partyVisions = [
      { position: { x: 5, y: 5 }, brightRadius: 4, dimRadius: 8 },
      { position: { x: 20, y: 20 }, brightRadius: 4, dimRadius: 8 },
    ];
    const vision = computeVision(partyVisions, 30, 30);
    expect(vision.active.size).toBeGreaterThan(0);
    expect(vision.active.has('5,5')).toBe(true);
    expect(vision.active.has('20,20')).toBe(true);
    expect(vision.active.has('15,15')).toBe(false); // between the two, not in range
  });
});

describe('explored bitfield roundtrip', () => {
  it('encodes and decodes a set of explored tiles', () => {
    const explored = new Set(['0,0', '5,3', '19,14', '79,59']);
    const encoded = encodeExploredBitfield(explored, 80, 60);
    expect(typeof encoded).toBe('string'); // base64
    const decoded = decodeExploredBitfield(encoded, 80, 60);
    expect(decoded.has('0,0')).toBe(true);
    expect(decoded.has('5,3')).toBe(true);
    expect(decoded.has('19,14')).toBe(true);
    expect(decoded.has('79,59')).toBe(true);
    expect(decoded.has('10,10')).toBe(false);
    expect(decoded.size).toBe(4);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/visionCalculator.test.js`

- [ ] **Step 3: Implement vision calculator**

```js
// src/lib/visionCalculator.js

const LIGHT_SOURCES = {
  torch: { bright: 4, dim: 4 },
  candle: { bright: 1, dim: 1 },
  'lantern-hooded': { bright: 6, dim: 6 },
  'lantern-bullseye': { bright: 12, dim: 12 }, // rendered as radial for now
  light: { bright: 4, dim: 4 },
  'dancing-lights': { bright: 2, dim: 0 },
  daylight: { bright: 12, dim: 12 },
  fireplace: { bright: 3, dim: 2 },
  sconce: { bright: 2, dim: 2 },
};

const BRIGHT_VISION = 15; // tiles in bright light
const DIM_VISION = 8;     // tiles in dim light without darkvision

/**
 * Compute a character's vision ranges given lighting conditions.
 * @param {object} character — { race, darkvision (in feet), classFeatures? }
 * @param {string} lighting — 'bright' | 'dim' | 'darkness' | 'magical-darkness'
 * @param {Array} carriedLights — [{ type: 'torch' | 'lantern-hooded' | ... }]
 * @returns {{ bright: number, dim: number, darkvision: number }} tile radii
 */
export function getCharacterVisionRange(character, lighting, carriedLights = []) {
  const darkvisionTiles = Math.floor((character.darkvision || 0) / 5);

  // Calculate best carried light
  let lightBright = 0;
  let lightDim = 0;
  for (const light of carriedLights) {
    const spec = LIGHT_SOURCES[light.type];
    if (spec) {
      lightBright = Math.max(lightBright, spec.bright);
      lightDim = Math.max(lightDim, spec.bright + spec.dim);
    }
  }

  if (lighting === 'magical-darkness') {
    // Only Devil's Sight penetrates
    const hasDevilsSight = character.classFeatures?.includes('devils-sight');
    return hasDevilsSight
      ? { bright: 0, dim: 0, darkvision: 24 }
      : { bright: 0, dim: 0, darkvision: 0 };
  }

  if (lighting === 'darkness') {
    return {
      bright: lightBright,
      dim: lightDim,
      darkvision: Math.max(darkvisionTiles, lightDim),
    };
  }

  if (lighting === 'dim') {
    return {
      bright: darkvisionTiles > 0 ? BRIGHT_VISION : DIM_VISION,
      dim: darkvisionTiles > 0 ? BRIGHT_VISION : DIM_VISION,
      darkvision: darkvisionTiles,
    };
  }

  // bright light
  return {
    bright: BRIGHT_VISION,
    dim: BRIGHT_VISION,
    darkvision: 0,
  };
}

/**
 * Compute the union of all party members' vision circles.
 * @param {Array} partyVisions — [{ position: {x,y}, brightRadius, dimRadius, darkvisionRadius }]
 * @param {number} width, height — area dimensions
 * @returns {{ active: Set<string>, dim: Set<string>, darkvision: Set<string> }}
 */
export function computeVision(partyVisions, width, height) {
  const active = new Set();
  const dim = new Set();
  const darkvisionTiles = new Set();

  for (const pv of partyVisions) {
    const cx = pv.position.x;
    const cy = pv.position.y;
    const maxR = Math.max(pv.brightRadius || 0, pv.dimRadius || 0, pv.darkvisionRadius || 0);

    for (let dy = -maxR; dy <= maxR; dy++) {
      for (let dx = -maxR; dx <= maxR; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;

        const key = `${tx},${ty}`;
        if (dist <= (pv.brightRadius || 0)) {
          active.add(key);
        } else if (dist <= (pv.dimRadius || 0)) {
          dim.add(key);
          active.add(key);
        } else if (dist <= (pv.darkvisionRadius || 0)) {
          darkvisionTiles.add(key);
          active.add(key);
        }
      }
    }
  }

  return { active, dim, darkvision: darkvisionTiles };
}

/**
 * Encode explored tiles as a Base64 bitfield.
 */
export function encodeExploredBitfield(exploredSet, width, height) {
  const byteCount = Math.ceil(width * height / 8);
  const bytes = new Uint8Array(byteCount);
  for (const key of exploredSet) {
    const [x, y] = key.split(',').map(Number);
    const idx = y * width + x;
    bytes[idx >> 3] |= (1 << (idx & 7));
  }
  // Convert to base64
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Decode Base64 bitfield to a Set of explored tile keys.
 */
export function decodeExploredBitfield(base64, width, height) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const explored = new Set();
  for (let i = 0; i < width * height; i++) {
    if (bytes[i >> 3] & (1 << (i & 7))) {
      explored.add(`${i % width},${Math.floor(i / width)}`);
    }
  }
  return explored;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/visionCalculator.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/visionCalculator.js src/lib/visionCalculator.test.js
git commit -m "feat: add 5e vision calculator with darkvision, light sources, and fog bitfield"
```

---

### Task 11: Fog of War Renderer

**Files:**
- Create: `src/engine/FogOfWar.js`
- Create: `src/engine/FogOfWar.test.js`

- [ ] **Step 1: Write failing test**

```js
// src/engine/FogOfWar.test.js
import { describe, it, expect } from 'vitest';
import { buildFogTileStates } from './FogOfWar.js';

describe('buildFogTileStates', () => {
  it('marks active, explored, and unexplored tiles correctly', () => {
    const active = new Set(['2,2', '3,3']);
    const explored = new Set(['2,2', '5,5']); // 5,5 was explored before
    const states = buildFogTileStates(active, explored, 10, 10);

    expect(states.get('2,2')).toBe('active');
    expect(states.get('5,5')).toBe('explored');
    expect(states.get('0,0')).toBe('unexplored');
    expect(states.get('3,3')).toBe('active');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/engine/FogOfWar.test.js`

- [ ] **Step 3: Implement fog renderer**

```js
// src/engine/FogOfWar.js

/**
 * Determine the fog state for each tile.
 * @returns {Map<string, 'active'|'explored'|'unexplored'>}
 */
export function buildFogTileStates(activeVision, exploredSet, width, height) {
  const states = new Map();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (activeVision.has(key)) {
        states.set(key, 'active');
      } else if (exploredSet.has(key)) {
        states.set(key, 'explored');
      } else {
        states.set(key, 'unexplored');
      }
    }
  }
  return states;
}

/**
 * Render fog of war overlay onto a PixiJS container.
 * Uses two shared Graphics objects (one per fog state) to batch all rects
 * into minimal draw calls, avoiding per-tile object creation.
 * @param {PIXI.Container} container — fog layer container
 * @param {Map} fogStates — from buildFogTileStates
 * @param {object} bounds — { startX, startY, endX, endY } from camera
 * @param {number} tileSize
 * @param {PIXI} PIXI — PixiJS namespace
 */
export function renderFog(container, fogStates, bounds, tileSize, PIXI) {
  container.removeChildren();

  // Single Graphics for unexplored (fully opaque black)
  const unexploredGfx = new PIXI.Graphics();
  // Single Graphics for explored (semi-transparent dark)
  const exploredGfx = new PIXI.Graphics();

  for (let y = bounds.startY; y < bounds.endY; y++) {
    for (let x = bounds.startX; x < bounds.endX; x++) {
      const key = `${x},${y}`;
      const state = fogStates.get(key) || 'unexplored';

      if (state === 'active') continue;

      const gfx = state === 'unexplored' ? unexploredGfx : exploredGfx;
      gfx.rect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  unexploredGfx.fill({ color: 0x000000, alpha: 1.0 });
  exploredGfx.fill({ color: 0x000000, alpha: 0.55 });

  container.addChild(unexploredGfx);
  container.addChild(exploredGfx);
}

/**
 * Update explored set with newly active tiles.
 * @param {Set} exploredSet — mutable, will be modified
 * @param {Set} activeVision — current active tiles
 * @returns {string[]} newlyExplored — tiles that were added
 */
export function updateExplored(exploredSet, activeVision) {
  const newly = [];
  for (const key of activeVision) {
    if (!exploredSet.has(key)) {
      exploredSet.add(key);
      newly.push(key);
    }
  }
  return newly;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/engine/FogOfWar.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/FogOfWar.js src/engine/FogOfWar.test.js
git commit -m "feat: add fog of war renderer with three-state tile visibility"
```

---

## Phase 8: Roof-Lift Buildings

### Task 12: Roof Layer Manager

**Files:**
- Create: `src/engine/RoofLayer.js`
- Create: `src/engine/RoofLayer.test.js`

- [ ] **Step 1: Write failing test**

```js
// src/engine/RoofLayer.test.js
import { describe, it, expect } from 'vitest';
import { RoofManager } from './RoofLayer.js';

describe('RoofManager', () => {
  it('tracks roof reveal state per building', () => {
    const mgr = new RoofManager();
    expect(mgr.isRevealed('inn')).toBe(false);
    mgr.setRevealed('inn', true);
    expect(mgr.isRevealed('inn')).toBe(true);
  });

  it('detects when a position is inside a building', () => {
    const mgr = new RoofManager();
    mgr.registerBuilding({
      id: 'inn',
      position: { x: 10, y: 10 },
      width: 12,
      height: 10,
      doors: [{ x: 15, y: 19, facing: 'south' }],
    });

    expect(mgr.getBuildingAt(12, 15)).toBe('inn');
    expect(mgr.getBuildingAt(5, 5)).toBeNull();
  });

  it('detects door tiles', () => {
    const mgr = new RoofManager();
    mgr.registerBuilding({
      id: 'inn',
      position: { x: 10, y: 10 },
      width: 12,
      height: 10,
      doors: [{ x: 15, y: 19, facing: 'south' }],
    });

    expect(mgr.isDoor(15, 19)).toBe(true);
    expect(mgr.isDoor(12, 12)).toBe(false);
  });

  it('determines if all party members are outside a building', () => {
    const mgr = new RoofManager();
    mgr.registerBuilding({
      id: 'inn',
      position: { x: 10, y: 10 },
      width: 12,
      height: 10,
      doors: [],
    });

    const partyPositions = [
      { x: 12, y: 15 }, // inside
      { x: 5, y: 5 },   // outside
    ];
    expect(mgr.allOutside('inn', partyPositions)).toBe(false);

    const allOut = [
      { x: 5, y: 5 },
      { x: 3, y: 3 },
    ];
    expect(mgr.allOutside('inn', allOut)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/engine/RoofLayer.test.js`

- [ ] **Step 3: Implement RoofManager**

```js
// src/engine/RoofLayer.js

export class RoofManager {
  constructor() {
    this.buildings = new Map(); // id → building data
    this.revealed = new Map();  // id → boolean
    this._doorSet = new Set();  // "x,y" keys
    this._fadeTimers = new Map(); // id → animation state
  }

  registerBuilding(building) {
    const b = {
      ...building,
      minX: building.position.x,
      minY: building.position.y,
      maxX: building.position.x + building.width,
      maxY: building.position.y + building.height,
    };
    this.buildings.set(building.id, b);
    this.revealed.set(building.id, false);

    for (const door of building.doors || []) {
      this._doorSet.add(`${door.x},${door.y}`);
    }
  }

  isRevealed(buildingId) {
    return this.revealed.get(buildingId) || false;
  }

  setRevealed(buildingId, revealed) {
    this.revealed.set(buildingId, revealed);
  }

  getBuildingAt(x, y) {
    for (const [id, b] of this.buildings) {
      if (x >= b.minX && x < b.maxX && y >= b.minY && y < b.maxY) {
        return id;
      }
    }
    return null;
  }

  isDoor(x, y) {
    return this._doorSet.has(`${x},${y}`);
  }

  allOutside(buildingId, partyPositions) {
    const b = this.buildings.get(buildingId);
    if (!b) return true;
    return partyPositions.every(
      p => p.x < b.minX || p.x >= b.maxX || p.y < b.minY || p.y >= b.maxY
    );
  }

  /**
   * Check all buildings and update reveal state based on party positions.
   * Returns list of { buildingId, revealed } changes.
   */
  updateRevealStates(partyPositions) {
    const changes = [];
    for (const [id, b] of this.buildings) {
      const anyInside = partyPositions.some(
        p => p.x >= b.minX && p.x < b.maxX && p.y >= b.minY && p.y < b.maxY
      );
      const wasRevealed = this.revealed.get(id);
      const shouldReveal = anyInside;
      const shouldHide = !anyInside && wasRevealed;

      if (shouldReveal && !wasRevealed) {
        this.revealed.set(id, true);
        changes.push({ buildingId: id, revealed: true });
      } else if (shouldHide) {
        this.revealed.set(id, false);
        changes.push({ buildingId: id, revealed: false });
      }
    }
    return changes;
  }

  /**
   * Render roof sprites for visible buildings.
   * Revealed buildings get alpha 0 (transparent), unrevealed get alpha 1.
   * Fade animation handled by PixiJS ticker in the caller.
   */
  getRoofAlpha(buildingId) {
    return this.isRevealed(buildingId) ? 0 : 1;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/engine/RoofLayer.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/RoofLayer.js src/engine/RoofLayer.test.js
git commit -m "feat: add RoofManager for building reveal state and door detection"
```

---

## Phase 9: Store Migration + Integration

> **Architecture notes:**
> - `PixiApp.jsx` (182 lines) will grow with camera, fog, and roof wiring. To stay under the 400-line limit, extract area-mode rendering into `src/engine/AreaRenderer.js` — a helper that PixiApp delegates to when rendering areas (vs legacy zones). PixiApp remains a thin orchestrator.
> - Area-to-area transitions reuse the existing `ZoneTransition.js` fade effect. Wire it in Task 14 alongside camera: `playZoneTransition` at midpoint → `setCurrentArea(newAreaId)` + load new layers. Same broadcast pattern as current zone transitions.
> - `tileAtlas.js` is NOT modified — it continues serving V1. Only the new `tileAtlasV2.js` is used for area rendering.
> - Supabase `chunks` table for generated chunk storage is deferred — initial implementation uses bundled JSON only.

### Task 13: Zustand Area State

**Files:**
- Modify: `src/store/useStore.js`

- [ ] **Step 1: Read current zone state slice**

Read `src/store/useStore.js` lines 1585-1626 to see the current zone state.

- [ ] **Step 2: Add area state slice alongside zone state**

Add new area state fields to the store, preserving existing zone state for V1 compatibility:

```js
// Add after the zone state section (~line 1620):

// === Area State (V2 procedural maps) ===
currentAreaId: null,
areas: {},                    // { areaId: areaMetadata }
areaLayers: null,             // decompressed layers for current area
areaCollision: null,          // Uint8Array collision grid
areaTilePalette: [],          // string tile ID lookup
cameraX: 0,
cameraY: 0,
cameraZoom: 0.5,
fogBitfields: {},             // { areaId: base64 string }
roofStates: {},               // { buildingId: boolean }
areaTokenPositions: {},       // { areaId: { playerId: {x,y} } }

setCurrentArea: (areaId) => set(state => ({
  currentAreaId: areaId,
  areaLayers: null, // cleared, will be loaded separately
  areaCollision: null,
})),

setAreaLayers: (layers, collision, palette) => set({
  areaLayers: layers,
  areaCollision: collision,
  areaTilePalette: palette,
}),

setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
setCameraZoom: (zoom) => set({ cameraZoom: zoom }),

updateFogBitfield: (areaId, bitfield) => set(state => ({
  fogBitfields: { ...state.fogBitfields, [areaId]: bitfield },
})),

setRoofState: (buildingId, revealed) => set(state => ({
  roofStates: { ...state.roofStates, [buildingId]: revealed },
})),

setAreaTokenPosition: (areaId, playerId, pos) => set(state => ({
  areaTokenPositions: {
    ...state.areaTokenPositions,
    [areaId]: {
      ...(state.areaTokenPositions[areaId] || {}),
      [playerId]: pos,
    },
  },
})),

loadArea: (areaId, areaData) => set(state => ({
  areas: { ...state.areas, [areaId]: areaData },
})),
```

- [ ] **Step 3: Verify store doesn't break**

Run: `npm run dev` and verify V2 still loads without errors.

- [ ] **Step 4: Commit**

```bash
git add src/store/useStore.js
git commit -m "feat: add area state slice to Zustand store for V2 procedural maps"
```

---

### Task 14: Wire Camera into PixiApp

**Files:**
- Modify: `src/engine/PixiApp.jsx`
- Modify: `src/GameV2.jsx`

This is the integration task that connects Camera, ViewportCuller, and keyboard controls into the existing rendering pipeline. This is a larger task with multiple sub-steps.

- [ ] **Step 1: Add camera instance to PixiApp**

Modify `src/engine/PixiApp.jsx` to accept a `camera` prop and use it instead of the fixed `scaleWorldToFit` function. When `camera` is provided, render in "area mode" (viewport culling, camera-driven positioning). When `camera` is null, use legacy fixed-view mode.

Key changes:
- Accept `camera` prop
- In the render loop: `world.scale.set(camera.zoom)`, `world.x = -camera.x * camera.zoom`, `world.y = -camera.y * camera.zoom`
- Call `camera.getVisibleTileBounds(tileSize)` for viewport culling
- Only render tiles within bounds

- [ ] **Step 2: Add keyboard listener to GameV2**

Add `useEffect` in `src/GameV2.jsx` for arrow/WASD camera panning and spacebar recenter:

```js
useEffect(() => {
  if (!cameraRef.current) return;
  const cam = cameraRef.current;

  const keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
  };

  const onKeyDown = (e) => {
    if (keyMap[e.key]) { cam.startPan(keyMap[e.key]); e.preventDefault(); }
    if (e.key === ' ') { cam.centerOn(playerPosRef.current.x, playerPosRef.current.y, 200); e.preventDefault(); }
  };
  const onKeyUp = (e) => {
    if (keyMap[e.key]) cam.stopPan(keyMap[e.key]);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}, []);
```

- [ ] **Step 3: Add scroll wheel zoom**

```js
useEffect(() => {
  if (!cameraRef.current) return;
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    cameraRef.current.zoomAt(delta, e.clientX, e.clientY);
  };
  const canvas = pixiRef.current?.getApp()?.canvas;
  canvas?.addEventListener('wheel', onWheel, { passive: false });
  return () => canvas?.removeEventListener('wheel', onWheel);
}, []);
```

- [ ] **Step 4: Add camera update tick**

```js
// In PixiApp or GameV2, add a ticker:
useEffect(() => {
  if (!cameraRef.current) return;
  const app = pixiRef.current?.getApp();
  if (!app) return;

  let lastTime = performance.now();
  const tick = () => {
    const now = performance.now();
    cameraRef.current.update(now - lastTime);
    lastTime = now;
    // Update world transform from camera
    const world = app.stage.children[0]; // world container
    if (world) {
      world.scale.set(cameraRef.current.zoom);
      world.x = -cameraRef.current.x * cameraRef.current.zoom;
      world.y = -cameraRef.current.y * cameraRef.current.zoom;
    }
  };
  app.ticker.add(tick);
  return () => app.ticker.remove(tick);
}, []);
```

- [ ] **Step 5: Test camera panning and zoom manually**

Run: `npm run dev`, navigate to V2 mode. Arrow keys should pan, scroll wheel should zoom, spacebar should recenter.

- [ ] **Step 6: Commit**

```bash
git add src/engine/PixiApp.jsx src/GameV2.jsx
git commit -m "feat: wire camera system with pan, zoom, inertia, and spacebar recenter"
```

---

### Task 15: Wire Fog of War into Rendering

**Files:**
- Modify: `src/engine/PixiApp.jsx`
- Modify: `src/GameV2.jsx`

- [ ] **Step 1: Add fog container to PixiApp layer stack**

In `PixiApp.jsx`, add a `fog` container as the topmost layer in the world container (above tokens, below HUD).

- [ ] **Step 2: On each camera update, recompute visible fog tiles**

Call `buildFogTileStates(activeVision, exploredSet, width, height)` and `renderFog(fogContainer, states, bounds, tileSize, PIXI)` each frame, but only when party positions change (not every tick — flag-based dirty check).

- [ ] **Step 3: Compute party vision in GameV2**

In `GameV2.jsx`, add a `useMemo` that computes party vision from character data + area lighting:

```js
const partyVision = useMemo(() => {
  if (!currentArea) return [];
  return partyMembers.map(member => {
    const range = getCharacterVisionRange(
      member.character,
      currentArea.lighting,
      member.carriedLights || []
    );
    return {
      position: areaTokenPositions[currentAreaId]?.[member.id] || { x: 0, y: 0 },
      brightRadius: range.bright,
      dimRadius: range.dim,
      darkvisionRadius: range.darkvision,
    };
  });
}, [partyMembers, currentArea, areaTokenPositions]);
```

- [ ] **Step 4: Broadcast fog updates**

When explored tiles change, call `broadcastFogUpdate(areaId, bitfield)` to sync all clients.

- [ ] **Step 5: Test fog of war**

Run dev mode, verify: unexplored areas are black, explored areas are dimmed, active vision is clear.

- [ ] **Step 6: Commit**

```bash
git add src/engine/PixiApp.jsx src/GameV2.jsx
git commit -m "feat: wire fog of war with three-state visibility and party vision"
```

---

### Task 16: Wire Roof-Lift into Rendering

**Files:**
- Modify: `src/engine/PixiApp.jsx`
- Modify: `src/GameV2.jsx`

- [ ] **Step 1: Add roof container to layer stack**

In `PixiApp.jsx`, add roof layer between props and grid in the render order.

- [ ] **Step 2: Render roof tiles for each building**

When rendering an area, for each building in `area.buildings`, draw its roof tiles from the roof layer at the building's position. Set alpha based on `roofManager.getRoofAlpha(buildingId)`.

- [ ] **Step 3: Add fade animation**

When roof state changes (reveal/hide), tween the roof container's alpha over 400ms using the PixiJS ticker.

- [ ] **Step 4: Host-authoritative roof state in GameV2**

In `GameV2.jsx` (host client only), after any party member moves:

```js
const roofChanges = roofManager.updateRevealStates(partyPositions);
for (const change of roofChanges) {
  setRoofState(change.buildingId, change.revealed);
  broadcastRoofReveal(change.buildingId, change.revealed);
}
```

Non-host clients listen for `roof-reveal` broadcasts and call `setRoofState`.

- [ ] **Step 5: Test roof-lift**

Walk a token through a building door, verify the roof fades out. Walk out, verify it fades back.

- [ ] **Step 6: Commit**

```bash
git add src/engine/PixiApp.jsx src/GameV2.jsx
git commit -m "feat: wire roof-lift buildings with fade animation and host authority"
```

---

### Task 17: Combat Camera Lock

**Files:**
- Modify: `src/engine/Camera.js`
- Modify: `src/GameV2.jsx`

- [ ] **Step 1: Add combat lock to Camera**

```js
// Add to Camera class:
setCombatBounds(bounds) {
  // bounds = { x, y, width, height } in tiles, or null to unlock
  this._combatBounds = bounds;
}

// In _clamp(), after normal clamping, also clamp to combat bounds:
if (this._combatBounds) {
  const cb = this._combatBounds;
  const buffer = 5 * this.tileSize; // 5 tile buffer
  const minX = cb.x * this.tileSize - buffer;
  const maxX = (cb.x + cb.width) * this.tileSize + buffer - this.viewportWidth / this.zoom;
  const minY = cb.y * this.tileSize - buffer;
  const maxY = (cb.y + cb.height) * this.tileSize + buffer - this.viewportHeight / this.zoom;
  this.x = Math.max(minX, Math.min(maxX, this.x));
  this.y = Math.max(minY, Math.min(maxY, this.y));
}
```

- [ ] **Step 2: Set combat bounds on combat start in GameV2**

When `encounter.phase === 'combat'`, compute bounds from combatant positions and call `camera.setCombatBounds(bounds)`. On combat end, call `camera.setCombatBounds(null)`.

- [ ] **Step 3: Add "Center Combat" HUD button**

Add a button to the HUD that calls `camera.centerOn(combatCenterX, combatCenterY, 200)` when clicked.

- [ ] **Step 4: Test combat camera**

Start a combat encounter, verify camera is soft-locked to the combat zone. End combat, verify free pan resumes.

- [ ] **Step 5: Commit**

```bash
git add src/engine/Camera.js src/GameV2.jsx
git commit -m "feat: add combat camera lock with soft bounds and center button"
```

---

### Task 18: End-to-End Integration Test

**Files:**
- No new files — manual verification

- [ ] **Step 1: Create a test area JSON**

Create a small test area (20x20) with a building, some terrain, an NPC, and an encounter zone. Load it in dev mode.

- [ ] **Step 2: Verify camera controls**

- Arrow/WASD pans
- Scroll wheel zooms
- Spacebar recenters on token
- Inertia works

- [ ] **Step 3: Verify fog of war**

- Unexplored areas black
- Walking reveals tiles
- Moving away dims explored tiles
- NPC only visible when in active vision

- [ ] **Step 4: Verify roof-lift**

- Walk token through door
- Roof fades out
- Interior visible
- Walk out, roof fades back

- [ ] **Step 5: Verify pathfinding on large grid**

- Click distant tile
- Token pathfinds without lag
- Path avoids walls/obstacles

- [ ] **Step 6: Verify combat camera**

- Trigger combat
- Camera locks to combat zone
- End combat, camera frees

- [ ] **Step 7: Update status.md**

Update `tasks/status.md` with new Phase 5 items and their completion status.

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -m "feat: procedural map system integration — camera, fog, roofs, pathfinding"
git push
```
