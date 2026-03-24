# Active Work — Agent Priority Queue

> **RULES FOR MARKING ITEMS DONE:**
> - You can ONLY check off an item if you WROTE CODE to fix a real bug you found
> - Trace the code path. Find where it breaks. Fix it. One bug per iteration.
> - ONE item per iteration. ONE commit.
> - **DO NOT WRITE TESTS.** Fix real game code only.

## DESIGN RULES — EVERY SCREEN MUST FOLLOW THESE
- Dark fantasy: BG2 / Icewind Dale inspired
- Gold accents (#c9a84c), deep brown/black backgrounds (#1a1006)
- Ornate borders, stone/metal CSS textures, SVG filigree
- Cinzel for headers, serif for body, fantasy fonts only
- Mobile-first: 44px+ touch targets, landscape orientation
- No white backgrounds, no flat/modern UI
- Mark placeholder art: `/* PLACEHOLDER ART: needs real assets */`

## Priority 1: SYSTEM-BY-SYSTEM FUNCTIONAL AUDIT
> For EACH system: trace the entire code path from trigger to completion.
> Find where it breaks, crashes, or behaves wrong. Fix the bug. Move on.
> These are the core gameplay loops — every one must work end to end.

### Campaign & Character Creation
- [x] Campaign creation end-to-end: CreateCampaign.jsx → each wizard step → AI generation (must use platform default API key from app_config, NOT require BYOK) → save to Supabase → redirect to new campaign. Find and fix a real bug.
- [x] Character creation end-to-end: race select → class select → ability scores (standard array, point buy, 4d6 drop lowest) → spell selection for casters → background/identity → save to Supabase → enter game with new character. Find and fix a real bug.

### Combat System
- [x] Combat trigger: trace what happens when player token moves near enemies. encounterZones → AI narrator prompt → startEncounter. Does initiative roll correctly? Find and fix.
- [x] Melee attack: trace Attack button → target selection → hit/miss roll → damage calculation → HP update → floating damage number → enemy death at 0 HP. Find and fix.
- [x] Spell casting: trace Cast button → spell selection → AoE targeting overlay → save DCs → damage/healing resolution → spell slot consumption → concentration tracking. Find and fix.
- [x] Enemy AI turn: trace enemyAi.js → computeGruntAction/boss AI → pathfinding to player → attack resolution → damage broadcast to all clients. Find and fix.
- [x] Class abilities in combat: verify Extra Attack (Fighter), Sneak Attack (Rogue), Rage (Barbarian), Divine Smite (Paladin), Wild Shape (Druid) actually fire and calculate correctly. Find and fix.
- [x] Action economy: verify action/bonus action/movement tracking per turn. Can player use Dash? Dodge? Disengage? Does end turn advance properly? Find and fix.
- [x] Opportunity attacks: trace what happens when a token moves away from an enemy. Does the popup appear? Does disengage prevent it? Find and fix.
- [x] Death saves: trace HP hitting 0 → death save UI → success/failure tracking → stabilize → healing revival. Find and fix.

### Exploration & World
- [x] NPC interaction: walk near NPC → interaction hint → press E or click → NPC dialog opens → AI narrator voices the NPC in character → skill checks (Persuasion/Intimidation) → reputation change. Find and fix.
- [x] NPC quest offers: NPC can offer quests during dialog → quest appears in journal → objectives trackable → completion triggers reputation gain. Find and fix.
- [x] Area transitions: walk to exit → pre-generation of next area → fade transition → spawn at entry point in new area → area data loads correctly. Find and fix.
- [x] Trap detection: walk over trapped tile → passive Perception check → trap triggers if failed → damage/condition applied → trap visually revealed. Find and fix.
- [x] Stealth/sneaking: Hide action → Stealth check → Hidden condition → approaching enemies undetected → surprise round if successful. Find and fix.

### Inventory & Equipment
- [ ] Inventory grid: open CharacterSheet → inventory shows items with spatial grid → drag-and-drop works → weight/encumbrance updates. Find and fix.
- [ ] Equipment: equip weapon → AC/attack bonus updates in derived stats → unequip reflects correctly. Find and fix.
- [ ] Item use in combat: Use Item action → consumable picker → healing potion heals → item consumed from inventory → broadcast to other players. Find and fix.
- [ ] Loot: defeat enemies → LootScreen appears → gold split → item drops → roll-off for magic items → items added to inventory. Find and fix.
- [ ] Crafting: open CraftingPanel → materials from inventory shown → select recipe → skill check → item created and added to inventory. Find and fix.

### Progression & Economy
- [ ] Level up: trace XP threshold → LevelUpModal trigger → HP roll/average choice → new features → spell slot increase → cantrip/spell selection for casters. Find and fix.
- [ ] Rest system: short rest → hit dice spending → HP recovery. Long rest → full HP + spell slot restore + hit dice recovery. Dungeon blocks long rest. Find and fix.
- [ ] Shop/merchant: open shop → browse items → buy (gold deducted) → sell at 50% → faction reputation affects prices → premium items for friendly factions. Find and fix.
- [ ] Gold persistence: verify gold survives combat rewards, purchases, and session reload. No race conditions on multi-player gold split. Find and fix.

### Multiplayer & Sync
- [ ] Token movement broadcast: one player moves → all other players see the token move smoothly. Find and fix.
- [ ] Combat sync: DM client runs enemy AI → damage/conditions broadcast → all clients update HP bars and conditions simultaneously. Find and fix.
- [ ] Narrator sync: AI narrator message appears for ALL players at the same time, not just the host. Find and fix.

### Voice & Audio
- [ ] TTS narration: verify narrator messages are spoken aloud (OpenAI TTS → Pollinations fallback → Web Speech). Find and fix.
- [ ] Ambient audio: verify music plays for area themes, switches on combat, mute toggle works. Find and fix.

## Priority 2: UI AUDIT — ONE FILE PER ITERATION
> Read the file. Fix styling issues. Make it match the dark fantasy theme.

- [ ] NarratorPanel.jsx
- [ ] NpcConversation.jsx
- [ ] CharacterSheet.jsx
- [ ] LootScreen.jsx
- [ ] GameOverModal.jsx
- [ ] BottomBar.jsx (HUD)
- [ ] CombatActionBar.jsx
- [ ] ShopPanel.jsx
- [ ] RestModal.jsx
- [ ] LoginPage.jsx
- [ ] CampaignSelect.jsx

## Priority 3: Integration & Mobile
- [ ] Verify CraftingPanel reads real inventory
- [ ] Verify EmoteSystem/PingSystem broadcast via Supabase
- [ ] Verify AutoSave persists to Supabase
- [ ] All panels work at 375px landscape
- [ ] All buttons 44px+ tap targets

## Priority 4: Asset Report
- [ ] Generate `tasks/asset-report.md` — every sprite, texture, icon, sound needed for production
