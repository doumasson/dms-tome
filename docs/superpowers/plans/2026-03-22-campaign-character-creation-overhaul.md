# Campaign & Character Creation Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streamline campaign creation to 3 steps (no JSON, no manual API key), fix character creation UX issues (tooltips, stats, equipment, HP logic).

**Architecture:** Campaign wizard collapses from 6 steps to 3 — Name/Tone → Details → Auto-Generate. API key comes from Supabase `app_config` table (already wired). Character creation gets targeted fixes to 4 sub-components without full rewrite.

**Tech Stack:** React, Zustand, Supabase, Claude API (claude-haiku-4-5-20251001)

---

## File Structure

### Campaign Creation
- **Modify:** `src/components/CreateCampaign.jsx` — Rewrite wizard to 3 steps + auto-generate
- **Modify:** `src/lib/claudeApi.js` — Add `getDefaultApiKey()` integration for generation
- **Modify:** `src/lib/defaultApiKey.js` — Already exists, used for API key retrieval

### Character Creation
- **Modify:** `src/components/characterCreate/StepRace.jsx` — Move detail panel to top
- **Modify:** `src/components/characterCreate/StepAbilities.jsx` — Primary stat highlights, 1 reroll limit
- **Modify:** `src/components/characterCreate/StepIdentity.jsx` — Alignment cursor tooltips
- **Modify:** `src/components/characterCreate/StepGear.jsx` — Merge gold tab, fix "if proficient", single armor choice
- **Modify:** `src/components/CharacterCreate.jsx` — Fix HP calculation (max hit die at level 1)
- **Modify:** `src/data/classes.js` — Add primaryStats field per class

---

## Part A: Campaign Creation Overhaul

### Task 1: Collapse wizard to 3 steps — Step 1 (Name + Tone + Setting)

**Files:**
- Modify: `src/components/CreateCampaign.jsx:474-565`

- [ ] **Step 1: Rewrite Step 1 to combine Name, Tone, and Setting**

Remove the DM type selector entirely (AI DM is always true). Keep demo campaign card. Merge tone and setting selectors from old Step 2 into Step 1.

```jsx
// Step 1: Name + Tone + Setting (replaces old steps 1 and 2)
// - Demo campaign quick-start card (keep as-is)
// - Campaign name input
// - Tone selector (6 options, pill buttons)
// - Setting selector (7 options, pill buttons)
// - Next button
```

In the step handler, always set `isAiDm: true`. Remove the human DM card entirely.

- [ ] **Step 2: Verify Step 1 renders correctly**

Run: `npx vite build` — no errors.
Load the create campaign page locally and verify Name + Tone + Setting all appear on one screen.

- [ ] **Step 3: Commit**

```bash
git add src/components/CreateCampaign.jsx
git commit -m "feat: collapse campaign wizard step 1 — name + tone + setting combined"
```

### Task 2: Collapse wizard — Step 2 (Details)

**Files:**
- Modify: `src/components/CreateCampaign.jsx:568-609`

- [ ] **Step 1: Keep Campaign Details as Step 2, renumber**

Move old Step 3 (Campaign Details) to be Step 2. Keep all fields: length, players, level, villain, themes. Change "Generate Prompt →" to "Create Campaign →".

- [ ] **Step 2: Commit**

```bash
git add src/components/CreateCampaign.jsx
git commit -m "feat: campaign wizard step 2 — details with create button"
```

### Task 3: Auto-generate campaign (replaces Steps 4-5)

**Files:**
- Modify: `src/components/CreateCampaign.jsx:612-687`
- Modify: `src/lib/claudeApi.js`

- [ ] **Step 1: Replace Steps 4 and 5 with auto-generation step**

When user clicks "Create Campaign →" on Step 2:
1. Show a loading screen (Step 3) with "Forging your world..." spinner
2. Load API key via `loadDefaultApiKey()` from Supabase
3. Call `generateCampaignJSON(prompt, apiKey)` automatically
4. Parse and validate the JSON
5. If success → save to Supabase → advance to success screen
6. If fail → show error with retry button

Remove: JSON paste textarea, file upload, manual prompt copy, "Add Claude API Key" button.

Add BYOK fallback: if no default key found, show a small input: "No platform key configured. Enter your Claude API key to continue:" with a text field. This key gets saved to the campaign settings for future use.

```jsx
// Step 3: Generating... (auto, no user interaction needed)
// Shows: animated spinner, "Forging your world..." text
// On success: advances to Step 4 (success)
// On failure: shows error + "Try Again" button + BYOK input
```

- [ ] **Step 2: Update claudeApi.js to accept key from any source**

Modify `generateCampaignJSON` to accept the key parameter directly (already does). No changes needed to the function signature.

- [ ] **Step 3: Wire loadDefaultApiKey into the generation flow**

```javascript
import { loadDefaultApiKey } from '../lib/defaultApiKey'

async function handleGenerate() {
  setStep(3) // show loading
  try {
    let apiKey = await loadDefaultApiKey()
    if (!apiKey) {
      // Show BYOK input, wait for user
      return
    }
    const prompt = generatePrompt(fields)
    const raw = await generateCampaignJSON(prompt, apiKey)
    const cleaned = cleanJsonText(raw)
    const validation = validateCampaignJson(cleaned)
    if (!validation.ok) throw new Error(validation.error)
    // Save to Supabase and advance
    await handleCreate(validation.data)
  } catch (e) {
    setGenerateError(e.message)
  }
}
```

- [ ] **Step 4: Update success screen to be Step 4 (was Step 6)**

Keep invite link display, "Enter Campaign →" button.

- [ ] **Step 5: Remove dead step state (old steps 4, 5, 6 → new steps 3, 4)**

Update step counter dots, step validation, back button logic. Total steps: 4 (Name+Tone → Details → Generating → Success).

- [ ] **Step 6: Verify full flow**

Run: `npx vite build`
Test: Create campaign → fills in name/tone → fills details → auto-generates → shows success.

- [ ] **Step 7: Commit**

```bash
git add src/components/CreateCampaign.jsx src/lib/claudeApi.js
git commit -m "feat: auto-generate campaign — no JSON paste, no manual API key"
```

---

## Part B: Character Creation Fixes

### Task 4: Race tooltip — move detail panel to top

**Files:**
- Modify: `src/components/characterCreate/StepRace.jsx:86-107`

- [ ] **Step 1: Move detail panel above the race grid**

Currently the detail panel renders below the race cards (line 86+). Move it above the grid so it's always visible at the top of the step. Use `position: sticky; top: 0` if scrolling is needed.

```jsx
// Current order: <RaceGrid> then <DetailPanel>
// New order: <DetailPanel> then <RaceGrid>
// DetailPanel gets min-height so it doesn't jump when empty
```

- [ ] **Step 2: Add min-height to detail panel for stable layout**

```jsx
<div style={{ minHeight: 120, padding: '12px 16px', background: 'rgba(20,16,10,0.6)', border: '1px solid rgba(201,168,76,0.15)', marginBottom: 12 }}>
  {preview ? <RaceDetails race={preview} /> : <p style={{ color: '#665a3a' }}>Hover or select a race to see details</p>}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/characterCreate/StepRace.jsx
git commit -m "fix: race tooltip panel at top of step, always visible"
```

### Task 5: Stat selection — highlight primary stats per class

**Files:**
- Modify: `src/data/classes.js` — Add `primaryStats` and `secondaryStats` per class
- Modify: `src/components/characterCreate/StepAbilities.jsx`

- [ ] **Step 1: Add primaryStats to each class in classes.js**

```javascript
// Add to each class object:
Fighter: { ..., primaryStats: ['str'], secondaryStats: ['con'] },
Paladin: { ..., primaryStats: ['str', 'cha'], secondaryStats: ['con'] },
Ranger: { ..., primaryStats: ['dex'], secondaryStats: ['wis'] },
Rogue: { ..., primaryStats: ['dex'], secondaryStats: ['con', 'int'] },
Cleric: { ..., primaryStats: ['wis'], secondaryStats: ['str', 'con'] },
Wizard: { ..., primaryStats: ['int'], secondaryStats: ['con'] },
Sorcerer: { ..., primaryStats: ['cha'], secondaryStats: ['con'] },
Warlock: { ..., primaryStats: ['cha'], secondaryStats: ['con'] },
Bard: { ..., primaryStats: ['cha'], secondaryStats: ['dex'] },
Druid: { ..., primaryStats: ['wis'], secondaryStats: ['con'] },
Barbarian: { ..., primaryStats: ['str'], secondaryStats: ['con'] },
Monk: { ..., primaryStats: ['dex', 'wis'], secondaryStats: ['con'] },
```

- [ ] **Step 2: Add visual indicators to stat blocks in StepAbilities**

Pass `cls` prop to StepAbilities. In the stat grid, add gold border for primary stats, silver for secondary:

```jsx
const isPrimary = clsData?.primaryStats?.includes(statKey)
const isSecondary = clsData?.secondaryStats?.includes(statKey)
// Gold glow border for primary, subtle silver for secondary
const borderColor = isPrimary ? 'rgba(201,168,76,0.6)' : isSecondary ? 'rgba(160,160,180,0.3)' : 'rgba(201,168,76,0.15)'
// Add label: "★ PRIMARY" or "◆ SECONDARY" below stat name
```

- [ ] **Step 3: Commit**

```bash
git add src/data/classes.js src/components/characterCreate/StepAbilities.jsx
git commit -m "feat: highlight primary/secondary stats per class in ability selection"
```

### Task 6: Limit stat rerolls to 1

**Files:**
- Modify: `src/components/characterCreate/StepAbilities.jsx`

- [ ] **Step 1: Add reroll counter state**

```jsx
const [rerollsUsed, setRerollsUsed] = useState(0)
const MAX_REROLLS = 1
```

- [ ] **Step 2: Disable reroll button after 1 use**

```jsx
<button
  disabled={rerollsUsed >= MAX_REROLLS}
  onClick={() => { handleReroll(); setRerollsUsed(r => r + 1) }}
>
  {rerollsUsed >= MAX_REROLLS ? 'No Rerolls Left' : `Re-roll (${MAX_REROLLS - rerollsUsed} left)`}
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/characterCreate/StepAbilities.jsx
git commit -m "feat: limit stat rerolls to 1"
```

### Task 7: Alignment cursor tooltips

**Files:**
- Modify: `src/components/characterCreate/StepIdentity.jsx`

- [ ] **Step 1: Add alignment descriptions**

```javascript
const ALIGNMENT_TIPS = {
  'Lawful Good': 'Follows a code of honor and acts for the greater good.',
  'Neutral Good': 'Does the best they can without bias toward law or chaos.',
  'Chaotic Good': 'Acts on conscience, with little regard for rules.',
  'Lawful Neutral': 'Acts in accordance with law, tradition, or personal code.',
  'True Neutral': 'Acts without prejudice or compulsion.',
  'Chaotic Neutral': 'Follows their whims above all else.',
  'Lawful Evil': 'Methodically takes what they want within a code of conduct.',
  'Neutral Evil': 'Does whatever they can get away with.',
  'Chaotic Evil': 'Acts with arbitrary violence, driven by greed and hate.',
}
```

- [ ] **Step 2: Add hover tooltip that follows cursor**

```jsx
const [tooltip, setTooltip] = useState(null)
const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

// On each alignment button:
onMouseMove={(e) => setTooltipPos({ x: e.clientX + 12, y: e.clientY - 30 })}
onMouseEnter={() => setTooltip(ALIGNMENT_TIPS[alignmentName])}
onMouseLeave={() => setTooltip(null)}

// Render tooltip:
{tooltip && (
  <div style={{ position: 'fixed', left: tooltipPos.x, top: tooltipPos.y, background: 'rgba(10,8,6,0.95)', border: '1px solid rgba(201,168,76,0.3)', padding: '6px 10px', color: '#bba878', fontSize: 11, maxWidth: 220, pointerEvents: 'none', zIndex: 1000 }}>
    {tooltip}
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/characterCreate/StepIdentity.jsx
git commit -m "feat: alignment cursor-following tooltips"
```

### Task 8: Equipment — merge gold tab, fix proficiency text, single armor choice

**Files:**
- Modify: `src/components/characterCreate/StepGear.jsx`

- [ ] **Step 1: Remove "if proficient" text from equipment options**

Search for `if proficient` or `(if proficient)` strings and remove them. The game engine handles proficiency — the character creation screen doesn't need to show this caveat.

- [ ] **Step 2: Merge gold roll into the same view**

Remove the tab toggle between "Class Starting Equipment" and "Roll for Gold". Show class equipment choices at top, with gold roll section at the bottom of the same view:

```jsx
// Single view:
// 1. Equipment choices (weapon A/B, armor A/B/C, pack A/B, etc.)
// 2. Divider
// 3. "Starting Gold" section with roll button and result
```

- [ ] **Step 3: Fix armor choice — force selection of ONE armor, not all**

The line `(a) Scale Mail, (b) Leather Armor, or (c) Chain Mail` currently gives all three. Parse this as a choice group and only equip the selected one:

```jsx
// If equipment string contains "(a)...(b)...(c)..."
// Render as a choice group, not fixed items
// Only add the chosen armor to inventory
```

- [ ] **Step 4: Commit**

```bash
git add src/components/characterCreate/StepGear.jsx
git commit -m "fix: equipment — single armor choice, remove proficiency text, merge gold"
```

### Task 9: Fix HP calculation — max hit die at level 1

**Files:**
- Modify: `src/lib/charBuilder.js`

- [ ] **Step 1: Verify calcHp uses max hit die at level 1**

Per 5e rules: Level 1 HP = max hit die + CON modifier. Check `calcHp()` in charBuilder.js. If it rolls randomly, change to use max value.

```javascript
// CORRECT: Level 1 = max hit die + CON mod
export function calcHp(classData, conMod, level = 1) {
  const hitDie = classData.hitDie
  // Level 1: always max
  let hp = hitDie + conMod
  // Additional levels: average (hitDie/2 + 1) + CON mod per level
  for (let i = 2; i <= level; i++) {
    hp += Math.floor(hitDie / 2) + 1 + conMod
  }
  return Math.max(1, hp)
}
```

- [ ] **Step 2: Verify in CharacterCreate.jsx that calcHp is called correctly**

Check line ~86 where HP is calculated. Ensure it passes level=1 and gets max hit die.

- [ ] **Step 3: Commit**

```bash
git add src/lib/charBuilder.js src/components/CharacterCreate.jsx
git commit -m "fix: HP calculation — max hit die at level 1 per 5e rules"
```

---

## Verification

### Task 10: Full flow test

- [ ] **Step 1: Build and verify no errors**

```bash
npx vite build
```

- [ ] **Step 2: Test campaign creation flow**

1. Click "Create Campaign"
2. Enter name, select tone, select setting → Next
3. Fill details → "Create Campaign"
4. Watch auto-generation spinner
5. See success screen with invite code
6. Click "Enter Campaign"

- [ ] **Step 3: Test character creation flow**

1. Select race — verify tooltip at top
2. Select class
3. Select background
4. Abilities — verify primary stats highlighted, reroll limited to 1
5. Identity — verify alignment tooltips follow cursor
6. Gear — verify single armor choice, gold at bottom, no "if proficient"
7. Finish — verify HP is max hit die + CON

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: campaign + character creation overhaul complete"
git push
```
