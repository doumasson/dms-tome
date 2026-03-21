# Class-Aware Combat Action System — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Replace the hardcoded combat action bar with a class-aware system where each D&D 5e class gets its own set of primary combat buttons, spell/ability pickers, and resource tracking. The current "Cast" button (which fires a hardcoded Fireball regardless of class) is replaced with class-specific abilities and a proper spell selection system.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Action bar layout | Unified Bar — class abilities as primary buttons | Direct access, no hidden panels, feels like a real RPG HUD |
| Spell selection | Modal popup with prepared spell list | Shows full spell info (range, damage, AoE type), consistent with skill check popup pattern |
| Attack flow | Weapon picker modal → click enemy | Lets players choose between equipped weapons (e.g., Monk: Quarterstaff vs Unarmed Strike) |
| AoE targeting | Hover preview — AoE follows cursor | Blue range tiles + orange AoE preview that follows mouse. Single click to cast. Fluid, tactical |

## 1. Unified Action Bar Per Class

The bottom combat HUD primary row adapts based on `character.class`. A secondary row of universal D&D actions stays constant.

### Martial Classes

**Monk:**
```
[⚔ ATTACK] [👊 FLURRY (1Ki)] [🛡 PATIENT DEF (1Ki)] [💨 STEP WIND (1Ki)] [🏃 MOVE]
Ki: ●●●●● 5/5
```
- Flurry of Blows: bonus action, 1 Ki, two unarmed strikes
- Patient Defense: bonus action, 1 Ki, Dodge action as bonus
- Step of the Wind: bonus action, 1 Ki, Dash or Disengage as bonus + jump distance doubled
- Stunning Strike (level 5+): free action after melee hit, 1 Ki, target CON save DC 8+PB+WIS or Stunned

**Fighter:**
```
[⚔ ATTACK] [⚡ ACTION SURGE] [❤ SECOND WIND] [🏃 MOVE]
Action Surge: ● | Second Wind: ●
```
- Action Surge: free, grants one additional action this turn (short rest recharge)
- Second Wind: bonus action, regain 1d10 + Fighter level HP (short rest recharge)
- Extra Attack: 2 attacks at level 5, 3 at 11, 4 at 20 (auto-applied on Attack)

**Barbarian:**
```
[⚔ ATTACK] [🔥 RAGE] [⚔ RECKLESS] [🏃 MOVE]
Rage: ●●● 3/3
```
- Rage: bonus action, advantage on STR checks/saves, bonus melee damage, resistance to bludgeoning/piercing/slashing
- Reckless Attack: free on first attack, advantage on melee STR attacks this turn, enemies have advantage on you

**Rogue:**
```
[⚔ ATTACK] [🎭 CUNNING ACTION] [🏃 MOVE]
Sneak Attack: 1d6 (auto on qualifying hits)
```
- Cunning Action: bonus action, choose Dash/Disengage/Hide (sub-menu on click)
- Sneak Attack: auto-calculated when conditions met (advantage or ally adjacent to target), added to first qualifying hit per turn

### Caster Classes

**Wizard:**
```
[⚔ ATTACK] [✨ SPELLS] [🏃 MOVE]
Slots: L1 ●●○○ | L2 ●●● | L3 ●●
```

**Cleric:**
```
[⚔ ATTACK] [✨ SPELLS] [⚡ CHANNEL DIV] [🏃 MOVE]
Slots: L1 ●●●○ | L2 ●●
```
- Channel Divinity: action, Turn Undead (all undead within 30ft WIS save or flee)

**Bard:**
```
[⚔ ATTACK] [✨ SPELLS] [🎵 INSPIRE] [🏃 MOVE]
Slots: L1 ●●●○ | Inspiration: ●●● (d6)
```
- Bardic Inspiration: bonus action, grant ally 1 inspiration die (d6→d12 by level) to add to one ability check, attack, or save

**Paladin:**
```
[⚔ ATTACK] [✨ SPELLS] [🗡 SMITE] [❤ LAY HANDS] [🏃 MOVE]
Slots: L1 ●●○ | Lay on Hands: 25/25
```
- Divine Smite: free on melee hit, expend spell slot for 2d8+(1d8 per slot level above 1st) radiant damage (+1d8 vs undead/fiend)
- Lay on Hands: action, heal from HP pool (5 × Paladin level), or spend 5 to cure disease/poison

**Warlock:**
```
[⚔ ATTACK] [✨ SPELLS] [🏃 MOVE]
Pact Slots: ●● (L2) — short rest
```

**Sorcerer:**
```
[⚔ ATTACK] [✨ SPELLS] [🏃 MOVE]
Slots: L1 ●●○○ | L2 ●●● | Sorcery: ●●●● 4/4
```

**Druid:**
```
[⚔ ATTACK] [✨ SPELLS] [🐻 WILD SHAPE] [🏃 MOVE]
Slots: L1 ●●●○ | L2 ●● | Wild Shape: ●●
```
- Wild Shape: action, transform into beast (future feature — placeholder button for now)

**Ranger:**
```
[⚔ ATTACK] [✨ SPELLS] [🏃 MOVE]
Slots: L1 ●● (starts at level 2)
```

### Secondary Row (Universal, All Classes)
```
DODGE · DASH · DISENGAGE · HIDE · SAY
```
- Dodge: action, attacks against you have disadvantage until next turn
- Dash: action, double movement this turn
- Disengage: action, no opportunity attacks this turn
- Hide: action, Stealth check, unseen until revealed

### Resource Display

Above the primary buttons, show a compact resource bar:
- Spell slot pips grouped by level (filled = available, empty = used)
- Class resource counters (Ki: 5/5, Rage: 3/3, etc.)
- Concentration indicator if concentrating on a spell

## 2. Attack Flow — Weapon Picker Modal

### Trigger
Player clicks `ATTACK` button.

### Weapon Picker Modal
A small centered modal appears showing equipped weapons:

```
┌─────────────────────────────────────┐
│         ⚔ Choose Weapon             │
│                                     │
│  [Quarterstaff]  +4  1d8+2 blunt   │
│  [Unarmed Strike] +4  1d4+2 blunt  │
│                                     │
│         Press Escape to cancel      │
└─────────────────────────────────────┘
```

### Data Source
- Weapons from `character.equippedItems` (mainHand, offHand, twoHanded)
- Unarmed Strike always included
- Attack bonus: proficiency + STR mod (or DEX if finesse/ranged)
- Damage: weapon dice + STR mod (or DEX)
- Monk: Unarmed Strike uses martial arts die from `classes.js` (`martialArtsDie[level]`)

### After Selection
- Enter targeting mode: "Click an enemy to attack"
- Click enemy tile → resolve attack roll
- Combat log shows: `⚔ taaaaco → Goblin: HIT 7 dmg (d20:14+4=18 vs AC 15)`
- Action consumed

### Extra Attack
- If character has Extra Attack (Fighter 5+, Monk 5+, Paladin 5+, Barbarian 5+, Ranger 5+):
- After first attack resolves, if action not fully consumed, prompt for additional attacks
- Track attacks remaining this turn: `attacksThisTurn` counter vs `extraAttacks` from class data

## 3. Spell Picker Modal

### Trigger
Player clicks `SPELLS` button (casters only — button hidden for non-casters).

### Modal Layout
```
┌──────────────────────────────────────────┐
│            ✨ Prepared Spells            │
│     L1: ●●○○ | L2: ●●● | L3: ●●       │
│                                          │
│  CANTRIPS (at will)                      │
│  [🔥 Fire Bolt      120ft  1d10 fire  ] │
│  [🖐 Mage Hand      30ft   utility    ] │
│  [⚡ Shocking Grasp  touch  1d8 light  ] │
│                                          │
│  LEVEL 1 (2 slots remaining)             │
│  [🔥 Burning Hands   15ft cone  3d6   ] │
│  [🛡 Shield          react      +5 AC ] │
│  [💤 Sleep           90ft area  5d8   ] │
│  [⚡ Magic Missile   120ft auto  3×1d4] │
│                                          │
│  LEVEL 3 (2 slots remaining)             │
│  [🔥 Fireball     150ft sphere  8d6   ] │
│  [⚡ Lightning Bolt 100ft line  8d6   ] │
│                                          │
│           Escape to cancel               │
└──────────────────────────────────────────┘
```

### Data Source
- Spells from `character.spells` (prepared/known spells)
- Filtered by `character.class` matching spell's `classes` array
- Slot availability from `character.spellSlots[level].used` vs `.total`
- Spell data (range, damage, AoE, save) from `src/data/spells.js`

### Spell Selection Flow
1. Click spell in modal
2. If leveled spell: check slot availability. If no slots at that level, grey out / show "No slots remaining"
3. If concentration spell and already concentrating: warn "This will end your current concentration on [spell]"
4. Modal closes
5. Enter targeting mode based on spell type:
   - **AoE (sphere/cone/line/cube):** Hover preview targeting (see §4)
   - **Ranged attack:** "Click an enemy within range"
   - **Melee attack:** "Click an adjacent enemy"
   - **Self/utility:** Cast immediately (Shield, Mage Hand, etc.)
6. On cast: consume spell slot, apply effects, narrate

### Cantrip Scaling
Cantrip damage scales with character level per 5e rules:
- Level 1–4: base damage
- Level 5–10: +1 die
- Level 11–16: +2 dice
- Level 17+: +3 dice

## 4. AoE Targeting — Hover Preview

### Enter Targeting Mode
After selecting an AoE spell from the modal, the grid enters AoE targeting mode.

### Visual Layers
1. **Blue range overlay:** All tiles within spell range from caster position. Subtle blue tint (`rgba(68, 100, 255, 0.08)`).
2. **Orange AoE preview:** Follows cursor in real-time. Uses existing `AoEOverlay.js` shape functions:
   - `getTilesInSphere(cursorPos, radiusTiles)` — Fireball, Shatter
   - `getTilesInCone(casterPos, directionToCursor, lengthTiles)` — Burning Hands, Cone of Cold
   - `getTilesInLine(casterPos, directionToCursor, lengthTiles)` — Lightning Bolt
   - `getTilesInCube(cursorPos, sizeTiles)` — Thunderwave
3. **Enemy highlight:** Enemies inside the AoE preview get a red border/glow
4. **Count tooltip:** Small label near cursor: "2 enemies in area"

### Cone/Line Direction
- Direction calculated from caster position toward cursor tile
- Snapped to 4 cardinal directions (N/S/E/W) for simplicity
- Preview updates as cursor moves to different quadrants

### Casting
- **Single click** within range to cast
- Out-of-range clicks ignored (cursor shows red X or similar)
- **Escape** cancels targeting, returns to action bar
- On cast:
  1. Consume spell slot
  2. Compute affected tiles (final position)
  3. For each combatant in affected tiles: roll save (spell's save ability vs caster's spell save DC)
  4. Apply damage (full on fail, half on save if `halfOnSave`)
  5. Apply conditions if any
  6. Log results with full roll details
  7. Narrate via AI if API key available
  8. AoE visual lingers for 1.5s then clears

### Spell Save DC
`8 + proficiency bonus + spellcasting ability modifier`
- Wizard/Artificer: INT
- Cleric/Druid/Ranger: WIS
- Bard/Paladin/Warlock/Sorcerer: CHA

## 5. Class Resource Tracking

### Combatant Resource State
Each combatant in `encounter.combatants[]` gains:
```javascript
{
  ...existingFields,
  resourcesUsed: {
    // Class resources — keyed by resource name from classes.js
    "Ki": 0,           // Monk: 0 = full, increments as spent
    "Action Surge": 0,  // Fighter
    "Rage": 0,          // Barbarian
    // etc.
  },
  attacksMadeThisTurn: 0,   // For Extra Attack tracking
  concentratingOn: null,     // Spell name if concentrating
  bonusActionUsed: false,    // Separate from actionsUsed
  reactionUsed: false,       // For Shield, OA, etc.
}
```

### Resource Consumption
- Class ability buttons check `resourcesUsed[name] < maxUses` before enabling
- On use: increment `resourcesUsed[name]`
- On short rest: reset resources with `recharge: 'short'`
- On long rest: reset all resources
- On new turn: reset `attacksMadeThisTurn`, `bonusActionUsed = false`, refresh per-turn resources

### Resource Display
Compact pips/counters above the action bar:
- `Ki: ●●●○○ 3/5` — filled dots = remaining
- `Slots: L1 ●●○ | L2 ●●` — grouped by spell level
- `Rage: ●●● 3/3`
- Active concentration shown with spell name: `⟳ Concentrating: Bless`

## 6. Action Economy Enforcement

### Action Types
Each ability/spell has an `actionType`:
- `action` — uses the character's action (Attack, Cast, Dodge, Dash, etc.)
- `bonus_action` — uses bonus action (Flurry, Patient Defense, bonus action spells, Second Wind)
- `reaction` — uses reaction (Shield spell, Opportunity Attack, Uncanny Dodge)
- `free` — no action cost (Stunning Strike after hit, Divine Smite after hit)
- `movement` — costs movement (standing from Prone)

### Button State
- Buttons whose `actionType` is consumed are greyed out with reduced opacity
- Movement button shows remaining feet
- Resource-dependent buttons show cost and grey out when resource depleted
- Level-locked abilities show level requirement and grey out

### Turn Reset
On `nextEncounterTurn()`:
- Reset `actionsUsed`, `bonusActionUsed`, `reactionUsed` to false/0
- Reset `attacksMadeThisTurn` to 0
- Reset `remainingMove` to `speed / 5`
- Do NOT reset resources (Ki, spell slots, etc. — those persist across turns)

## 7. Implementation Architecture

### New Components
- `src/hud/CombatActionBar.jsx` — **Modify existing.** Replace hardcoded buttons with class-aware button generation. Add resource display.
- `src/hud/SpellPickerModal.jsx` — **New.** Modal showing prepared spells grouped by level with slot tracking.
- `src/hud/WeaponPickerModal.jsx` — **New.** Modal showing equipped weapons with attack/damage stats.
- `src/hud/ClassResourceBar.jsx` — **New.** Compact resource pip/counter display.

### Modified Files
- `src/hooks/useCombatActions.js` — Replace hardcoded Fireball with proper spell targeting. Add hover preview for AoE. Add weapon selection flow. Wire class ability buttons to resource consumption.
- `src/store/encounterSlice.js` — Add `resourcesUsed`, `bonusActionUsed`, `reactionUsed` to combatant state. Add actions: `useClassResource`, `useBonusAction`, `useReaction`. Modify `nextEncounterTurn` to reset per-turn state.
- `src/engine/AoEOverlay.js` — Add hover preview mode (render on mousemove, not just on click). Add range overlay rendering.

### Data Flow
```
CombatActionBar (reads class, renders buttons)
  → SpellPickerModal (reads character.spells + spellSlots)
    → useCombatActions.handleSpellCast(spell)
      → AoE hover preview (PixiApp mousemove → AoEOverlay)
        → Click → encounterSlice.resolveSpell()
          → Save rolls, damage, conditions, narration
  → WeaponPickerModal (reads character.equippedItems)
    → useCombatActions.handleAttack(weapon)
      → Click enemy → encounterSlice.resolveAttack()
  → Class ability buttons
    → encounterSlice.useClassResource(name)
      → Apply effect (Ki → Flurry, Rage → buff, etc.)
```

### Key Constraint
- **File size limit: ~400 lines per component.** SpellPickerModal and WeaponPickerModal are separate files. CombatActionBar stays thin — delegates to modals and hooks.
- All class ability definitions come from `src/data/classes.js` — no hardcoded class logic in components.
- Spell data comes from `src/data/spells.js` — no hardcoded spell objects anywhere.
