# Lessons Learned

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
