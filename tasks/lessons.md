# Lessons Learned

## Do NOT Rubber-Stamp — Test Your Own Work
**Pattern:** Agent checks off todo items by reading code and deciding "it looks fine" without actually verifying functionality. Then the game ships broken.
**Rule:** After making a change, check if the Playwright screenshots show the feature working. If you can't verify visually, trace the code path to confirm it actually executes. Never check off an item without writing code.

## Random Encounters Must Be Rare, Not Per-Tile
**Pattern:** Random encounter check fires on every single tile movement, spamming 10+ encounters in seconds.
**Rule:** Random encounters should fire at MOST once per area transition or on a very low % chance per significant movement (5-10%). The AI narrator should decide when to trigger combat, not a per-tile RNG.

## Layout Must Match Architecture: 80% Map / 20% Narrator
**Pattern:** The narrator panel and overlay elements expand to fill 50%+ of the screen, making the map tiny.
**Rule:** Per ARCHITECTURE.md: Top 80% = game map (dominant), Bottom 20% = narrator bar (collapsed default, 40% max expanded). Always check the visual layout after changes.

## NEVER Write Tests — Build Game Code Instead
**Pattern:** Agent spends entire iterations writing Playwright or Vitest test files instead of building game features, assets, or fixes. 50 iterations produced 1,111 tests but left real gameplay polish and missing features untouched.

**Rule:** NEVER create `.test.js` or `.spec.js` files. NEVER run `npx playwright` or `npx vitest`. The test suite is complete. Every iteration must produce game code in `src/`, assets in `public/`, or fixes to existing code. If you're about to write a test, STOP and ask: "What feature or fix should I build instead?" Then build that.

**Detection:** If your commit message contains the word "test" and doesn't also contain "fix" or "feature", you've violated this rule.

## Combat Token Rendering Must Use Encounter State (Not Area Data)
**Pattern:** `useMemo` for token list reads from `zone.enemies` (static area data) instead of `encounter.combatants` (live combat state). Tokens never visually update during combat.

**Rule:** During combat (`inCombat === true`), ALL token positions and HP must come from `encounter.combatants`. Area enemy data is only for exploration mode. The `encounter` object must be in the `useMemo` dependency array.

**Corollary:** When adding a new data source (encounter system), audit all consumers of the old data source (area enemies) to ensure they switch during the appropriate mode.

## startEncounter Must Extract Nested Enemy Stats
**Pattern:** Area builder puts enemy HP/AC/speed inside `stats: { hp, ac, speed }` but `startEncounter` reads top-level `group.hp`, `group.ac`. Enemies silently get wrong defaults (10 HP, 10 AC).

**Rule:** Always check both `group.field` and `group.stats.field` when mapping enemy data into combatants. The area builder and campaign generator use different schemas.

## Enemy AI Must Run On Host Only
**Pattern:** Removing `isDM` gate from enemy turn execution causes all clients to independently run AI, broadcast conflicting moves/damage, and double-advance turns.

**Rule:** `runEnemyTurn` must only execute on the DM/host client. Other clients receive results via broadcast. Re-adding the gate was the correct fix.

## Production TDZ Bug (Rollup/Vite)
**Pattern:** `const`/`let` declared in a component body AFTER a `useEffect` (or other hook) that references it in the **dependency array**.

**Why it breaks in production:** Dependency arrays are evaluated synchronously during render. Rollup's minifier does not always hoist the declaration above the hook call, so the variable has not been initialized when the dep array evaluates → "Cannot access 'X' before initialization".

**Rule:** Always declare derived values (`const inCombat`, `const isMyTurn`, etc.) **before** any hooks that reference them in dependency arrays.

**Example (bad):**
```js
useEffect(() => { ... }, [inCombat]); // dep array reads inCombat — TDZ!
const inCombat = encounter.phase !== 'idle'; // declared too late
```

**Example (good):**
```js
const inCombat = encounter.phase !== 'idle'; // declare first
useEffect(() => { ... }, [inCombat]); // safe
```

**Detection:** Run `npm run build` and search the bundle for the minified variable name used in dep arrays before its `let`/`const` declaration. Or just keep declarations at the top of the component before all hooks.

## Enemy AI Must Pathfind to Adjacent Tiles, Not Target Tile

**Pattern:** `computeGruntAction` pathfinds to the player's tile, then `runEnemyTurn` blocks the move because the tile is occupied. Enemy "attacks" from max range without moving.

**Rule:** Always pathfind to an unoccupied tile adjacent to the target. Build an occupied-tile set from all living combatants. Try all 8 adjacent tiles sorted by distance to the enemy. Multiple enemies surrounding a target must each find their own adjacent tile.

## Dead Tokens Should Give Visual Feedback

**Pattern:** Killed enemy token stays at full opacity with 0 HP bar. Player can't tell visually that it's dead.

**Rule:** Set `group.alpha = 0.25` on tokens with `currentHp <= 0`. The HP bar disappearing is not enough visual feedback.

## Dungeon Entry Points Must Be Inside Rooms, Not at Map Edges

**Pattern:** Exit `entryPoint` coordinates use map-edge positions like `{ x: centerX, y: 1 }`. But BSP-generated dungeon rooms have padding from the map edge, so row 1 may be solid rock with no floor tiles. Player spawns outside the walkable area.

**Rule:** For dungeon exits, set `entryPoint` to the center of the nearest BSP room to that edge. Also, when transitioning areas, prefer the target area's `playerStart` over the source exit's `entryPoint`.

## Multiplayer: Every Feature Must Work for ALL Players
**Pattern:** Feature works for host but is invisible/broken for second player. Examples: tokens not visible, TTS not playing, quests not syncing, rest modal not showing, resurrect HP not matching, roof state not per-player.

**Rule:** When building ANY feature, check: (1) Does it broadcast state to other players? (2) Does the broadcast handler on the receiver actually apply the state? (3) Is the feature using local player position or host position? Always use local position for visual state (roofs, fog, darkvision). Always include `userId` when constructing `partyMembers` from Supabase.

## Never Gate Game Flow on AI Response Flags
**Pattern:** Encounter zone triggers, narrator describes combat, but code waits for `startCombat: true` in AI response. AI doesn't include the flag. Players stuck forever.

**Rule:** Use AI responses for flavor text only. Game mechanics (combat start, enemy spawning) must proceed automatically after a short delay. If an AI call fails, use local fallback logic. Same for enemy AI turns — if AI omits `moveToPosition`, compute it locally.

## Enemy Templates Must Be Expanded Into Individual Objects
**Pattern:** `resolveEncounterTemplates` returns `{ name, count, stats }` but `startEncounter` expects individual enemy objects with `id`, `hp`, `maxHp`, `currentHp`, `position`. Passing grouped templates produces zero enemies in combat.

**Rule:** The resolver must expand `count` into N individual objects, each with a unique `id`, full stat block at top level (`hp`, `maxHp`, `currentHp`, `ac`, `speed`), and `isEnemy: true`.

## SpellTargeting Grid Y Coordinate Bug
**Pattern:** `Math.floor(i / mapH)` instead of `Math.floor(i / mapW)` when computing Y from a flat index. All grid cell Y coordinates are wrong, making single-target spell targeting impossible.

**Rule:** When computing 2D coordinates from a flat index: `x = i % width`, `y = Math.floor(i / width)`. Always divide by WIDTH, never height.

## Deploy Requires Merging to Main
**Pattern:** All changes on `agent-dev` but `loreengine.vercel.app` deploys from `main`. User sees old UI.

**Rule:** Always push to agent-dev AND merge to main: `git push origin agent-dev && git checkout main && git merge agent-dev --no-edit && git push origin main && git checkout agent-dev`

## Wall Sprites Need Per-Direction Rotation/Flip

**Pattern:** Wall connector sprites are oriented horizontally by default. For east/west edges they need rotation. But applying the same rotation to both east and west (or no flip on south) makes walls look uniform/wrong.

**Rule:** Apply direction-specific transforms: north = no rotation, south = flip Y, east = rotate +90 degrees, west = rotate -90 degrees. This ensures wall textures face inward on all four edges.
