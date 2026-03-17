# UI Redesign — Foundry-style Game Layout + DALL-E Scene Images

## Goal
Replace the clunky tab-based UI with a sleek game layout:
- Left sidebar: party characters with HP bars, conditions, quick stats
- Center/main area: scene view (DALL-E image + text) OR battle grid during combat
- Bottom: AI Narrator panel (already built)
- Minimal top bar: campaign name + DM toggle only
- DALL-E 3 generates a mood image for each scene automatically

---

## Layout Target

```
┌─ header: campaign name + DM toggle ─────────────────┐
├──────────┬──────────────────────────────────────────┤
│ PARTY    │  [DALL-E scene image - 40% height]       │
│ sidebar  ├──────────────────────────────────────────┤
│ 260px    │  Scene title                             │
│          │  Scene narrative text...                 │
│ [Thorin] │                                          │
│ ❤ 45/60  │  [DM: ◀ Prev] [Next ▶] [⚔ Combat]      │
│ ──────── │                                          │
│ [Lyra]   │  during combat: battle grid fills        │
│ ❤ 32/40  │  this entire area                        │
│          │                                          │
│ [DM only]│                                          │
│ + dice   │                                          │
├──────────┴──────────────────────────────────────────┤
│ 🎭 AI Narrator                             [Send]   │
└─────────────────────────────────────────────────────┘
```

---

## Files to Create
- `src/lib/dalleApi.js` — DALL-E 3 image generation + OpenAI key storage
- `src/components/GameLayout.jsx` — new main game view (sidebar + content area)
- `src/components/PartySidebar.jsx` — party panel with HP bars, conditions, dice
- `src/components/ScenePanel.jsx` — scene view with DALL-E image + narrative

## Files to Modify
- `src/App.jsx` — replace tab-based game view with GameLayout
- `src/components/ApiKeySettings.jsx` — add OpenAI key field for DALL-E
- `src/store/useStore.js` — add sceneImages cache { sceneKey: imageUrl }

---

## Implementation Steps

### Step 1: dalleApi.js + OpenAI key storage
- [ ] `getOpenAiKey(userId)` / `setOpenAiKey(userId, key)` in localStorage
- [ ] `generateSceneImage(title, text, key)` → calls DALL-E 3, returns URL
- [ ] Prompt: dramatic dark fantasy art style

### Step 2: sceneImages cache in store
- [ ] `sceneImages: {}` state in Zustand
- [ ] `setSceneImage(key, url)` action

### Step 3: ScenePanel.jsx
- [ ] Scene image (DALL-E, cached) at top — generates on first view
- [ ] Loading skeleton while generating
- [ ] Scene title + narrative text
- [ ] DM controls: ◀ Prev / Next ▶ / ⚔ Start Combat
- [ ] Graceful no-image fallback

### Step 4: PartySidebar.jsx
- [ ] Character cards: portrait, name, class, HP bar (color coded)
- [ ] Click to expand: AC, conditions, spell slots
- [ ] Conditions as colored badges
- [ ] DM-only section: Dice, Loot, Notes access
- [ ] Collapsible on mobile

### Step 5: GameLayout.jsx
- [ ] Sidebar (260px) + main area (flex 1)
- [ ] Main shows ScenePanel or EncounterView (when combat active)
- [ ] NarratorPanel at bottom
- [ ] Mobile: hamburger to reveal sidebar

### Step 6: Update App.jsx
- [ ] Replace tabs + renderTab() with GameLayout
- [ ] Simplify header

### Step 7: Update ApiKeySettings.jsx
- [ ] Add OpenAI key field

---

## Design Rules
- Match existing dark fantasy theme
- Sidebar: dark with gold right border
- HP bars: animated, red/yellow/green based on %
- Scene image: 35% of main height, object-fit cover
- Sharp edges on structural panels (fantasy feel)

---

## Review
_(filled after implementation)_
