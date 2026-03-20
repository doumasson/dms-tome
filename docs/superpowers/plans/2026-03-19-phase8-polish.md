# Phase 8 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 polish features: portrait selection, mobile responsive, opportunity attacks, cover mechanics, larger areas with multi-floor, and dungeon generation.

**Architecture:** Each feature is independent and can be implemented in any order. TDD where logic exists. Features build on existing systems: wallEdges for cover, area briefs for multi-floor, BSP generator for dungeons, pathfinding for OA detection.

**Tech Stack:** React, PixiJS v8, Zustand, Vitest, existing FA tile atlases, existing areaBuilder/dungeonGenerator/pathfinding modules.

**Spec:** `docs/superpowers/specs/2026-03-19-phase8-polish-design.md`

---

## Feature 1: Character Portrait Selection UI

### Task 1: Portrait Manifest + Picker Modal

**Files:**
- Create: `public/portraits/manifest.json`
- Create: `src/components/PortraitPickerModal.jsx`

- [ ] **Step 1: Create empty portrait manifest**

```json
// public/portraits/manifest.json
{
  "portraits": []
}
```

- [ ] **Step 2: Create PortraitPickerModal component**

```jsx
// src/components/PortraitPickerModal.jsx
import { useState, useEffect } from 'react'

const ARCHETYPE_MAP = {
  Fighter: 'martial', Barbarian: 'martial', Monk: 'martial', Ranger: 'martial',
  Wizard: 'caster', Sorcerer: 'caster', Warlock: 'caster',
  Cleric: 'divine', Paladin: 'divine',
  Rogue: 'rogue', Bard: 'rogue',
}

export default function PortraitPickerModal({ race, cls, currentPortrait, onSelect, onClose }) {
  const [portraits, setPortraits] = useState([])
  const [selected, setSelected] = useState(currentPortrait)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/portraits/manifest.json')
      .then(r => r.json())
      .then(data => setPortraits(data.portraits || []))
      .catch(() => setPortraits([]))
  }, [])

  const archetype = ARCHETYPE_MAP[cls] || 'martial'
  const filtered = showAll ? portraits : portraits.filter(p => {
    const raceMatch = !p.tags?.race?.length || p.tags.race.includes(race?.toLowerCase())
    const archMatch = !p.tags?.archetype?.length || p.tags.archetype.includes(archetype)
    return raceMatch && archMatch
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#0e0b14', border: '2px solid #d4af37', borderRadius: 12,
        width: '90vw', maxWidth: 700, maxHeight: '80vh', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#d4af37', margin: 0, fontSize: 18 }}>Choose Portrait</h3>
          <label style={{ color: '#888', fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            {' '}Show All
          </label>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8,
        }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: 40 }}>
              No portraits for {race} {cls} yet. Using auto-generated portrait.
            </div>
          )}
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(`portraits/${p.file}`)}
              style={{
                width: 80, height: 80, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                border: selected === `portraits/${p.file}` ? '3px solid #d4af37' : '3px solid transparent',
              }}
            >
              <img src={`/portraits/${p.file}`} alt={p.id}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', background: '#1a1520', border: '1px solid #333', color: '#888', borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => { onSelect(selected); onClose() }}
            disabled={!selected}
            style={{ padding: '8px 20px', background: '#2a1a0a', border: '1px solid #d4af37', color: '#d4af37', borderRadius: 6, cursor: 'pointer', opacity: selected ? 1 : 0.4 }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run dev server to verify modal renders**

Run: `npm run dev` → open in browser, verify no errors in console.

- [ ] **Step 4: Commit**

```bash
git add public/portraits/manifest.json src/components/PortraitPickerModal.jsx
git commit -m "feat: add portrait picker modal component + empty manifest"
```

### Task 2: Wire Portrait Picker into Character Creation

**Files:**
- Modify: `src/components/characterCreate/StepIdentity.jsx`
- Modify: `src/components/CharacterCreate.jsx`

- [ ] **Step 1: Add portrait state and picker trigger to StepIdentity**

In `src/components/characterCreate/StepIdentity.jsx`, add a `portrait` prop and "Choose Portrait" button next to the avatar preview. The button opens `PortraitPickerModal`.

```jsx
// Add to StepIdentity props: portrait, setPortrait
// Add useState for modal: const [showPicker, setShowPicker] = useState(false)
// Replace the <img src={avatar}> with:
//   <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowPicker(true)}>
//     <img src={portrait || avatar} alt="Avatar" style={s.avatarPreview} />
//     <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center',
//       background: 'rgba(0,0,0,0.7)', color: '#d4af37', fontSize: 10, padding: '2px 0' }}>
//       Choose Portrait
//     </div>
//   </div>
// After the closing </div> of identityRow, add:
//   {showPicker && <PortraitPickerModal race={race} cls={cls} currentPortrait={portrait}
//     onSelect={setPortrait} onClose={() => setShowPicker(false)} />}
```

- [ ] **Step 2: Add portrait state to CharacterCreate.jsx**

In `src/components/CharacterCreate.jsx`:
- Add `const [portrait, setPortrait] = useState('')` alongside existing state (near line 37).
- Pass `portrait` and `setPortrait` to StepIdentity in the stepMap (near line 179).
- In the character object creation (near line 141), use `portrait: portrait || avatarUrl(name.trim(), race, cls)` so custom portrait takes precedence.

- [ ] **Step 3: Test in browser**

Create a character, verify "Choose Portrait" overlay appears on avatar, clicking opens modal, empty state shows fallback message. Selecting a portrait (once library is populated) updates the preview.

- [ ] **Step 4: Commit**

```bash
git add src/components/characterCreate/StepIdentity.jsx src/components/CharacterCreate.jsx
git commit -m "feat: wire portrait picker into character creation flow"
```

### Task 3: Wire Portraits into V2 HUD

**Files:**
- Modify: `src/hud/PartyPortraits.jsx`

- [ ] **Step 1: Replace emoji placeholders with portrait images**

In `src/hud/PartyPortraits.jsx`, find the emoji placeholder comment (around line 48). Replace the emoji `<div>` with an `<img>` that loads `member.portrait`:

```jsx
// Inside the portrait frame div, replace the emoji span with:
{member.portrait ? (
  <img src={member.portrait} alt={member.name}
    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
) : (
  <span style={{ fontSize: 22 }}>{classEmoji}</span>
)}
```

- [ ] **Step 2: Test in browser with ?v2**

Load game with `?v2`, verify portraits render in the bottom bar (or fallback to emoji if no portrait set).

- [ ] **Step 3: Commit**

```bash
git add src/hud/PartyPortraits.jsx
git commit -m "feat: render character portraits in V2 HUD party bar"
```

---

## Feature 2: Mobile/Tablet Responsive Breakpoints

### Task 4: Add CSS Breakpoints to HUD

**Files:**
- Modify: `src/hud/hud.css`

- [ ] **Step 1: Add tablet breakpoint (768–1024px)**

Append to `src/hud/hud.css`:

```css
/* ── Tablet (768–1024px) ── */
@media (max-width: 1024px) {
  .hud-bottom-bar { height: 110px; padding: 10px 10px 8px; }
  .hud-combat-bar { width: 180px; }
  .hud-action-area { width: 180px; }
  .hud-portrait { width: 40px; height: 50px; }
  .hud-portrait-name { font-size: 7px; max-width: 40px; overflow: hidden; text-overflow: ellipsis; }
  .hud-log-entries { font-size: 10px; }
  .hud-combat-btn { height: 36px; font-size: 7px; }
  .hud-combat-btn-sm { height: 24px; font-size: 7px; }
  .hud-tool-btn { width: 34px; height: 32px; font-size: 7px; }
}
```

- [ ] **Step 2: Add phone breakpoint (<768px) — hide bottom bar, show drawer handle**

```css
/* ── Phone (<768px) ── */
@media (max-width: 767px) {
  .hud-bottom-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: auto; max-height: 60vh;
    transform: translateY(calc(100% - 32px));
    transition: transform 0.3s ease;
    z-index: 100;
  }
  .hud-bottom-bar.drawer-open { transform: translateY(0); }
  .hud-drawer-handle {
    display: flex !important;
    width: 100%; height: 32px;
    align-items: center; justify-content: center;
    cursor: pointer; background: #14101c;
    border-bottom: 1px solid #2a2018;
  }
  .hud-drawer-handle-bar {
    width: 40px; height: 4px; border-radius: 2px; background: #554433;
  }
  .hud-bottom-bar-content {
    display: flex; flex-direction: column; gap: 8px; padding: 8px;
    overflow-y: auto; max-height: calc(60vh - 32px);
  }
  .hud-portrait { width: 32px; height: 32px; border-radius: 50%; }
  .hud-portrait-name { display: none; }
  .hud-combat-btn { min-height: 48px; }
  .hud-combat-btn-sm { min-height: 44px; }
  .hud-tool-btn { min-height: 44px; min-width: 44px; }
}

/* Hidden by default, shown on phone */
.hud-drawer-handle { display: none; }
```

- [ ] **Step 3: Commit**

```bash
git add src/hud/hud.css
git commit -m "feat: add tablet and phone responsive breakpoints to HUD CSS"
```

### Task 5: Bottom Drawer Component + Wiring

**Files:**
- Modify: `src/hud/BottomBar.jsx`

- [ ] **Step 1: Add drawer state and handle to BottomBar**

In `src/hud/BottomBar.jsx`, add drawer toggle state and restructure for mobile:

```jsx
import { useState } from 'react'
import useStore from '../store/useStore'
import PartyPortraits from './PartyPortraits'
import SessionLog from './SessionLog'
import ActionArea from './ActionArea'
import CombatActionBar from './CombatActionBar'
import OrnateDivider from './OrnateDivider'
import FiligreeBar from './FiligreeBar'

export default function BottomBar({ onTool, onChat, onEndTurn, onAction }) {
  const inCombat = useStore(s => s.encounter.phase === 'combat')
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className={`hud-bottom-bar${drawerOpen ? ' drawer-open' : ''}`}>
      {/* Drawer handle — visible only on phone via CSS */}
      <div className="hud-drawer-handle" onClick={() => setDrawerOpen(o => !o)}>
        <div className="hud-drawer-handle-bar" />
      </div>
      <FiligreeBar color={inCombat ? '#cc3333' : '#c9a84c'} />
      <div className="hud-bottom-bar-content">
        <PartyPortraits />
        <OrnateDivider color={inCombat ? '#cc3333' : '#c9a84c'} />
        <SessionLog />
        <OrnateDivider color={inCombat ? '#cc3333' : '#c9a84c'} />
        {inCombat ? (
          <CombatActionBar onEndTurn={onEndTurn} onAction={onAction} />
        ) : (
          <ActionArea onTool={onTool} onChat={onChat} />
        )}
      </div>
      {/* Bottom ornament */}
      <svg style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} width="280" height="10" viewBox="0 0 280 10">
        <path d="M0,5 L90,5 Q105,0 118,5 L162,5 Q175,10 190,5 L280,5" fill="none" stroke={inCombat ? '#cc3333' : '#c9a84c'} strokeWidth="1.2" opacity="0.2"/>
        <circle cx="140" cy="5" r="3.5" fill={inCombat ? '#cc3333' : '#c9a84c'} opacity="0.2"/><circle cx="140" cy="5" r="1.5" fill="#08060c"/>
        <polygon points="108,5 112,2 116,5 112,8" fill={inCombat ? '#cc3333' : '#c9a84c'} opacity="0.15"/>
        <polygon points="164,5 168,2 172,5 168,8" fill={inCombat ? '#cc3333' : '#c9a84c'} opacity="0.15"/>
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Add mobile touch interaction note for NPC/exit**

In `src/engine/PixiApp.jsx`, verify that click handlers work with touch events (PixiJS v8 handles pointer events by default — `pointerdown`/`pointerup` cover both mouse and touch). No code change needed if already using pointer events.

- [ ] **Step 3: Test on browser at various widths**

Use Chrome DevTools responsive mode. Verify:
- \>1024px: normal layout
- 768–1024px: shrunk portraits, narrower panels
- <768px: drawer with handle, full-screen canvas behind

- [ ] **Step 4: Commit**

```bash
git add src/hud/BottomBar.jsx
git commit -m "feat: bottom drawer for mobile responsive HUD"
```

---

## Feature 3: Opportunity Attacks

### Task 6: Grid Utils + OA Logic (TDD)

**Files:**
- Create: `src/lib/gridUtils.js`
- Create: `src/lib/opportunityAttack.js`
- Create: `src/lib/opportunityAttack.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/opportunityAttack.test.js
import { describe, it, expect } from 'vitest'
import { chebyshev } from './gridUtils.js'
import { findOATriggers } from './opportunityAttack.js'

describe('chebyshev', () => {
  it('returns 0 for same position', () => {
    expect(chebyshev({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0)
  })
  it('returns 1 for adjacent', () => {
    expect(chebyshev({ x: 3, y: 3 }, { x: 4, y: 4 })).toBe(1)
  })
  it('returns max of dx,dy', () => {
    expect(chebyshev({ x: 0, y: 0 }, { x: 3, y: 5 })).toBe(5)
  })
})

describe('findOATriggers', () => {
  const enemy = (x, y, opts = {}) => ({
    id: `e-${x}-${y}`, name: 'Goblin', position: { x, y },
    hp: 10, currentHp: 10, reactionUsed: false, ...opts,
  })

  it('returns empty when no enemies adjacent', () => {
    const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]
    const enemies = [enemy(5, 5)]
    expect(findOATriggers(path, enemies, false)).toEqual([])
  })

  it('triggers when leaving enemy reach', () => {
    // Player at (1,0) adjacent to enemy at (1,1), moves to (2,0) — no longer adjacent
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
    const enemies = [enemy(1, 1)]
    const triggers = findOATriggers(path, enemies, false)
    expect(triggers).toHaveLength(1)
    expect(triggers[0].enemy.id).toBe('e-1-1')
    expect(triggers[0].step).toBe(1) // leaving at step 1 (from {2,0} to {3,0})
  })

  it('no trigger when staying adjacent', () => {
    // Move from (0,0) to (1,0) — still adjacent to enemy at (1,1)
    const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    const enemies = [enemy(1, 1)]
    expect(findOATriggers(path, enemies, false)).toEqual([])
  })

  it('no trigger when disengaged', () => {
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
    const enemies = [enemy(1, 1)]
    expect(findOATriggers(path, enemies, true)).toEqual([])
  })

  it('no trigger when enemy reaction already used', () => {
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
    const enemies = [enemy(1, 1, { reactionUsed: true })]
    expect(findOATriggers(path, enemies, false)).toEqual([])
  })

  it('no trigger from dead enemies', () => {
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]
    const enemies = [enemy(1, 1, { currentHp: 0 })]
    expect(findOATriggers(path, enemies, false)).toEqual([])
  })

  it('triggers from multiple enemies on same path', () => {
    const path = [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }]
    const enemies = [enemy(2, 3), enemy(4, 3)]
    const triggers = findOATriggers(path, enemies, false)
    expect(triggers).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/opportunityAttack.test.js`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement gridUtils.js**

```js
// src/lib/gridUtils.js
export function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}
```

- [ ] **Step 4: Implement opportunityAttack.js**

```js
// src/lib/opportunityAttack.js
import { chebyshev } from './gridUtils.js'
import { rollDamage } from './dice.js'

export function findOATriggers(path, enemies, moverDisengaged) {
  if (moverDisengaged) return []
  const triggers = []
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]
    const to = path[i + 1]
    for (const enemy of enemies) {
      if (enemy.reactionUsed) continue
      if ((enemy.currentHp ?? enemy.hp) <= 0) continue
      const adjBefore = chebyshev(from, enemy.position) <= 1
      const adjAfter = chebyshev(to, enemy.position) <= 1
      if (adjBefore && !adjAfter) {
        triggers.push({ step: i, enemy, tile: from })
      }
    }
  }
  return triggers
}

export function resolveOA(enemy, target) {
  const weapon = enemy.attacks?.[0] || { name: 'Unarmed Strike', bonus: '+0', damage: '1' }
  const bonus = parseInt(weapon.bonus) || 0
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + bonus
  const isCrit = d20 === 20
  const hit = isCrit || total >= (target.ac || 10)
  let damage = 0
  if (hit) {
    const dmgResult = rollDamage(weapon.damage || '1')
    damage = isCrit ? dmgResult.total * 2 : dmgResult.total
  }
  return { hit, d20, total, damage, isCrit, weaponName: weapon.name }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/opportunityAttack.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gridUtils.js src/lib/opportunityAttack.js src/lib/opportunityAttack.test.js
git commit -m "feat: OA trigger detection + grid utils with TDD"
```

### Task 7: Wire OA into Combat Movement + Disengage Button

**Files:**
- Modify: `src/GameV2.jsx` (combat movement handler ~line 762-784)
- Modify: `src/hud/CombatActionBar.jsx` (add DISENGAGE button after line 84)
- Modify: `src/store/useStore.js` (nextEncounterTurn ~line 492 — reset reactionUsed/disengaged)

- [ ] **Step 1: Add DISENGAGE button to CombatActionBar**

In `src/hud/CombatActionBar.jsx`, in the secondary actions section (between HIDE and SAY buttons, around line 84), add:

```jsx
<button className="hud-combat-btn-sm" disabled={!canMove || !actionsLeft}
  style={{ opacity: (!canMove || !actionsLeft) ? 0.4 : 1 }}
  onClick={() => handleAction('disengage')}>DISENGAGE</button>
```

- [ ] **Step 2: Add reactionUsed/disengaged reset in nextEncounterTurn**

In `src/store/useStore.js`, in `nextEncounterTurn` (around line 506), modify the combatant map to also reset `reactionUsed` and `disengaged`:

```js
const updated = combatants.map((c, i) =>
  i === nextTurn ? {
    ...c,
    remainingMove: Math.floor((c.speed || 30) / 5),
    actionsUsed: 0,
    bonusActionsUsed: 0,
    reactionUsed: false,
    disengaged: false,
  } : c
)
```

- [ ] **Step 3: Handle 'disengage' action in GameV2.jsx**

In `src/GameV2.jsx`, find the action handler (where `handleAction` dispatches actions like 'dodge', 'dash'). Add a `disengage` case:

```js
case 'disengage': {
  const { useAction } = useStore.getState()
  useAction(active.id)
  // Set disengaged flag on the active combatant
  useStore.setState(state => ({
    encounter: {
      ...state.encounter,
      combatants: state.encounter.combatants.map(c =>
        c.id === active.id ? { ...c, disengaged: true } : c
      ),
    },
  }))
  addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} takes the Disengage action.` })
  broadcastEncounterAction({ type: 'disengage', id: active.id })
  break
}
```

- [ ] **Step 4: Add OA pre-scan to combat movement handler**

In `src/GameV2.jsx`, in the combat movement section (~line 762), before `findPathEdge` and animation, add the OA check. After the path is computed but before movement begins:

```js
import { findOATriggers, resolveOA } from './lib/opportunityAttack.js'

// After path is computed:
const aliveEnemies = encounter.combatants.filter(c =>
  c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position
)
const oaTriggers = findOATriggers(pathResult, aliveEnemies, active.disengaged)

if (oaTriggers.length > 0) {
  const names = [...new Set(oaTriggers.map(t => t.enemy.name))].join(', ')
  // Show styled in-game confirmation (NOT window.confirm — breaks dark fantasy theme)
  // Use a state variable like setPendingOA({ oaTriggers, path, names }) to show
  // an OA confirmation modal. The modal has "Move Anyway" and "Cancel" buttons.
  // On confirm → proceed with movement + OA resolution.
  // On cancel → clear pending state, stay put.
  setPendingOA({ triggers: oaTriggers, path: pathResult, names })
  return // Movement handled by the OA confirm handler
}
```

Add state and a small confirmation overlay component:
```js
const [pendingOA, setPendingOA] = useState(null)

// In the render, before modals:
{pendingOA && (
  <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#0e0b14', border: '2px solid #d4af37', borderRadius: 8,
      padding: 24, maxWidth: 400, textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>⚔</div>
      <div style={{ color: '#e0d0b8', marginBottom: 16 }}>
        This path provokes attacks of opportunity from <strong style={{ color: '#cc3333' }}>{pendingOA.names}</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={() => { executeMoveWithOA(pendingOA); setPendingOA(null) }}
          style={{ padding: '8px 20px', background: '#3a1a0a', border: '1px solid #cc3333',
            color: '#e0d0b8', borderRadius: 4, cursor: 'pointer' }}>Move Anyway</button>
        <button onClick={() => setPendingOA(null)}
          style={{ padding: '8px 20px', background: '#1a1520', border: '1px solid #333',
            color: '#888', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  </div>
)}
```

Then after movement animation, resolve each OA:

```js
for (const trigger of oaTriggers) {
  const result = resolveOA(trigger.enemy, active)
  const entry = result.hit
    ? `⚔ Opportunity Attack! ${trigger.enemy.name} → ${active.name}: HIT! d20(${result.d20})+${parseInt(trigger.enemy.attacks?.[0]?.bonus)||0}=${result.total} for ${result.damage} damage.`
    : `⚔ Opportunity Attack! ${trigger.enemy.name} → ${active.name}: MISS.`
  addNarratorMessage({ role: 'dm', speaker: 'Combat', text: entry })
  broadcastEncounterAction({
    type: 'opportunity-attack',
    attackerId: trigger.enemy.id, targetId: active.id,
    hit: result.hit, damage: result.damage, log: entry,
  })
  if (result.hit && result.damage > 0) {
    const { applyEncounterDamage } = useStore.getState()
    applyEncounterDamage(active.id, result.damage)
  }
  // Mark reaction used
  useStore.setState(state => ({
    encounter: {
      ...state.encounter,
      combatants: state.encounter.combatants.map(c =>
        c.id === trigger.enemy.id ? { ...c, reactionUsed: true } : c
      ),
    },
  }))
  // Stop movement if player drops to 0 HP
  const updated = useStore.getState().encounter.combatants.find(c => c.id === active.id)
  if ((updated?.currentHp ?? 0) <= 0) break
}
```

- [ ] **Step 5: Add OA handling to enemy AI movement**

In `src/lib/enemyAi.js`, in `computeGruntAction`, after the enemy moves, check if any adjacent players get an OA (auto-resolved, no popup). Import `findOATriggers` and `resolveOA`. Return OA results alongside the move action so `GameV2` can broadcast them.

- [ ] **Step 6: Test in browser**

Start combat, position player adjacent to enemy, click MOVE and select a tile that leaves enemy reach. Verify popup appears. Confirm → OA resolves. Cancel → stays put. Test DISENGAGE → move freely.

- [ ] **Step 7: Commit**

```bash
git add src/GameV2.jsx src/hud/CombatActionBar.jsx src/store/useStore.js src/lib/enemyAi.js
git commit -m "feat: opportunity attacks with confirm popup + disengage action"
```

---

## Feature 4: Cover Mechanics

### Task 8: Cover Detection (TDD)

**Files:**
- Modify: `src/lib/pathfinding.js` (export isEdgeBlocked)
- Create: `src/lib/cover.js`
- Create: `src/lib/cover.test.js`

- [ ] **Step 1: Export isEdgeBlocked from pathfinding.js**

In `src/lib/pathfinding.js` line 121, change `function isEdgeBlocked(` to `export function isEdgeBlocked(`. No other changes.

- [ ] **Step 2: Write the failing tests**

```js
// src/lib/cover.test.js
import { describe, it, expect } from 'vitest'
import { bresenhamLine, calculateCover } from './cover.js'

describe('bresenhamLine', () => {
  it('returns straight horizontal line', () => {
    const line = bresenhamLine({ x: 0, y: 0 }, { x: 3, y: 0 })
    expect(line).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }])
  })
  it('returns diagonal line', () => {
    const line = bresenhamLine({ x: 0, y: 0 }, { x: 2, y: 2 })
    expect(line).toHaveLength(3)
    expect(line[0]).toEqual({ x: 0, y: 0 })
    expect(line[2]).toEqual({ x: 2, y: 2 })
  })
})

describe('calculateCover', () => {
  // 5x5 grid, wall edge on cell (2,2) blocking east
  const width = 5
  const wallEdges = new Uint8Array(25) // all zeros = no walls

  it('returns none when no obstacles', () => {
    expect(calculateCover({ x: 0, y: 0 }, { x: 4, y: 0 }, wallEdges, new Set(), width)).toBe('none')
  })

  it('returns half when one wall edge crossed', () => {
    const edges = new Uint8Array(25)
    // Cell (2,0) has east wall edge (EDGE_E = 0x02)
    edges[2] = 0x02
    expect(calculateCover({ x: 0, y: 0 }, { x: 4, y: 0 }, edges, new Set(), width)).toBe('half')
  })

  it('returns half when prop cover in path', () => {
    const propCover = new Set(['2,0'])
    expect(calculateCover({ x: 0, y: 0 }, { x: 4, y: 0 }, wallEdges, propCover, width)).toBe('half')
  })

  it('returns three-quarters when 2+ obstructions', () => {
    const edges = new Uint8Array(25)
    edges[2] = 0x02 // wall at (2,0) east
    const propCover = new Set(['3,0']) // prop at (3,0)
    expect(calculateCover({ x: 0, y: 0 }, { x: 4, y: 0 }, edges, propCover, width)).toBe('three-quarters')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/cover.test.js`
Expected: FAIL.

- [ ] **Step 4: Implement cover.js**

```js
// src/lib/cover.js
import { isEdgeBlocked } from './pathfinding.js'

export function bresenhamLine(from, to) {
  const points = []
  let x0 = from.x, y0 = from.y
  const x1 = to.x, y1 = to.y
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  while (true) {
    points.push({ x: x0, y: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x0 += sx }
    if (e2 < dx) { err += dx; y0 += sy }
  }
  return points
}

export function calculateCover(attackerPos, targetPos, wallEdges, propCover, width) {
  const line = bresenhamLine(attackerPos, targetPos)
  let wallCrossings = 0
  let propCrossings = 0
  for (let i = 0; i < line.length - 1; i++) {
    const from = line[i], to = line[i + 1]
    if (isEdgeBlocked(wallEdges, width, from.x, from.y, to.x, to.y)) {
      wallCrossings++
    }
    if (propCover.has(`${to.x},${to.y}`)) {
      propCrossings++
    }
  }
  const total = wallCrossings + propCrossings
  if (total >= 2) return 'three-quarters'
  if (total >= 1) return 'half'
  return 'none'
}

export const COVER_BONUS = { none: 0, half: 2, 'three-quarters': 5 }

export function buildPropCoverSet(propsLayer, palette, width, height) {
  const set = new Set()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const tileIdx = propsLayer[idx]
      if (tileIdx > 0) {
        const tileId = palette[tileIdx] || ''
        // Furniture, barrels, crates, tables grant cover
        if (tileId && !tileId.includes('door')) {
          set.add(`${x},${y}`)
        }
      }
    }
  }
  return set
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/cover.test.js`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pathfinding.js src/lib/cover.js src/lib/cover.test.js
git commit -m "feat: cover detection with Bresenham ray-cast + prop cover (TDD)"
```

### Task 9: Wire Cover into Attack Resolution + Furniture Terrain

**Files:**
- Modify: `src/GameV2.jsx` (attack resolution ~line 637, combat start/end)

- [ ] **Step 1: Apply cover bonus to attack resolution**

In `src/GameV2.jsx`, in the attack resolution section (~line 637), after computing `dist` and before the hit check, add cover calculation:

```js
import { calculateCover, COVER_BONUS, buildPropCoverSet } from './lib/cover.js'

// After: const maxRange = isRanged ? ...
// Add:
const coverType = calculateCover(active.position, { x, y }, zone.wallEdges, propCoverRef.current, zone.width)
const coverBonus = COVER_BONUS[coverType] || 0
const effectiveAC = (target.ac || 10) + coverBonus

// Change hit check from:
const hit = isCrit || total >= (target.ac || 10)
// To:
const hit = isCrit || total >= effectiveAC

// Update log entry to show cover:
const coverNote = coverBonus > 0 ? ` (${coverType} cover +${coverBonus})` : ''
// Include coverNote in the log string after AC value
```

- [ ] **Step 2: Build propCover set on combat start, set furniture terrain costs**

Add a `propCoverRef = useRef(new Set())` near other refs. When combat starts (the encounter phase changes to 'combat'), build the set and set furniture terrain costs to 2. When combat ends, reset.

```js
useEffect(() => {
  if (inCombat && zone?.layers?.props && zone?.palette) {
    propCoverRef.current = buildPropCoverSet(zone.layers.props, zone.palette, zone.width, zone.height)
    // Set furniture tiles as difficult terrain (cost 2)
    if (!terrainCostRef.current) {
      terrainCostRef.current = new Uint8Array(zone.width * zone.height).fill(1)
    }
    for (const key of propCoverRef.current) {
      const [x, y] = key.split(',').map(Number)
      terrainCostRef.current[y * zone.width + x] = 2
    }
  } else {
    propCoverRef.current = new Set()
    terrainCostRef.current = null
  }
}, [inCombat, zone])
```

- [ ] **Step 3: Apply cover to AoE DEX saves too**

In the AoE spell resolution section (~line 675-760), when calculating saves, add cover bonus to the save DC threshold or to the target's DEX save bonus. For each affected target:

```js
const coverType = calculateCover(spellOrigin, target.position, zone.wallEdges, propCoverRef.current, zone.width)
const coverSaveBonus = COVER_BONUS[coverType] || 0
// Add coverSaveBonus to the target's save roll
```

- [ ] **Step 4: Test in browser**

Start combat, position target behind a wall. Attack should show "(half cover +2)" in log and add to AC.

- [ ] **Step 5: Commit**

```bash
git add src/GameV2.jsx
git commit -m "feat: wire cover mechanics into attack resolution + furniture difficult terrain"
```

---

## Feature 5: Larger Areas + Multi-Floor Buildings

### Task 10: Brief-Driven Sizing + Position Overlap Detection

**Files:**
- Modify: `src/lib/areaBuilder.js`
- Modify: `src/lib/mapGenerator.js`

- [ ] **Step 1: Add calculateAreaSize to areaBuilder.js**

At the top of `src/lib/areaBuilder.js`, add:

```js
export function calculateAreaSize(brief) {
  if (brief.width && brief.height) return { width: brief.width, height: brief.height }
  const poiCount = brief.pois?.length || 3
  const width = Math.min(120, Math.max(40, poiCount * 12))
  const height = Math.round(width * 0.75)
  return { width, height }
}
```

In `buildAreaFromBrief`, use it if width/height not explicitly set:

```js
const size = calculateAreaSize(brief)
const width = brief.width || size.width
const height = brief.height || size.height
```

- [ ] **Step 2: Add overlap detection to resolvePositions**

In `src/lib/mapGenerator.js`, in `resolvePositions`, after placing each POI, check if it overlaps with previously placed POIs. If overlap detected, nudge to nearest free grid cell.

```js
// After computing position for each POI, before storing:
const occupied = new Set() // 'gridX,gridY' strings
// For each POI placement:
let key = `${gridX},${gridY}`
while (occupied.has(key)) {
  // Spiral outward to find free cell
  gridX = (gridX + 1) % gridCols
  if (gridX === 0) gridY = (gridY + 1) % gridRows
  key = `${gridX},${gridY}`
}
occupied.add(key)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/areaBuilder.js src/lib/mapGenerator.js
git commit -m "feat: brief-driven area sizing + position overlap detection"
```

### Task 11: Multi-Floor Exit Types + Stair Handling

**Files:**
- Modify: `src/lib/areaBuilder.js` (exit placement)
- Modify: `src/GameV2.jsx` (stair exit rendering + area transition)
- Modify: `src/lib/campaignGenerator.js` (prompt update)

- [ ] **Step 1: Support stair exit types in areaBuilder**

In `src/lib/areaBuilder.js`, in the exit placement section, handle `type: 'stairs_up' | 'stairs_down' | 'ladder'` exits. Instead of edge-anchored, stair exits are placed at a specific POI position (using `spawnAt` label):

```js
// In exit placement loop:
for (const exit of exits) {
  if (exit.type === 'stairs_up' || exit.type === 'stairs_down' || exit.type === 'ladder') {
    // Place at POI position if spawnAt is specified
    const poi = resolvedPositions[exit.spawnAt || exit.label]
    if (poi) {
      result.exits.push({
        x: poi.x + 1, y: poi.y + 1, width: 1, height: 1,
        targetArea: exit.targetArea, label: exit.label,
        type: exit.type, entryPoint: exit.entryPoint,
      })
    }
  } else {
    // Existing edge-anchored exit logic
  }
}
```

- [ ] **Step 2: Render stair exit icons in GameV2**

In `src/GameV2.jsx`, where exit zones are rendered on the PixiJS canvas, add distinct icons for stair exits:

```js
// When rendering exit tiles, check exit.type:
// 'stairs_up' → render ▲ arrow icon
// 'stairs_down' → render ▼ arrow icon
// 'ladder' → render ≡ ladder icon
// default → existing door/path rendering
```

- [ ] **Step 3: Update campaign generator prompt for multi-floor**

In `src/lib/campaignGenerator.js`, update the Claude prompt to instruct it to generate multi-floor briefs:

```
When a building warrants multiple floors (taverns, inns, castles, dungeons, caves),
generate separate area briefs for each floor linked by stair exits:
- exits with type "stairs_up" or "stairs_down" connecting floor area briefs
- parentArea field linking to the outdoor area
- floorLevel field (1 = ground, 2+ = upper, -1 = basement)
- Dungeons should always have at least 2 levels.
```

- [ ] **Step 4: Test with demo area**

Modify `src/data/demoArea.js` temporarily to include a stair exit. Verify it renders and transitions work.

- [ ] **Step 5: Commit**

```bash
git add src/lib/areaBuilder.js src/GameV2.jsx src/lib/campaignGenerator.js
git commit -m "feat: multi-floor buildings via stair exits + campaign generator update"
```

### Task 12: Scatter Fill + Edge Padding

**Files:**
- Modify: `src/lib/mapGenerator.js`
- Modify: `src/lib/areaBuilder.js`

- [ ] **Step 1: Add scatterProps function to mapGenerator**

```js
// src/lib/mapGenerator.js — new function
export function scatterProps(propsLayer, terrainTileIndices, width, height, density = 0.03, seed = 42) {
  let rng = seed
  const next = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646 }
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x
      if (propsLayer[idx] === 0 && next() < density) {
        propsLayer[idx] = terrainTileIndices[Math.floor(next() * terrainTileIndices.length)]
      }
    }
  }
}
```

- [ ] **Step 2: Add edgePadding function**

```js
export function edgePadding(terrainLayer, borderTileIndices, width, height, depth = 3, seed = 42) {
  let rng = seed
  const next = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646 }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distToEdge = Math.min(x, y, width - 1 - x, height - 1 - y)
      if (distToEdge < depth && next() < 0.7) {
        const idx = y * width + x
        if (terrainLayer[idx] !== 0) { // Don't overwrite empty/buildings
          terrainLayer[idx] = borderTileIndices[Math.floor(next() * borderTileIndices.length)]
        }
      }
    }
  }
}
```

- [ ] **Step 3: Wire into areaBuilder after terrain fill**

In `src/lib/areaBuilder.js`, after `fillTerrain()` call, add:

```js
// Scatter random prop decor in empty terrain
const scatterTiles = palette-indices-for-bushes-rocks-etc
scatterProps(layers.props, scatterTiles, width, height, 0.03, seed)
// Edge padding with trees/rocks
edgePadding(layers.floor, borderTileIndices, width, height, 3, seed)
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/mapGenerator.js src/lib/areaBuilder.js
git commit -m "feat: scatter props + edge padding for natural area boundaries"
```

### Task 13: New Curated Chunks (Priority Set)

**Files:**
- Create: ~10 priority chunk files in `src/data/chunks/`
- Modify: `src/data/chunks/index.js`

- [ ] **Step 1: Create priority building chunks with internal walls**

Create the most impactful chunks first — the multi-room buildings that unlock multi-floor:

1. `src/data/chunks/buildings/tavern_ground.js` (16x12) — common room, kitchen, storeroom, stair tile
2. `src/data/chunks/buildings/tavern_upper.js` (16x12) — hallway, 4 rooms, stair tile
3. `src/data/chunks/buildings/inn_ground.js` (14x10) — lobby, dining, stair
4. `src/data/chunks/buildings/inn_upper.js` (14x10) — corridor, 3 rooms, stair
5. `src/data/chunks/buildings/barracks.js` (12x10) — bunks, armory
6. `src/data/chunks/buildings/cottage.js` (6x6) — single room with hearth

Each chunk follows the existing pattern (see `src/data/chunks/buildings/tavern.js` for reference):
- `metadata: { type, tags, width, height }`
- `palette: [tileId strings]`
- `layers: { floor, walls, props, roof }` as flat arrays of palette indices

Internal walls are encoded in the walls layer — same palette entries as exterior walls, positioned at interior dividers with door tiles for room entrances.

- [ ] **Step 2: Create priority dungeon room chunks**

1. `src/data/chunks/rooms/dungeon_hall.js` (16x10) — pillared hall
2. `src/data/chunks/rooms/prison_cells.js` (12x8) — cells + guard post
3. `src/data/chunks/rooms/throne_room.js` (14x14) — boss arena
4. `src/data/chunks/rooms/treasure_vault.js` (8x8)

- [ ] **Step 3: Create terrain/landmark chunks**

1. `src/data/chunks/terrain/campsite.js` (6x6) — fire ring, logs, bedrolls
2. `src/data/chunks/terrain/graveyard.js` (10x8) — headstones, path
3. `src/data/chunks/landmarks/fountain.js` (4x4) — water feature

- [ ] **Step 4: Register all new chunks in index.js**

Update `src/data/chunks/index.js` to import and export all new chunks.

- [ ] **Step 5: Test with ?v2&testarea**

Verify new chunks render correctly in test area mode.

- [ ] **Step 6: Commit**

```bash
git add src/data/chunks/
git commit -m "feat: 13 new curated chunks — multi-room buildings, dungeon rooms, terrain"
```

---

## Feature 6: Dungeon Area Generation

### Task 14: Dungeon Builder Module (TDD)

**Files:**
- Create: `src/lib/dungeonBuilder.js`
- Create: `src/lib/dungeonBuilder.test.js`
- Modify: `src/lib/dungeonGenerator.js` (add corridorWidth param)

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/dungeonBuilder.test.js
import { describe, it, expect } from 'vitest'
import { buildDungeonArea } from './dungeonBuilder.js'

describe('buildDungeonArea', () => {
  const minBrief = {
    id: 'test-dungeon', name: 'Test Dungeon',
    width: 40, height: 30, theme: 'dungeon',
    dungeonConfig: { minRooms: 3, maxRooms: 5, corridorWidth: 2 },
    enemies: [], exits: [], npcs: [],
  }

  it('returns an area with correct dimensions', () => {
    const area = buildDungeonArea(minBrief, 42)
    expect(area.width).toBe(40)
    expect(area.height).toBe(30)
  })

  it('generates rooms', () => {
    const area = buildDungeonArea(minBrief, 42)
    expect(area.rooms.length).toBeGreaterThanOrEqual(3)
    expect(area.rooms.length).toBeLessThanOrEqual(5)
  })

  it('has floor tiles in rooms', () => {
    const area = buildDungeonArea(minBrief, 42)
    // At least some floor tiles should be non-zero
    const floorCount = area.layers.floor.filter(v => v > 0).length
    expect(floorCount).toBeGreaterThan(0)
  })

  it('has wall edges on room boundaries', () => {
    const area = buildDungeonArea(minBrief, 42)
    expect(area.wallEdges).toBeInstanceOf(Uint8Array)
    const wallCount = area.wallEdges.filter(v => v > 0).length
    expect(wallCount).toBeGreaterThan(0)
  })

  it('has door positions', () => {
    const area = buildDungeonArea(minBrief, 42)
    expect(area.doors.length).toBeGreaterThan(0)
  })

  it('places enemies with position keywords', () => {
    const brief = {
      ...minBrief,
      enemies: [
        { name: 'Goblin', position: 'random_room', count: 3, stats: { hp: 7, ac: 15, speed: 30 }, attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }] },
        { name: 'Bugbear', position: 'boss_room', count: 1, stats: { hp: 27, ac: 16, speed: 30 }, attacks: [{ name: 'Morningstar', bonus: '+4', damage: '2d8+2' }] },
      ],
    }
    const area = buildDungeonArea(brief, 42)
    expect(area.enemies.length).toBe(4) // 3 goblins + 1 bugbear
    area.enemies.forEach(e => {
      expect(e.position).toBeDefined()
      expect(e.position.x).toBeGreaterThanOrEqual(0)
      expect(e.position.y).toBeGreaterThanOrEqual(0)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/dungeonBuilder.test.js`
Expected: FAIL.

- [ ] **Step 3: Update dungeonGenerator to accept corridorWidth**

In `src/lib/dungeonGenerator.js`, add `corridorWidth` to the options parameter. Update `connectRooms` to store `corridorWidth` on each corridor object so `dungeonBuilder` can carve them at the right width:

```js
export function generateDungeon(width, height, { minRooms = 4, maxRooms = 10, corridorWidth = 2, seed = Date.now() } = {}) {
  // ... existing BSP logic unchanged ...
  // In connectRooms, each corridor already has { x1, y1, x2, y2 }.
  // Add corridorWidth to each: corridor.width = corridorWidth
  // The dungeonBuilder.js handles actual carving using this width.
}
```

The corridor objects become `{ x1, y1, x2, y2, width: corridorWidth }`. The actual carving (L-shaped, N-tiles wide) is done by `dungeonBuilder.js` in the corridor carving loop — `dungeonGenerator` just provides the geometry.

- [ ] **Step 4: Implement dungeonBuilder.js**

```js
// src/lib/dungeonBuilder.js
import { generateDungeon } from './dungeonGenerator.js'
import { ChunkLibrary } from './chunkLibrary.js'
import allChunks from '../data/chunks/index.js'
import { buildUnifiedPalette, remapChunk, stampChunk } from './mapGenerator.js'
import { extractWallEdges } from './wallEdgeExtractor.js'
import { THEME_TERRAIN } from './areaBuilder.js'

function getChunkLibrary() {
  const lib = new ChunkLibrary()
  allChunks.forEach(c => lib.register(c))
  return lib
}

export function buildDungeonArea(brief, seed = Date.now()) {
  const { id, name, width, height, theme = 'dungeon', dungeonConfig = {}, enemies = [], exits = [], npcs = [] } = brief
  const { minRooms = 4, maxRooms = 8, corridorWidth = 2 } = dungeonConfig

  // 1. Generate BSP layout
  const dungeon = generateDungeon(width, height, { minRooms, maxRooms, corridorWidth, seed })

  // 2. Build palette from theme
  const terrainTiles = THEME_TERRAIN[theme] || THEME_TERRAIN.dungeon
  const lib = getChunkLibrary()
  const matchedChunks = []

  // 3. Try to match chunks to rooms by type + tags, filter by size
  const roomChunks = dungeon.rooms.map(room => {
    const match = lib.findBest('room', [theme, 'underground'])
    // Only use if chunk fits within BSP room bounds
    const fits = match && match.width <= room.width && match.height <= room.height
    if (fits) matchedChunks.push(match)
    return { room, chunk: fits ? match : null }
  })

  const { palette, tileToIndex } = buildUnifiedPalette(matchedChunks, terrainTiles)

  // 4. Create layers
  const layers = {
    floor: new Uint16Array(width * height),
    walls: new Uint16Array(width * height),
    props: new Uint16Array(width * height),
    roof: new Uint16Array(width * height),
  }

  // 5. Carve rooms — stamp chunks or fill procedurally
  for (const { room, chunk } of roomChunks) {
    if (chunk) {
      const remapped = remapChunk(chunk, tileToIndex)
      stampChunk(layers, remapped, room.x, room.y, width)
    } else {
      // Procedural fill — floor tiles
      const floorIdx = tileToIndex.get(terrainTiles[0]) || 1
      for (let y = room.y; y < room.y + room.height && y < height; y++) {
        for (let x = room.x; x < room.x + room.width && x < width; x++) {
          layers.floor[y * width + x] = floorIdx
        }
      }
    }
  }

  // 6. Carve corridors
  const floorIdx = tileToIndex.get(terrainTiles[0]) || 1
  for (const corridor of dungeon.corridors) {
    // Carve L-shaped corridor with corridorWidth
    const { x1, y1, x2, y2 } = corridor
    const midX = x2, midY = y1
    // Horizontal segment
    const hMinX = Math.min(x1, midX), hMaxX = Math.max(x1, midX)
    for (let y = midY; y < midY + corridorWidth && y < height; y++) {
      for (let x = hMinX; x <= hMaxX && x < width; x++) {
        if (x >= 0 && y >= 0) layers.floor[y * width + x] = floorIdx
      }
    }
    // Vertical segment
    const vMinY = Math.min(midY, y2), vMaxY = Math.max(midY, y2)
    for (let y = vMinY; y <= vMaxY && y < height; y++) {
      for (let x = midX; x < midX + corridorWidth && x < width; x++) {
        if (x >= 0 && y >= 0) layers.floor[y * width + x] = floorIdx
      }
    }
  }

  // 7. Extract wall edges from carved geometry
  const wallEdges = extractWallEdges(layers, palette, width, height)

  // 8. Place doors at BSP intersections
  const doors = dungeon.doors || []

  // 9. Place light sources along corridors
  const lightSources = []
  for (const corridor of dungeon.corridors) {
    const len = Math.abs(corridor.x2 - corridor.x1) + Math.abs(corridor.y2 - corridor.y1)
    const torchInterval = 7
    for (let i = torchInterval; i < len; i += torchInterval) {
      const frac = i / len
      const tx = Math.round(corridor.x1 + (corridor.x2 - corridor.x1) * frac)
      const ty = Math.round(corridor.y1 + (corridor.y2 - corridor.y1) * frac)
      lightSources.push({ position: { x: tx, y: ty }, type: 'torch' })
    }
  }

  // 10. Place enemies using position keywords
  const placedEnemies = []
  const bossRoom = dungeon.rooms.reduce((farthest, room) => {
    const dist = Math.hypot(room.x - dungeon.rooms[0].x, room.y - dungeon.rooms[0].y)
    return dist > farthest.dist ? { room, dist } : farthest
  }, { room: dungeon.rooms[0], dist: 0 }).room

  for (const group of enemies) {
    const count = group.count || 1
    for (let i = 0; i < count; i++) {
      let pos
      if (group.position === 'boss_room') {
        pos = {
          x: bossRoom.x + 1 + Math.floor(Math.random() * (bossRoom.width - 2)),
          y: bossRoom.y + 1 + Math.floor(Math.random() * (bossRoom.height - 2)),
        }
      } else if (group.position === 'entrance') {
        const r = dungeon.rooms[0]
        pos = { x: r.x + Math.floor(r.width / 2), y: r.y + Math.floor(r.height / 2) }
      } else if (group.position === 'guard_corridor') {
        // Place in a corridor midpoint
        const corr = dungeon.corridors[i % dungeon.corridors.length]
        pos = {
          x: Math.round((corr.x1 + corr.x2) / 2),
          y: Math.round((corr.y1 + corr.y2) / 2),
        }
      } else {
        // random_room — any room except starting room
        const room = dungeon.rooms[1 + Math.floor(Math.random() * (dungeon.rooms.length - 1))] || dungeon.rooms[0]
        pos = {
          x: room.x + 1 + Math.floor(Math.random() * (room.width - 2)),
          y: room.y + 1 + Math.floor(Math.random() * (room.height - 2)),
        }
      }

      const label = count > 1 ? `${group.name} ${i + 1}` : group.name
      placedEnemies.push({
        id: `enemy-${label.toLowerCase().replace(/\s/g, '-')}-${i}`,
        name: label,
        isEnemy: true,
        position: pos,
        ...group.stats,
        attacks: group.attacks || [],
      })
    }
  }

  // 11. Player start at first room center
  const startRoom = dungeon.rooms[0]
  const playerStart = {
    x: Math.floor(startRoom.x + startRoom.width / 2),
    y: Math.floor(startRoom.y + startRoom.height / 2),
  }

  return {
    id, name, width, height, tileSize: 200, useCamera: true,
    palette, layers, wallEdges,
    cellBlocked: new Uint8Array(width * height),
    playerStart, npcs: [], enemies: placedEnemies,
    exits: exits.map(e => ({ ...e, x: e.x || playerStart.x, y: e.y || playerStart.y })),
    buildings: [], lightSources, doors,
    rooms: dungeon.rooms,
    theme, generated: true,
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/dungeonBuilder.test.js`
Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dungeonBuilder.js src/lib/dungeonBuilder.test.js src/lib/dungeonGenerator.js
git commit -m "feat: dungeon builder module — BSP + chunk matching + procedural fill (TDD)"
```

### Task 15: Wire Dungeon Builder into Area Pipeline

**Files:**
- Modify: `src/lib/areaBuilder.js`
- Modify: `src/lib/wallAutotile.js` (add crypt/sewer themes)

- [ ] **Step 1: Add crypt and sewer wall styles**

In `src/lib/wallAutotile.js`, add entries to `WALL_STYLES` after the `town` entry:

```js
// Fall back to dungeon tiles until dedicated crypt/sewer assets exist
crypt: {
  segmentPrefix: 'atlas-structures:dwarven_wall_stone_earthy_connector_',
  segmentSuffix: '_1x1',
  variants: ['a1', 'c1'],
  rotateForVertical: true,
  cornerTiles: {
    NE: 'atlas-structures:dwarven_wall_stone_earthy_corner_a1_1x1',
    NW: 'atlas-structures:dwarven_wall_stone_earthy_corner_c1_1x1',
    SE: 'atlas-structures:dwarven_wall_stone_earthy_corner_d2_1x1',
    SW: 'atlas-structures:dwarven_wall_stone_earthy_corner_e1_1x1',
  },
},
sewer: {
  segmentPrefix: 'atlas-structures:dwarven_wall_stone_earthy_connector_',
  segmentSuffix: '_1x1',
  variants: ['a1', 'c1'],
  rotateForVertical: true,
  cornerTiles: null,
},
```

- [ ] **Step 2: Route dungeon themes to dungeonBuilder in areaBuilder**

In `src/lib/areaBuilder.js`, at the top of `buildAreaFromBrief`, add a theme check:

```js
import { buildDungeonArea } from './dungeonBuilder.js'

const DUNGEON_THEMES = new Set(['dungeon', 'cave', 'crypt', 'sewer'])

export function buildAreaFromBrief(brief, seed = Date.now()) {
  // Route dungeon themes to specialized builder
  if (brief.dungeonConfig || DUNGEON_THEMES.has(brief.theme)) {
    return buildDungeonArea(brief, seed)
  }
  // ... existing village/town pipeline continues below ...
}
```

- [ ] **Step 3: Add dungeon theme terrain tiles**

In `src/lib/areaBuilder.js`, add `crypt` and `sewer` entries to `THEME_TERRAIN` and `THEME_ROAD`:

```js
export const THEME_TERRAIN = {
  // ... existing entries ...
  crypt: ['atlas-floors:brick_floor_03_d1', 'atlas-floors:brick_floor_03_d2'],
  sewer: ['atlas-floors:brick_floor_04_d1', 'atlas-floors:brick_floor_04_d2'],
}

export const THEME_ROAD = {
  // ... existing entries ...
  crypt: 'atlas-floors:brick_floor_03_d1',
  sewer: 'atlas-floors:brick_floor_04_d1',
}
```

- [ ] **Step 4: Test with a dungeon brief**

Add a temporary test in `src/data/demoArea.js` or use `?testarea` with a dungeon theme brief. Verify rooms, corridors, and wall edges render.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All existing + new tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/areaBuilder.js src/lib/wallAutotile.js
git commit -m "feat: wire dungeon builder into area pipeline + crypt/sewer themes"
```

---

## Final: Update Status

### Task 16: Update Project Status

**Files:**
- Modify: `tasks/status.md`

- [ ] **Step 1: Move completed Phase 8 items out of backlog**

Update `tasks/status.md` to reflect completed features. Move items from the Phase 8 backlog into a completed Phase 8 section with `[x]` checkboxes.

- [ ] **Step 2: Commit**

```bash
git add tasks/status.md
git commit -m "docs: update status — Phase 8 features complete"
```
