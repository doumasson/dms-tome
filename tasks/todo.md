# DM's Tome — Full Fix + Demo Campaign

## Confirmed findings
- ActionPanel.jsx already has all 12 class-specific action definitions (complete)
- Scene image caching already persists to Supabase `settings.sceneImageUrls` (complete)
- Images restored on campaign load (complete)
- Main gaps are below

---

## Implementation Plan

### HIGH — Bugs breaking gameplay

- [ ] **1. Combat narration** — After player resolves attack/spell, call Claude Haiku with a tight prompt to narrate the action in 1-2 sentences. Add `narrateCombatAction(actor, target, result, apiKey)` to store. Call from CombatPhase `handleAttackResolve` and `handleSpellConfirm`. Broadcast result to all players via `broadcastNarratorMessage`.

- [ ] **2. Prone auto-clear on move** — In CombatPhase `handleCellClick`, after logging "stands up from Prone", also call `onRemoveCondition(selectedToken, 'Prone')`.

- [ ] **3. Enemy movement cost deduction** — In `runEnemyTurn` (useStore.js), when AI returns `moveToPosition`, compute Chebyshev distance from current to new position and call `moveToken(id, x, y, cost)` so `remainingMove` decrements.

### MEDIUM — Notable gaps

- [ ] **4. Scene token positions persist** — On `broadcastSceneTokenMove` + local move in ScenePanel, also save to `campaigns.settings.sceneTokenPositions[{campaignId}:{memberId}]` via a debounced Supabase upsert. On campaign load, restore positions into `sceneTokenPositions` store state.

- [ ] **5. Fog reveal state to joining players** — Include `fogRevealed` and `fogEnabled` in the existing `encounter-sync` heartbeat payload. Non-DM clients already apply encounter-sync; add a handler to also apply fog state from it.

- [ ] **6. Auto-fill starting spells at character creation** — Add `STARTER_SPELLS` map (class → level 1 known spells) in charBuilder.js. Apply in CharacterCreate `handleConfirm` so spellcasters have 2-3 real spells from day one.

### LOW — Polish

- [ ] **7. Error boundary** — New `ErrorBoundary.jsx` component, wrap `<App />` in `main.jsx`. Shows a dark-themed "Something went wrong — refresh to continue" screen.

- [ ] **8. Better image gen retries** — In `dalleApi.js` `generateSceneImageFree`, increase to 3 attempts with exponential backoff (4s, 8s). Try `flux` model first (better quality), `turbo` as fallback.

### NEW — Demo campaign + image pre-caching

- [ ] **9. Demo one-shot campaign** — Build `src/data/demoCampaign.js` — a complete 4-hour "Whispers in the Dark" one-shot: 6 scenes (village → road ambush → forest → crypt entrance → vault → epilogue), full enemy stats for each encounter scene, DM notes per scene. Bake deterministic Pollinations image URLs into each scene (`imageUrl` field) so they load instantly.

- [ ] **10. "Try Demo" on campaign select** — Add a "Try the Demo Adventure" card to `CampaignSelect.jsx` that imports the demo campaign directly (calls `loadCampaign` + `preGenerateSceneImages`) without needing the JSON paste flow.

- [ ] **11. Image pre-caching on campaign import** — In the campaign import flow (CreateCampaign.jsx or wherever JSON is imported), call `preGenerateSceneImages` immediately after import and save URLs to Supabase. Already partially done — verify it's called on all import paths.

---

## File touch list
- `src/store/useStore.js` — narrateCombatAction, enemy movement fix
- `src/components/combat/CombatPhase.jsx` — Prone fix, wire narration
- `src/lib/dalleApi.js` — retry improvements
- `src/lib/charBuilder.js` — STARTER_SPELLS
- `src/components/ScenePanel.jsx` — token position persistence
- `src/components/CampaignSelect.jsx` — demo button
- `src/components/CreateCampaign.jsx` — verify preGenerate call
- `src/data/demoCampaign.js` — new file
- `src/ErrorBoundary.jsx` — new file
- `src/main.jsx` — wrap with ErrorBoundary
