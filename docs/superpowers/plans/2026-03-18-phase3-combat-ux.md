# Phase 3: Combat UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make combat playable in V2 — action palette replaces exploration tools, initiative strip at top, movement range highlights on grid, combat mode transforms the HUD.

**Architecture:** The existing V1 combat logic (Zustand store: encounter state, action economy, enemy AI) is preserved. V2 adds a combat HUD layer that reads encounter state and renders game-first combat UI. The PixiJS canvas shows movement range highlights. The bottom bar action area swaps between exploration tools and combat palette based on `encounter.phase`.

**Tech Stack:** React 19, Zustand 5, PixiJS v8

---

## File Structure

### New files
```
src/
├── hud/
│   ├── CombatActionBar.jsx        # Attack/Cast/Move + Dodge/Dash/Hide/Say + action economy (~120 lines)
│   ├── InitiativeStrip.jsx        # Top-center portrait row showing turn order (~80 lines)
│   └── EnemyInfoPanel.jsx         # Right-side panel showing targeted enemy stats (~60 lines)
├── engine/
│   └── MovementRange.js           # Flood-fill movement range highlight on PixiJS grid (~60 lines)
```

### Modified files
```
src/hud/BottomBar.jsx              # Swap ActionArea ↔ CombatActionBar based on combat state
src/hud/GameHUD.jsx                # Add InitiativeStrip + EnemyInfoPanel + turn banner
src/hud/hud.css                    # Combat mode styles (red accents, action buttons)
src/engine/GridOverlay.js          # Support red combat grid tint
src/engine/PixiApp.jsx             # Render movement range highlights during combat
src/GameV2.jsx                     # Combat mode detection, wire combat actions
```

---

## Task 1: Combat CSS Styles

**Files:**
- Modify: `src/hud/hud.css`

Add combat-mode styles at the end of hud.css:

```css
/* === Combat Mode === */
.hud-combat-bar {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 240px;
  flex-shrink: 0;
}

.hud-combat-primary {
  display: flex;
  gap: 3px;
  justify-content: center;
}

.hud-combat-btn {
  flex: 1;
  height: 40px;
  background: #0c0a08;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  font-size: 8px;
  font-family: var(--font-heading);
  font-weight: 900;
  letter-spacing: 2px;
  border-radius: 0;
  padding: 0;
  min-height: 0;
}

.hud-combat-btn.attack { border: 1px solid #c9a84c; color: #c9a84c; }
.hud-combat-btn.cast { border: 1px solid #6633aa; color: #9944aa; }
.hud-combat-btn.move { border: 1px solid #226644; color: #44aa66; }

.hud-combat-secondary {
  display: flex;
  gap: 2px;
  align-items: center;
}

.hud-combat-btn-sm {
  flex: 1;
  height: 28px;
  background: #080608;
  border: 1px solid #1a1614;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: #554433;
  cursor: pointer;
  font-family: var(--font-heading);
  letter-spacing: 1px;
  border-radius: 0;
  padding: 0;
  min-height: 0;
}

.hud-combat-btn-sm:hover { color: #998866; border-color: #2a2018; }

.hud-end-turn {
  height: 24px;
  background: #1a0808;
  border: 1px solid #cc3333;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 8px;
  color: #cc3333;
  font-weight: 900;
  font-family: var(--font-heading);
  letter-spacing: 3px;
  border-radius: 0;
  padding: 0;
  min-height: 0;
}

.hud-end-turn:hover { background: #2a0808; color: #ff4444; }

.hud-economy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 4px;
}

.hud-economy-dot {
  display: flex;
  align-items: center;
  gap: 2px;
}

.hud-economy-dot span {
  font-size: 6px;
  color: #332a1e;
  font-family: monospace;
}

/* Initiative strip */
.hud-initiative {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  background: rgba(6,5,8,0.92);
  border: 1px solid #2a1010;
  padding: 4px 8px;
  display: flex;
  gap: 3px;
  align-items: center;
  pointer-events: auto;
}

.hud-init-round {
  font-size: 8px;
  color: #cc3333;
  font-weight: 900;
  margin-right: 4px;
  font-family: var(--font-heading);
  letter-spacing: 2px;
}

.hud-init-token {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border-radius: 4px;
  opacity: 0.5;
}

.hud-init-token.active {
  opacity: 1;
  box-shadow: 0 0 6px rgba(68,170,255,0.3);
}

/* Turn banner */
.hud-turn-banner {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 15;
  background: rgba(6,5,8,0.92);
  padding: 5px 14px;
  border-left: 2px solid #4499dd;
  pointer-events: auto;
}

.hud-turn-title {
  font-family: var(--font-heading);
  font-size: 12px;
  color: #4499dd;
  font-weight: 900;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.hud-turn-sub {
  font-size: 8px;
  color: #334455;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Timer */
.hud-timer {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 15;
  background: rgba(6,5,8,0.92);
  padding: 4px 12px;
  border: 1px solid #1a1614;
  pointer-events: auto;
}

.hud-timer-text {
  font-family: var(--font-heading);
  font-size: 18px;
  color: #cccccc;
  font-weight: 900;
  letter-spacing: 2px;
}

/* Enemy info */
.hud-enemy-info {
  position: absolute;
  top: 50px;
  right: 6px;
  width: 150px;
  z-index: 15;
  background: rgba(6,5,8,0.92);
  border: 1px solid #331010;
  border-left: 2px solid #cc3333;
  padding: 8px;
  pointer-events: auto;
}
```

Commit: `git commit -m "feat: add combat mode CSS styles"`

---

## Task 2: CombatActionBar Component

**Files:**
- Create: `src/hud/CombatActionBar.jsx`

The combat action palette — Attack/Cast/Move primary buttons, Dodge/Dash/Hide/Say secondary, action economy dots, END TURN button. Reads encounter state from store to show what's available.

Props: `{ onAction, onEndTurn }` where onAction receives the action type string.

Read the store's encounter state for action economy: `encounter.combatants[currentTurn].actionsUsed`, `bonusActionsUsed`, `remainingMove`.

Commit: `git commit -m "feat: add CombatActionBar component"`

---

## Task 3: InitiativeStrip Component

**Files:**
- Create: `src/hud/InitiativeStrip.jsx`

Top-center portrait strip showing turn order. Read `encounter.combatants` (sorted by initiative), highlight active combatant. Show round number. Each combatant shown as a small colored square with emoji.

Commit: `git commit -m "feat: add InitiativeStrip component"`

---

## Task 4: EnemyInfoPanel Component

**Files:**
- Create: `src/hud/EnemyInfoPanel.jsx`

Right-side panel showing targeted/hovered enemy stats — name, HP bar, AC, conditions. Only shows when an enemy combatant is selected/active.

Commit: `git commit -m "feat: add EnemyInfoPanel component"`

---

## Task 5: Movement Range Highlight

**Files:**
- Create: `src/engine/MovementRange.js`
- Modify: `src/engine/PixiApp.jsx`

Flood-fill from active combatant position, highlight reachable tiles (speed / 5 = max tiles). Blue overlay on reachable tiles. Red grid tint in combat mode.

Commit: `git commit -m "feat: add movement range highlights for combat"`

---

## Task 6: Wire Combat into GameV2 + HUD

**Files:**
- Modify: `src/hud/BottomBar.jsx` — swap ActionArea ↔ CombatActionBar based on encounter.phase
- Modify: `src/hud/GameHUD.jsx` — add InitiativeStrip, turn banner, timer, EnemyInfoPanel when in combat
- Modify: `src/GameV2.jsx` — detect combat mode, wire combat actions to store
- Modify: `src/engine/GridOverlay.js` — accept color param for red combat grid

Commit: `git commit -m "feat: wire combat UI into V2 HUD and GameV2"`

---

## Task 7: Start Combat from V2

**Files:**
- Modify: `src/GameV2.jsx` — add a temporary way to trigger combat for testing (e.g., a "Start Combat" debug button or NPC proximity triggers encounter)

For now, add encounter data to demo zones — when player enters a non-safe zone or a DM triggers it, start the encounter.

Commit: `git commit -m "feat: add combat trigger for V2 testing"`
