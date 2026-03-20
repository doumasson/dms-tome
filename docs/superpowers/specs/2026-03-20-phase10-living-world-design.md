# Phase 10: Living World — Design Spec

> 9 features: Shop/Merchant, Minimap, Status Effect Visuals, Ambient Sound, NPC Schedules, Traps, Weather, Party Formation, Quest Tracker.

---

## 1. Shop/Merchant System

**Approach:** Hybrid — template stock + AI special items.

### Behavior
1. Shop NPCs have a `shopType` tag: `weapon_shop`, `armor_shop`, `potion_shop`, `general_store`, `magic_shop`.
2. When player interacts with a shop NPC (E-key or click), a **Shop UI** opens instead of the normal NPC dialog.
3. Shop stock loaded from `src/data/shopInventories.json` based on `shopType`. Each template has 8-15 base items with prices.
4. On first visit, AI DM generates 1-2 "special items" unique to this shop (magic items, campaign-relevant gear). Cached on the NPC so repeat visits show same specials.
5. **Buy:** Click item → confirm purchase → gold deducted, item added to inventory. Blocked if insufficient gold or over carry capacity.
6. **Sell:** Drag item from inventory to shop panel → sell at 50% base price → gold added, item removed.
7. **UI:** Split panel — left side is shop inventory (scrollable grid with prices), right side is player inventory. Gold displayed prominently at top.

### Data
```json
// src/data/shopInventories.json
{
  "weapon_shop": {
    "name": "Weapons & Arms",
    "stock": [
      { "itemId": "longsword", "price": 15, "quantity": 3 },
      { "itemId": "shortbow", "price": 25, "quantity": 2 }
    ]
  }
}
```

### NPC Schema Addition
```json
{
  "name": "Blacksmith Gundren",
  "personality": "gruff but fair",
  "shopType": "weapon_shop",
  "specialItems": []  // AI-populated on first visit
}
```

### Multiplayer
- Shop state is per-player (each player browses independently).
- Gold changes broadcast via `updateMyCharacter()` → Supabase.
- Stock is unlimited (no shared inventory depletion — keeps it simple).

### Files
- Create: `src/data/shopInventories.json`
- Create: `src/components/ShopPanel.jsx` (~250 lines — shop UI with buy/sell)
- Create: `src/lib/shopSystem.js` (~60 lines — price calc, buy/sell logic, AI special item generation)
- Modify: `src/GameV2.jsx` or interaction controller (detect shopType NPC, open ShopPanel instead of dialog)
- Modify: `src/lib/campaignGenerator.js` or `CreateCampaign.jsx` (prompt: generate shop NPCs)

---

## 2. Minimap

**Approach:** Corner overlay showing area layout from tile data.

### Behavior
1. Small minimap in **top-right corner** of the game canvas (below CampaignBar).
2. Renders a simplified version of the floor layer — each tile is 2-3 pixels.
3. **Player token** shown as bright gold dot. **NPC tokens** as blue dots. **Enemy tokens** as red dots (only if visible/in combat).
4. **Fog of war respected** — unexplored areas are black on minimap.
5. **Click minimap** to pan camera to that location.
6. **Toggle visibility** — small eye icon to show/hide. Hidden by default on phone (<768px).
7. Rendered as an HTML5 Canvas element (not PixiJS — lightweight, separate from main canvas).

### Size
- 160x120px on desktop, 100x75px on tablet, hidden on phone.
- Border: 1px solid #d4af37 with slight opacity background.

### Files
- Create: `src/hud/Minimap.jsx` (~120 lines — canvas render, token dots, fog mask, click-to-pan)
- Modify: `src/hud/GameHUD.jsx` (add Minimap to layout)

---

## 3. Status Effect Visuals

**Approach:** PixiJS particle/tint effects on tokens with active conditions.

### Effects
| Condition | Visual |
|-----------|--------|
| Poisoned | Green tint + small green particles rising |
| Burning/On Fire | Orange-red glow + flame particles |
| Frozen/Restrained | Blue tint + ice crystal overlay |
| Stunned | Yellow stars circling above token |
| Paralyzed | Grey desaturation + static crackle |
| Blessed/Haste | Gold shimmer aura |
| Invisible | Token becomes semi-transparent (alpha 0.3) |
| Prone | Token shrinks slightly + horizontal tilt |
| Concentration | Faint blue ring around token |

### Implementation
- New PixiJS container layer between tokens and fog: `statusEffects`.
- For each combatant with conditions, render appropriate particle emitter or tint.
- Particle system: simple — spawn N small sprites per frame, fade out over 0.5-1s, apply velocity.
- Tint: apply directly to token sprite via `sprite.tint`.
- Update each frame in the PixiApp ticker.

### Files
- Create: `src/engine/StatusEffectRenderer.js` (~150 lines — condition-to-visual mapping, particle spawning, tint application)
- Modify: `src/engine/PixiApp.jsx` (add statusEffects layer, wire renderer to ticker)

---

## 4. Ambient Sound

**Approach:** Wire existing procedural audio into V2.

### Current State
`src/lib/ambientAudio.js` exists with a Web Audio API procedural system. It may not be connected to V2.

### Behavior
1. **Area-based ambience:** Theme determines ambient sound (village = birds/chatter, dungeon = dripping/echoes, forest = wind/rustling, cave = deep rumble/drips).
2. **Time-of-day variation:** Night reduces bird sounds, adds cricket/owl. Dawn has bird chorus.
3. **Combat music shift:** When combat starts, ambient crossfades to tense percussion loop. On combat end, crossfade back.
4. **Volume control:** Small speaker icon in HUD, click to mute/unmute. Volume slider in settings.
5. **Indoor/outdoor:** Entering a building (roof-lift) muffles outdoor ambience, adds indoor reverb.

### Files
- Modify: `src/lib/ambientAudio.js` (add theme-based sound selection, time-of-day variation, combat crossfade)
- Create: `src/hud/SoundControl.jsx` (~40 lines — mute toggle + volume)
- Modify: `src/GameV2.jsx` or hooks (wire ambient audio to area theme, combat state, time of day)
- Modify: `src/hud/GameHUD.jsx` (add SoundControl)

---

## 5. NPC Schedules

**Approach:** Animated movement — NPCs walk between locations using pathfinding.

### Behavior
1. NPCs have a `schedule` array defining where they should be at each time of day:
```json
{
  "name": "Barkeep Hilda",
  "schedule": [
    { "time": "dawn", "position": "kitchen", "activity": "preparing breakfast" },
    { "time": "day", "position": "bar_counter", "activity": "serving drinks" },
    { "time": "dusk", "position": "bar_counter", "activity": "closing up" },
    { "time": "night", "position": "upstairs_room", "activity": "sleeping" }
  ]
}
```

2. When `timeOfDay` changes, each NPC's target position updates.
3. NPC walks to new position using `findPathEdge()` — same pathfinding as player movement.
4. Movement animated using `animateTokenAlongPath()` — same animation system as player tokens.
5. If NPC is in a different area (e.g., upstairs), they teleport (area transition not animated).
6. NPCs avoid player tokens during movement (blocked tiles).
7. **Interaction hint updates** — approaching a scheduled NPC shows their current activity in the chat bubble.

### Schedule Resolution
- `position` field maps to POI labels in the area brief (e.g., "bar_counter" → resolved coordinates).
- If POI not found, NPC stays at current position.
- Campaign generator prompted to include schedules for key NPCs.

### Files
- Create: `src/lib/npcScheduler.js` (~80 lines — resolve schedule, compute target position, trigger movement)
- Modify: `src/GameV2.jsx` or hooks (useEffect watching timeOfDay, trigger NPC movements)
- Modify: campaign generator prompt (include NPC schedules)

---

## 6. Trap System

**Approach:** Dungeon traps on specific tiles with detection and trigger mechanics.

### Trap Types
| Trap | Trigger | Effect | Detection DC |
|------|---------|--------|-------------|
| Pressure Plate | Step on tile | Dart (1d6 piercing) or pit (2d6 falling) | 12 |
| Tripwire | Cross tile boundary | Alarm (alerts enemies) or net (Restrained) | 14 |
| Poison Needle | Open container/door | 1d4 poison + Poisoned condition | 16 |
| Magic Glyph | Step on tile | Spell effect (Fireball, Thunderwave) | 18 |
| Collapsing Floor | Step on tile | Fall to lower level (area transition) | 15 |

### Detection
- **Passive Perception:** If character's passive perception >= trap DC, trap is revealed on approach (highlighted tile, tooltip).
- **Active Search:** Player can use Investigation check near trap tile to detect it.
- **Revealed traps** shown as orange-outlined tiles on the map.
- **Triggered traps** play a brief animation, apply damage/condition, log to session.

### Data Model
```json
// In area brief:
{
  "traps": [
    { "type": "pressure_plate", "position": { "x": 5, "y": 8 }, "dc": 14,
      "effect": { "damage": "2d6", "damageType": "piercing", "save": "DEX", "saveDC": 13 } }
  ]
}
```

### Files
- Create: `src/lib/trapSystem.js` (~100 lines — trap detection, trigger resolution, passive perception check)
- Create: `src/data/trapTemplates.json` (~40 lines — trap type definitions)
- Modify: `src/lib/areaBuilder.js` (place traps from brief)
- Modify: `src/lib/dungeonBuilder.js` (auto-place traps in dungeon corridors)
- Modify: `src/GameV2.jsx` or movement hook (check for traps on each movement step)
- Modify: `src/engine/PixiApp.jsx` (render revealed trap tiles)

---

## 7. Weather System

**Approach:** Visual + light mechanical — weather affects vision range, no combat modifiers.

### Weather Types
| Weather | Visual | Mechanical |
|---------|--------|-----------|
| Clear | None | Normal vision |
| Rain | Blue-grey particle overlay, droplet particles falling | Vision -2 tiles |
| Heavy Rain | Dense particles, darker tint, puddle shimmer | Vision -4 tiles |
| Snow | White particles drifting down, slight white tint | Vision -2 tiles |
| Fog | White semi-transparent overlay, reduced contrast | Vision -6 tiles |
| Storm | Dark tint, lightning flashes (brief white flash), rain particles | Vision -4 tiles |

### Weather State
```js
{
  weather: {
    current: 'clear',  // clear | rain | heavy_rain | snow | fog | storm
    duration: 3,       // hours until weather changes
  }
}
```

### Weather Changes
- **On time advance:** Roll for weather change. 70% chance stays same, 30% shifts to adjacent weather.
- **AI DM override:** Claude can set weather for dramatic effect.
- **Theme-based:** Dungeons/caves/indoor = always clear (no weather effects inside).

### Vision Range Modification
- Current vision range (from visionCalculator.js) reduced by weather penalty.
- Fog of war updates immediately when weather changes.

### Files
- Create: `src/lib/weather.js` (~60 lines — weather state, roll for change, vision penalty)
- Create: `src/engine/WeatherRenderer.js` (~120 lines — particle overlay per weather type, tint)
- Modify: `src/store/gameTimeSlice.js` (add weather state, advanceWeather on time change)
- Modify: `src/lib/visionCalculator.js` (apply weather vision penalty)
- Modify: `src/engine/PixiApp.jsx` (add weather particle layer)

---

## 8. Party Formation

**Approach:** Configure marching order for corridor exploration.

### Behavior
1. **Formation panel** — accessible via a new HUD button or party portrait context menu.
2. **Marching order:** Drag party member portraits into a 2-wide column (front/back). Front row leads, back row follows.
3. **Front row** triggers traps first, makes first contact with enemies, gets targeted by frontal ambushes.
4. **Back row** is protected from frontal attacks, but targeted by rear ambushes.
5. **Effect on exploration:** When party moves through corridors, formation determines who steps on trap tiles first.
6. **Effect on combat start:** Initiative positions based on formation — front row placed closer to enemies.

### Data
```js
{
  formation: {
    front: ['char-id-1', 'char-id-2'],
    back: ['char-id-3', 'char-id-4'],
  }
}
```

### Files
- Create: `src/components/FormationPanel.jsx` (~100 lines — drag-and-drop 2-column layout)
- Modify: `src/store/campaignSlice.js` (formation state)
- Modify: `src/lib/trapSystem.js` (formation determines who triggers traps)
- Modify: encounter start logic (formation influences initial placement)

---

## 9. Quest Tracker (Journal Integration)

**Approach:** Hybrid — campaign seeds quests, AI DM adds/updates dynamically. Tracked in existing Journal.

### Behavior
1. **Quest structure:**
```json
{
  "id": "quest-missing-merchant",
  "title": "The Missing Merchant",
  "description": "Find the merchant who disappeared near the goblin caves.",
  "objectives": [
    { "id": "obj-1", "text": "Investigate the merchant's last known location", "completed": false },
    { "id": "obj-2", "text": "Clear the goblin caves", "completed": false },
    { "id": "obj-3", "text": "Return to the village elder", "completed": false }
  ],
  "status": "active",  // active | completed | failed
  "reward": { "gold": 50, "xp": 200, "items": ["healing-potion"] },
  "source": "Elder Maren"
}
```

2. **Journal integration:** The existing Journal modal gets a new **Quests tab** alongside the existing entries. Shows active quests with checkable objectives.
3. **AI DM updates quests:** When the DM narrates a quest-relevant event, it can emit a `quest-update` action that marks objectives complete or adds new quests.
4. **Campaign generator** seeds 2-3 starting quests in the campaign data.
5. **Completion:** When all objectives done, AI DM narrates reward. Gold/XP/items distributed via loot system.
6. **HUD indicator:** Small quest marker icon near zone label showing active quest count.

### Files
- Create: `src/lib/questSystem.js` (~80 lines — quest state management, objective updates)
- Modify: `src/components/JournalModal.jsx` (add Quests tab with objective checklist)
- Modify: `src/store/campaignSlice.js` (quest state, addQuest, updateQuest, completeQuest)
- Modify: `src/lib/narratorApi.js` (include active quests in DM system prompt)
- Modify: campaign generator prompt (seed starting quests)
- Modify: `src/hud/GameHUD.jsx` (quest count indicator)

---

## Non-Goals
- Crafting system (deferred)
- Pitched roofs (blocked on assets)
- Shop inventory depletion (shared stock too complex for now)
- Weather combat modifiers (just vision for now)
- NPC pathfinding avoidance of each other (only avoid players)
