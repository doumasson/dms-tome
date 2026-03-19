# Phase 2: Zone World System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the linear scene list with a connected zone graph — players click exit doors to transition between zones, campaigns generate as explorable worlds, and all transitions sync across multiplayer clients.

**Architecture:** The Zustand store gains a zone-graph slice (`campaign.zones{}`, `currentZoneId`) alongside the existing scene slice (V1 preserved). GameV2 loads zones from the store instead of a hardcoded demo. Exit clicks trigger zone transitions with a fade animation. Campaign generation outputs a zone graph that maps to room templates. A new `zone-transition` broadcast type syncs all players.

**Tech Stack:** React 19, Zustand 5, Supabase Realtime, Claude Haiku (campaign gen), PixiJS v8

**Spec:** `docs/superpowers/specs/2026-03-18-dms-tome-v2-design.md` (sections: Zustand Store V2 Schema, World Structure, Campaign Generation Flow, Movement & Interaction)

**Depends on:** Phase 1 complete (branch `phase1/tilemap-renderer-hud`)

---

## File Structure

### New files to create

```
src/
├── engine/
│   └── ZoneTransition.js            # Fade-out/fade-in animation between zones (~40 lines)
│
├── data/
│   ├── demoWorld.json               # Demo world with 3 connected zones for testing (~150 lines)
│   └── roomTemplates/
│       ├── index.js                 # Template registry: type → template lookup (~30 lines)
│       ├── tavern_bar.json          # Inn bar room template (~40 lines)
│       ├── tavern_kitchen.json      # Kitchen template (~40 lines)
│       └── town_square.json         # Outdoor town square template (~40 lines)
│
├── lib/
│   └── campaignGenerator.js         # Claude API call to generate zone graph + template merge (~120 lines)
│
└── hud/
    └── ExitTooltip.jsx              # "Press to enter [Zone Name]" tooltip on exit hover (~30 lines)

tests/
├── lib/
│   └── campaignGenerator.test.js    # Template matching + zone merge tests (~60 lines)
└── engine/
    └── zoneTransition.test.js       # Zone transition state machine tests (~40 lines)
```

### Existing files to modify

```
src/store/useStore.js                # Add zone-graph slice (currentZoneId, zones{}, visitedZones, zoneTokenPositions)
src/lib/liveChannel.js               # Add 'zone-transition' broadcast type
src/engine/PixiApp.jsx               # Handle zone transitions (fade, reload tilemap)
src/engine/ExitZone.js               # Add click handler → emit zone transition
src/GameV2.jsx                       # Load zones from store instead of hardcoded demo, handle transitions
src/hud/NarratorFloat.jsx            # Position adjustment for zone transition messages
src/lib/narratorApi.js               # Update buildSystemPrompt to use zone data instead of scene data
```

---

## Task 1: Room Templates + Registry

**Files:**
- Create: `src/data/roomTemplates/tavern_bar.json`
- Create: `src/data/roomTemplates/tavern_kitchen.json`
- Create: `src/data/roomTemplates/town_square.json`
- Create: `src/data/roomTemplates/index.js`

- [ ] **Step 1: Create tavern_bar template**

Create `src/data/roomTemplates/tavern_bar.json` — copy the layers from the existing `demoZone.json` but WITHOUT npcs/exits (those come from AI generation). Include spawn points for NPC placement:

```json
{
  "type": "tavern_bar",
  "name": "Tavern Bar Room",
  "width": 12,
  "height": 10,
  "layers": {
    "floor": [
      [5,5,5,5,5,5,5,5,5,5,5,5],
      [1,2,1,1,1,1,1,1,1,1,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,1,1,1,1,2,1],
      [1,1,1,1,1,48,48,1,1,1,1,1],
      [1,1,1,1,1,48,48,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,1,1,1,1,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [5,5,5,5,5,1,1,5,5,5,5,5]
    ],
    "walls": [
      [21,19,19,19,19,19,19,19,19,19,19,22],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [18,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,18],
      [23,19,19,19,19,-1,-1,19,19,19,19,24]
    ],
    "props": [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,46,-1,-1,46,-1,-1,-1,-1],
      [-1,40,-1,-1,45,45,45,45,-1,-1,37,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,37,-1],
      [-1,-1,33,-1,-1,-1,-1,-1,-1,34,-1,-1],
      [-1,-1,-1,-1,-1,47,-1,-1,-1,-1,-1,-1],
      [-1,-1,35,-1,-1,-1,-1,-1,-1,36,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,38,38,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]
    ]
  },
  "spawnPoints": {
    "bartender": { "x": 6, "y": 2 },
    "patron_1": { "x": 3, "y": 5 },
    "patron_2": { "x": 9, "y": 5 },
    "entrance": { "x": 5, "y": 8 }
  },
  "exitSlots": {
    "south": { "x": 5, "y": 9, "width": 2 },
    "north": { "x": 5, "y": 0, "width": 2 }
  }
}
```

- [ ] **Step 2: Create tavern_kitchen and town_square templates**

Create `src/data/roomTemplates/tavern_kitchen.json`:
- 10x8 room, stone floors, wooden walls, cooking props (reuse existing tile indices)
- spawnPoints: cook, helper, entrance
- exitSlots: east (connects to bar), south (connects to cellar/outside)

Create `src/data/roomTemplates/town_square.json`:
- 16x14 outdoor zone, grass/dirt floor tiles, no walls (open area), scattered props (market stalls = crates, well = barrel)
- spawnPoints: merchant, guard, townsfolk_1, townsfolk_2, center
- exitSlots: north, south, east, west (4 exits for connecting buildings/paths)

Use the same tile indices from `tileAtlas.json`. Keep templates simple — 3 templates is enough for the demo world.

- [ ] **Step 3: Create template registry**

Create `src/data/roomTemplates/index.js`:

```js
import tavernBar from './tavern_bar.json'
import tavernKitchen from './tavern_kitchen.json'
import townSquare from './town_square.json'

const templates = {
  tavern_bar: tavernBar,
  tavern_kitchen: tavernKitchen,
  town_square: townSquare,
}

/**
 * Look up a room template by zone type.
 * @param {string} type - Zone type (e.g., 'tavern_bar')
 * @returns {object|null} Template data or null if not found
 */
export function getTemplate(type) {
  return templates[type] || null
}

/**
 * Get all available template types.
 */
export function getTemplateTypes() {
  return Object.keys(templates)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/data/roomTemplates/
git commit -m "feat: add room templates (tavern bar, kitchen, town square) with registry"
```

---

## Task 2: Demo World (3 Connected Zones)

**Files:**
- Create: `src/data/demoWorld.json`

- [ ] **Step 1: Create demo world with 3 zones**

Create `src/data/demoWorld.json` — a small explorable world for testing zone transitions:

```json
{
  "title": "The Village of Millhaven",
  "startZone": "town-square",
  "questObjectives": [
    { "id": "q1", "name": "Investigate the forest disappearances", "status": "active" }
  ],
  "zones": {
    "town-square": {
      "id": "town-square",
      "name": "Millhaven Town Square",
      "type": "town_square",
      "tags": ["safe", "outdoor"],
      "npcs": [
        { "name": "Elder Maren", "role": "quest_giver", "personality": "worried elder, begs adventurers for help", "position": { "x": 8, "y": 7 }, "questRelevant": true },
        { "name": "Guard Theron", "role": "guard", "personality": "stern but fair, warns about forest dangers", "position": { "x": 3, "y": 4 }, "questRelevant": false }
      ],
      "exits": [
        { "position": { "x": 7, "y": 0 }, "width": 2, "direction": "north", "targetZone": "inn-bar", "entryPoint": { "x": 5, "y": 8 }, "label": "The Weary Traveler" }
      ],
      "lighting": "daylight",
      "ambience": "town"
    },
    "inn-bar": {
      "id": "inn-bar",
      "name": "The Weary Traveler Inn",
      "type": "tavern_bar",
      "tags": ["safe", "indoor"],
      "npcs": [
        { "name": "Greta", "role": "bartender", "personality": "gruff but kind, knows about forest disappearances", "position": { "x": 6, "y": 2 }, "questRelevant": true },
        { "name": "Old Durnan", "role": "patron", "personality": "drunk old soldier, mumbles about the old war", "position": { "x": 9, "y": 5 }, "questRelevant": false }
      ],
      "exits": [
        { "position": { "x": 5, "y": 9 }, "width": 2, "direction": "south", "targetZone": "town-square", "entryPoint": { "x": 7, "y": 1 }, "label": "Town Square" },
        { "position": { "x": 10, "y": 0 }, "width": 2, "direction": "north", "targetZone": "inn-kitchen", "entryPoint": { "x": 4, "y": 6 }, "label": "Kitchen" }
      ],
      "lighting": "warm",
      "ambience": "tavern"
    },
    "inn-kitchen": {
      "id": "inn-kitchen",
      "name": "Tavern Kitchen",
      "type": "tavern_kitchen",
      "tags": ["safe", "indoor"],
      "npcs": [
        { "name": "Berta", "role": "cook", "personality": "loud, bossy, gossips about everyone in town", "position": { "x": 5, "y": 2 }, "questRelevant": false }
      ],
      "exits": [
        { "position": { "x": 4, "y": 7 }, "width": 2, "direction": "south", "targetZone": "inn-bar", "entryPoint": { "x": 10, "y": 1 }, "label": "Bar Room" }
      ],
      "lighting": "warm",
      "ambience": "tavern"
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/demoWorld.json
git commit -m "feat: add demo world (Millhaven) with 3 connected zones"
```

---

## Task 3: Zustand Store — Zone Graph Slice

**Files:**
- Modify: `src/store/useStore.js`
- Create: `tests/store/zoneStore.test.js`

- [ ] **Step 1: Write tests for zone store actions**

Create `tests/store/zoneStore.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../../src/store/useStore'

describe('zone store', () => {
  beforeEach(() => {
    useStore.setState({
      currentZoneId: null,
      visitedZones: new Set(),
      zoneTokenPositions: {},
    })
  })

  it('setCurrentZone updates currentZoneId and adds to visited', () => {
    const { setCurrentZone } = useStore.getState()
    setCurrentZone('inn-bar')
    const state = useStore.getState()
    expect(state.currentZoneId).toBe('inn-bar')
    expect(state.visitedZones.has('inn-bar')).toBe(true)
  })

  it('setZoneTokenPosition stores position by zone and member', () => {
    const { setZoneTokenPosition } = useStore.getState()
    setZoneTokenPosition('inn-bar', 'player-1', { x: 5, y: 7 })
    const state = useStore.getState()
    expect(state.zoneTokenPositions['inn-bar']['player-1']).toEqual({ x: 5, y: 7 })
  })

  it('getZoneTokenPosition returns null for unknown zone', () => {
    const state = useStore.getState()
    expect(state.zoneTokenPositions['unknown']?.['player-1']).toBeUndefined()
  })

  it('loadZoneWorld sets zones and startZone', () => {
    const { loadZoneWorld } = useStore.getState()
    const world = {
      title: 'Test',
      startZone: 'town',
      zones: { town: { id: 'town', name: 'Town' } },
    }
    loadZoneWorld(world)
    const state = useStore.getState()
    expect(state.currentZoneId).toBe('town')
    expect(state.campaign.zones).toEqual(world.zones)
    expect(state.visitedZones.has('town')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/store/zoneStore.test.js`
Expected: FAIL — functions don't exist

- [ ] **Step 3: Add zone slice to Zustand store**

Add to `src/store/useStore.js` — find the end of the existing state (before the final `})`), and add a new zone slice. Read the file first to find the right insertion point.

Add these new state fields and actions:

```js
// ── Zone Graph (V2) ──────────────────────────────────────────────────
currentZoneId: null,
visitedZones: new Set(),
zoneTokenPositions: {},

setCurrentZone: (zoneId) => set(state => ({
  currentZoneId: zoneId,
  visitedZones: new Set([...state.visitedZones, zoneId]),
})),

setZoneTokenPosition: (zoneId, memberId, pos) => set(state => ({
  zoneTokenPositions: {
    ...state.zoneTokenPositions,
    [zoneId]: {
      ...(state.zoneTokenPositions[zoneId] || {}),
      [memberId]: pos,
    },
  },
})),

loadZoneWorld: (world) => set(state => ({
  currentZoneId: world.startZone,
  visitedZones: new Set([world.startZone]),
  campaign: {
    ...state.campaign,
    title: world.title || state.campaign.title,
    zones: world.zones,
    questObjectives: world.questObjectives || [],
  },
})),

getCurrentZone: () => {
  const state = get()
  if (!state.currentZoneId || !state.campaign.zones) return null
  return state.campaign.zones[state.currentZoneId] || null
},
```

Also add `zones: null` and `questObjectives: []` to the campaign initial state (around line 197).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/store/zoneStore.test.js`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.js tests/store/zoneStore.test.js
git commit -m "feat: add zone graph slice to Zustand store"
```

---

## Task 4: Zone Transition Broadcast

**Files:**
- Modify: `src/lib/liveChannel.js`

- [ ] **Step 1: Add zone-transition broadcast function**

Read `src/lib/liveChannel.js`. Add a new broadcast function after the existing ones:

```js
export function broadcastZoneTransition(targetZone, entryPoint) {
  if (!channel) return
  channel.send({
    type: 'broadcast',
    event: 'zone-transition',
    payload: { targetZone, entryPoint },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/liveChannel.js
git commit -m "feat: add zone-transition broadcast for multiplayer sync"
```

---

## Task 5: Zone Transition Animation

**Files:**
- Create: `src/engine/ZoneTransition.js`

- [ ] **Step 1: Create fade transition overlay**

Create `src/engine/ZoneTransition.js` — a PixiJS overlay that fades to black and back for zone transitions:

```js
import * as PIXI from 'pixi.js'

/**
 * Creates a fade overlay on the PixiJS stage for zone transitions.
 * @param {PIXI.Application} app - The PixiJS application
 * @param {Function} onMidpoint - Called at the midpoint (when screen is fully black) — load new zone here
 * @param {Function} onComplete - Called when fade-in finishes
 * @param {number} duration - Total transition time in ms (default 600)
 */
export function playZoneTransition(app, onMidpoint, onComplete, duration = 600) {
  const overlay = new PIXI.Graphics()
  overlay.rect(0, 0, app.screen.width, app.screen.height)
  overlay.fill({ color: 0x000000 })
  overlay.alpha = 0
  overlay.zIndex = 9999
  app.stage.addChild(overlay)

  const half = duration / 2
  const startTime = performance.now()
  let midpointFired = false

  function tick() {
    const elapsed = performance.now() - startTime
    if (elapsed < half) {
      // Fade out (0 → 1)
      overlay.alpha = elapsed / half
    } else if (!midpointFired) {
      // Midpoint — screen is black, swap zone
      overlay.alpha = 1
      midpointFired = true
      onMidpoint?.()
    } else if (elapsed < duration) {
      // Fade in (1 → 0)
      overlay.alpha = 1 - (elapsed - half) / half
    } else {
      // Done
      overlay.alpha = 0
      app.stage.removeChild(overlay)
      overlay.destroy()
      onComplete?.()
      return
    }
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/ZoneTransition.js
git commit -m "feat: add fade-to-black zone transition animation"
```

---

## Task 6: Exit Zone Click Handler

**Files:**
- Modify: `src/engine/ExitZone.js`

- [ ] **Step 1: Add click handler to exit zones**

Read `src/engine/ExitZone.js`. The current code renders exits with hover effects but no click handler. Add:

1. Accept an `onExitClick` callback parameter in `renderExits`:

```js
export function renderExits(container, exits, onExitClick) {
```

2. Add a click handler to each exit group (after the hover handlers):

```js
group.on('pointerdown', () => {
  onExitClick?.({
    targetZone: exit.targetZone,
    entryPoint: exit.entryPoint || { x: 0, y: 0 },
    label: exit.label,
  })
})
```

- [ ] **Step 2: Wire onExitClick through PixiApp**

Read `src/engine/PixiApp.jsx`. Add an `onExitClick` prop and pass it through to `renderExits`:

1. Add prop: `export default function PixiApp({ zone, tokens, onTileClick, onExitClick })`
2. Add ref: `const onExitClickRef = useRef(onExitClick)` and `onExitClickRef.current = onExitClick`
3. In the zone useEffect where `renderExits` is called, pass the callback:

```js
renderExits(stageLayersRef.current.exits, zone.exits, (exitData) => {
  onExitClickRef.current?.(exitData)
})
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/ExitZone.js src/engine/PixiApp.jsx
git commit -m "feat: add click handler to exit zones for zone transitions"
```

---

## Task 7: Template Merging Logic

**Files:**
- Create: `src/lib/campaignGenerator.js`
- Create: `tests/lib/campaignGenerator.test.js`

- [ ] **Step 1: Write tests for template merging**

Create `tests/lib/campaignGenerator.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mergeZoneWithTemplate } from '../../src/lib/campaignGenerator.js'

describe('mergeZoneWithTemplate', () => {
  it('adds template layers to zone', () => {
    const zone = {
      id: 'test', name: 'Test', type: 'tavern_bar',
      npcs: [{ name: 'Bob', role: 'bartender', position: { x: 6, y: 2 } }],
      exits: [{ position: { x: 5, y: 9 }, width: 2, direction: 'south', targetZone: 'outside', label: 'Outside' }],
    }
    const template = {
      type: 'tavern_bar', width: 12, height: 10,
      layers: { floor: [[1]], walls: [[18]], props: [[-1]] },
      spawnPoints: { bartender: { x: 6, y: 2 } },
      exitSlots: { south: { x: 5, y: 9, width: 2 } },
    }
    const merged = mergeZoneWithTemplate(zone, template)
    expect(merged.width).toBe(12)
    expect(merged.height).toBe(10)
    expect(merged.layers).toEqual(template.layers)
    expect(merged.npcs).toEqual(zone.npcs)
    expect(merged.exits[0].position).toEqual({ x: 5, y: 9 })
  })

  it('uses spawnPoints for NPC positions when not specified', () => {
    const zone = {
      id: 'test', name: 'Test', type: 'tavern_bar',
      npcs: [{ name: 'Bob', role: 'bartender' }],
      exits: [],
    }
    const template = {
      type: 'tavern_bar', width: 12, height: 10,
      layers: { floor: [[1]], walls: [[-1]], props: [[-1]] },
      spawnPoints: { bartender: { x: 6, y: 2 } },
      exitSlots: {},
    }
    const merged = mergeZoneWithTemplate(zone, template)
    expect(merged.npcs[0].position).toEqual({ x: 6, y: 2 })
  })

  it('uses exitSlots for exit positions when not specified', () => {
    const zone = {
      id: 'test', name: 'Test', type: 'tavern_bar',
      npcs: [],
      exits: [{ direction: 'south', targetZone: 'outside', label: 'Outside' }],
    }
    const template = {
      type: 'tavern_bar', width: 12, height: 10,
      layers: { floor: [[1]], walls: [[-1]], props: [[-1]] },
      spawnPoints: {},
      exitSlots: { south: { x: 5, y: 9, width: 2 } },
    }
    const merged = mergeZoneWithTemplate(zone, template)
    expect(merged.exits[0].position).toEqual({ x: 5, y: 9 })
    expect(merged.exits[0].width).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/campaignGenerator.test.js`

- [ ] **Step 3: Implement template merging**

Create `src/lib/campaignGenerator.js`:

```js
import { getTemplate } from '../data/roomTemplates/index.js'

/**
 * Merge a zone (from AI generation) with a room template.
 * Template provides: layers, width, height, spawnPoints, exitSlots.
 * Zone provides: npcs, exits, name, lighting, ambience.
 * @param {object} zone - AI-generated zone data (no layers)
 * @param {object} template - Room template (has layers)
 * @returns {object} Complete zone with layers + npcs + exits
 */
export function mergeZoneWithTemplate(zone, template) {
  const merged = {
    ...zone,
    width: template.width,
    height: template.height,
    layers: template.layers,
  }

  // Fill NPC positions from spawnPoints if not already set
  if (merged.npcs && template.spawnPoints) {
    merged.npcs = merged.npcs.map(npc => {
      if (npc.position) return npc
      // Match by role to spawn point name
      const spawnKey = Object.keys(template.spawnPoints).find(k =>
        k === npc.role || k.startsWith(npc.role)
      )
      if (spawnKey) {
        return { ...npc, position: template.spawnPoints[spawnKey] }
      }
      // Fallback: center of room
      return { ...npc, position: { x: Math.floor(template.width / 2), y: Math.floor(template.height / 2) } }
    })
  }

  // Fill exit positions from exitSlots if not already set
  if (merged.exits && template.exitSlots) {
    merged.exits = merged.exits.map(exit => {
      if (exit.position) return exit
      const slot = template.exitSlots[exit.direction]
      if (slot) {
        return { ...exit, position: { x: slot.x, y: slot.y }, width: slot.width || 1 }
      }
      return exit
    })
  }

  return merged
}

/**
 * Build a complete zone world from AI-generated zone graph + templates.
 * @param {object} aiWorld - { title, startZone, questObjectives, zones: [...] }
 * @returns {object} World with zones as a map, each zone fully merged with template
 */
export function buildWorldFromAiOutput(aiWorld) {
  const zonesMap = {}

  // AI output zones can be array or object
  const zoneList = Array.isArray(aiWorld.zones) ? aiWorld.zones : Object.values(aiWorld.zones)

  for (const zone of zoneList) {
    const template = getTemplate(zone.type)
    if (template) {
      zonesMap[zone.id] = mergeZoneWithTemplate(zone, template)
    } else {
      // No template found — zone will render empty (fallback)
      console.warn(`No template for zone type: ${zone.type}`)
      zonesMap[zone.id] = { ...zone, width: 10, height: 8, layers: { floor: [], walls: [], props: [] } }
    }
  }

  return {
    title: aiWorld.title,
    startZone: aiWorld.startZone,
    questObjectives: aiWorld.questObjectives || [],
    zones: zonesMap,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/campaignGenerator.test.js`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/campaignGenerator.js tests/lib/campaignGenerator.test.js
git commit -m "feat: add template merging for zone world generation"
```

---

## Task 8: Wire GameV2 to Zone Store + Transitions

**Files:**
- Modify: `src/GameV2.jsx` (major rewrite of zone loading and transition logic)

- [ ] **Step 1: Rewrite GameV2 to use zone store**

Read `src/GameV2.jsx`. Replace the hardcoded `demoZone` import with live zone data from the store. Key changes:

1. Remove `import demoZone` — load from store instead
2. Import zone store actions and demo world:

```js
import demoWorld from './data/demoWorld.json'
import { buildWorldFromAiOutput } from './lib/campaignGenerator'
import { broadcastZoneTransition } from './lib/liveChannel'
```

3. On mount, load the demo world into the store if no zones exist:

```js
const currentZoneId = useStore(s => s.currentZoneId)
const zones = useStore(s => s.campaign.zones)
const loadZoneWorld = useStore(s => s.loadZoneWorld)
const setCurrentZone = useStore(s => s.setCurrentZone)

useEffect(() => {
  if (!zones) {
    const world = buildWorldFromAiOutput(demoWorld)
    loadZoneWorld(world)
  }
}, [])

const zone = zones?.[currentZoneId] || null
```

4. Add zone transition handler:

```js
const [transitioning, setTransitioning] = useState(false)

const handleExitClick = useCallback(({ targetZone, entryPoint }) => {
  if (transitioning || !zones?.[targetZone]) return
  setTransitioning(true)
  broadcastZoneTransition(targetZone, entryPoint)
  // Transition happens after fade animation — see PixiApp
  setCurrentZone(targetZone)
  setPlayerPos(entryPoint || { x: 5, y: 5 })
  setTimeout(() => setTransitioning(false), 700)
}, [transitioning, zones, setCurrentZone])
```

5. Pass `onExitClick` to PixiApp:

```jsx
<PixiApp zone={zone} tokens={tokens} onTileClick={handleTileClick} onExitClick={handleExitClick} />
```

6. Update walkGrid and tokens to use current `zone` from store (already dynamic via the `zone` variable).

- [ ] **Step 2: Test in browser**

Navigate to `http://localhost:5173/?v2`
Expected: Loads Millhaven Town Square (the startZone). Click the exit to "The Weary Traveler" → transitions to the inn bar. Click exit to "Town Square" → goes back. Click exit to "Kitchen" → enters kitchen.

- [ ] **Step 3: Commit**

```bash
git add src/GameV2.jsx
git commit -m "feat: wire GameV2 to zone store with live zone transitions"
```

---

## Task 9: Receive Zone Transitions (Multiplayer)

**Files:**
- Modify: `src/App.jsx` (add zone-transition listener to the Realtime channel)

- [ ] **Step 1: Add zone-transition handler to App.jsx Realtime listener**

Read `src/App.jsx`. Find where the Supabase Realtime channel handles broadcast events (search for `channel.on('broadcast'`). Add a handler for the `zone-transition` event:

```js
if (event === 'zone-transition') {
  const { targetZone, entryPoint } = payload
  const { setCurrentZone } = useStore.getState()
  setCurrentZone(targetZone)
  // Token positions will be set by the broadcaster
}
```

This ensures all clients in the campaign transition together when any player walks through a door.

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: handle zone-transition broadcast for multiplayer sync"
```

---

## Task 10: Update Narrator API for Zone Data

**Files:**
- Modify: `src/lib/narratorApi.js`

- [ ] **Step 1: Update buildSystemPrompt to support zone data**

Read `src/lib/narratorApi.js`. The current `buildSystemPrompt` uses `currentScene.title`, `currentScene.text`, `currentScene.npcs`, `currentScene.enemies`. Update it to also accept zone data:

Add a zone-aware branch at the top of the function. If the passed scene has zone-style fields (no `.text` but has `.type`, `.tags`, `.exits`), format the prompt differently:

```js
// Zone-based prompt (V2)
if (currentScene && currentScene.type && !currentScene.text) {
  const zoneContext = `Current location: ${currentScene.name} (${currentScene.type}).`
  const npcList = (currentScene.npcs || []).map(n =>
    `- ${n.name} (${n.role}): ${n.personality}`
  ).join('\n')
  const exitList = (currentScene.exits || []).map(e =>
    `- Exit ${e.direction}: leads to ${e.label}`
  ).join('\n')

  sceneBlock = `${zoneContext}\n\nNPCs present:\n${npcList}\n\nExits:\n${exitList}`
}
```

This is additive — the existing scene-based prompt path stays untouched for V1.

- [ ] **Step 2: Commit**

```bash
git add src/lib/narratorApi.js
git commit -m "feat: update DM prompt builder to support zone-based world data"
```

---

## Phase 2 Complete Checkpoint

At this point you should have:
- 3 room templates (tavern bar, kitchen, town square) with a registry
- Demo world with 3 connected zones (Millhaven)
- Zustand store zone slice (currentZoneId, zones, visitedZones, transitions)
- Zone transition broadcast for multiplayer sync
- Fade-to-black transition animation
- Exit click → zone transition with entry point placement
- Template merging (AI output + template → complete zone data)
- GameV2 loads from zone store, transitions work
- Narrator API supports zone context
- 7+ new tests (zone store + template merging)

**Next:** Phase 3 plan (combat UX overhaul) builds on this foundation.
