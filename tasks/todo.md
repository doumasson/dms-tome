# Active Work — Agent Priority Queue

> **RULES FOR MARKING ITEMS DONE:**
> - You can ONLY check off an item if you WROTE CODE in this iteration to fix/build it
> - Reading a file and deciding "it looks fine" is NOT done — find a real issue and fix it
> - If it's a flow (creation, combat, rest): trace the code path, find a real bug, fix it
> - ONE item per iteration. ONE commit. Do not batch-check items.
> - **DO NOT WRITE TESTS.** Every iteration = game code, assets, or bug fixes.

## DESIGN RULES — EVERY UI COMPONENT MUST FOLLOW THESE
- Dark fantasy theme: Baldur's Gate 2 / Icewind Dale inspired
- Gold accents (#c9a84c / #d4af37), deep brown/black backgrounds (#1a1006, #0d0a04)
- Ornate borders, stone/metal textures via CSS (gradients, box-shadows)
- SVG filigree and decorative elements where appropriate
- All text uses fantasy fonts (Cinzel for headers, serif for body)
- Mobile-first: all touch targets minimum 44x44px, works in landscape
- No white backgrounds, no flat/modern UI, no default browser styles
- These are PLACEHOLDER styles — mark with `/* PLACEHOLDER ART: needs real assets */`

## Priority 1: Functional Testing — TRACE EACH FLOW IN CODE, FIND BUGS, FIX THEM
> Do NOT rubber-stamp these. Read the actual code. Find a real bug. Fix it.

- [ ] Campaign creation: read CreateCampaign.jsx. Trace every step. Does AI generation use the platform default API key? Does it save to Supabase? Does it redirect to the new campaign? Find and fix a real issue.
- [ ] Character creation: read the CharacterCreate flow. Race → class → abilities → spells → identity. Does each step save correctly? Can you enter the game with the new character? Find and fix a real issue.
- [ ] Combat flow: read useCombatActions, encounterSlice, enemyAi. What happens when player walks near enemies? Does encounter trigger? Initiative? Turns? Enemy AI? Find and fix a real issue.
- [ ] Rest system: read RestModal. Does short rest heal with hit dice? Long rest restore spell slots? Find and fix a real issue.
- [ ] Death saves: read what happens at 0 HP. Does UI appear? Do saves track? Does healing revive? Find and fix a real issue.
- [ ] NPC interaction: read interactionController, NpcConversation. Does walking near NPC trigger dialog? Does AI respond? Skill checks work? Find and fix a real issue.
- [ ] Inventory/equipment: read CharacterSheet. Can you equip? Does AC update? Drag-and-drop? Find and fix a real issue.
- [ ] Level up: read LevelUpModal. XP threshold triggers it? Can you pick features/spells? Find and fix a real issue.

## Priority 2: Old UI Audit — READ EACH FILE, FIX STYLING
> One file per iteration. Actually read the JSX. Fix what's wrong.

- [ ] src/components/NarratorPanel.jsx — is chat styled dark fantasy? Readable? Gold accents?
- [ ] src/components/NpcConversation.jsx — dialog box ornate? Skill check UI styled?
- [ ] src/components/CharacterSheet.jsx — two-pane polished? Equipment slots styled?
- [ ] src/components/game/LootScreen.jsx — post-combat loot UI themed?
- [ ] src/components/game/GameOverModal.jsx — defeat screen styled?
- [ ] src/hud/BottomBar.jsx — main HUD bar ornate and consistent?
- [ ] src/hud/CombatActionBar.jsx — action buttons styled? Touch-friendly?
- [ ] src/components/game/ShopPanel.jsx — merchant UI polished?
- [ ] src/components/game/RestModal.jsx — rest UI themed?
- [ ] src/components/LoginPage.jsx — login screen dark fantasy?
- [ ] src/components/CampaignSelect.jsx — campaign cards ornate?

## Priority 3: Integration Verification — CHECK REAL DATA
- [ ] CraftingPanel — real inventory items or hardcoded?
- [ ] EmoteSystem — actually broadcasts via Supabase?
- [ ] PingSystem — actually broadcasts via Supabase?
- [ ] AutoSave — actually calls saveCampaignToSupabase?
- [ ] Bestiary — actually logs monsters during gameplay?
- [ ] Quest tracker — reads real quest data from store?

## Priority 4: Mobile & Responsive
- [ ] All panels work at 375px landscape viewport
- [ ] All buttons 44px+ tap targets
- [ ] Modals use BottomSheet pattern on mobile

## Priority 5: Asset Report
- [ ] Generate `tasks/asset-report.md` — full production art checklist
