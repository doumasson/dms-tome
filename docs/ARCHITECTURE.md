# DungeonMind — Architecture & Product Vision

## Branding Rules
- Product name: DungeonMind
- The AI: "The Narrator" (never "Dungeon Master" or "DM")
- Rules system: "SRD 5.1 rules" (never "D&D" or "Dungeons & Dragons")

---

## Core Concepts

### Campaign
- One campaign = one world, one party, one story
- One campaign owns exactly one Narrator AI agent
- Campaigns persist for weeks or months

### The Narrator (AI)
- One persistent AI brain per campaign
- Never resets between sessions
- All players share the same Narrator
- Player count does not affect AI cost

### Session
- Temporary interaction window
- Can end and resume
- Multiple sessions per campaign lifetime

### Players
- 1-6 players per campaign
- No separate AI instances per player

---

## Memory Model

### Layer 1: Canonical Campaign State
Stored in Supabase. Never summarized away. Source of truth.
- Party members, classes, stats, HP, spell slots, conditions
- Inventory, gold, time, location, quests, NPC relationships

### Layer 2: Narrative Memory
Compressed text summaries in Supabase.
- Summarize every 20 turns or at session end
- Replace raw transcripts with summaries
- Keep under 2 pages per summary

### Layer 3: Session Buffer
Live context only, discarded when session ends.
- Last 20 turns maximum
- Current scene and combat state

### Session Resume Flow
1. System prompt (Narrator persona)
2. Canonical campaign state (Supabase)
3. Narrative summary (Supabase)
4. Last scene recap

---

## AI Model Routing
- Claude Haiku: ALL live gameplay turns
- Claude Sonnet: world/campaign generation only

## Token Efficiency
- Session buffer max 20 turns then summarize
- Pass only relevant state per turn
- Never pass full campaign history every turn
- Short focused system prompts

---

## Layout

### Desktop
- Top 80%: scene map (full bleed, dominant)
- Bottom 20%: narrator bar (collapsed default)
- Narrator bar expands to 40% max when active
- Map never below 60%

### Mobile (landscape only)
- Same 80/20 split
- Landscape lock enforced
- All tap targets minimum 44x44px
- Action buttons above narrator bar, thumb-reachable
- No hover states, use active/tap states

---

## Asset Strategy
- CSS placeholders now, real art later
- Backgrounds: #1a1a1a, #2a2a1a
- Gold accents: #d4af37
- Danger/enemy: #8b0000
- Text: #e8d5a3
- Real assets go in public/ui/ when ready

---

## Commercial Pricing
- $6-10/month per campaign
- Unlimited players
- Per campaign not per player
- Guardrails not metering

---

## Build Order and Quality Standards

### COMPLETION RULES — NON NEGOTIABLE
1. A screen is ONLY complete when a real .jsx or .js file exists in src/
2. You CANNOT mark anything done by editing markdown
3. Every component must be wired to real logic — no mock data
4. Every screen must call real functions from src/lib/
5. One task per iteration maximum
6. Report exact filename when done

### COMPLETION REPORT FORMAT — use this exactly
BUILT: src/path/to/Component.jsx
WIRED TO: src/lib/whateverLogic.js
BUILD: PASS
COMMITTED: yes

---

## Phase 1 — Core Screens (build if missing)
Check src/ for each file. If it exists, skip to Phase 2.

1. src/components/game/GameLayout.jsx
   - 80/20 split, narrator bar collapses and expands
   - Landscape lock, dark background, gold accents
   - Mobile touch friendly

2. src/components/game/HUD.jsx
   - HP bar, AC badge, spell slot pips, condition icons
   - Top-left of map area, always visible during play

3. src/components/game/NarratorBar.jsx
   - Collapsed 20%, expands to 40%
   - Text input, push to talk, message scroll

4. src/components/game/PreCombatMenu.jsx
   - Sneak / Talk / Pickpocket / Ambush / Charge
   - Appears on map near enemies

5. src/components/game/CombatUI.jsx
   - Turn order, action buttons, movement indicator
   - End turn button, real initiative order

6. src/components/game/SpellTargeting.jsx
   - SVG cone/line/sphere overlays on map
   - Confirms before casting

7. src/components/game/NPCDialogue.jsx
   - Portrait, dialogue text, skill check prompts
   - Faction reputation indicator

8. src/components/game/Inventory.jsx
   - Item grid, equipment slots, gold display
   - Tooltips, use/equip/drop

9. src/components/game/SessionResume.jsx
   - Loads all three memory layers
   - Shows last scene recap

10. src/components/character/RaceSelect.jsx
    - All SRD 5.1 races with descriptions
    - Dark fantasy card grid

11. src/components/character/ClassSelect.jsx
    - All 12 SRD 5.1 classes with abilities
    - Same card layout as race screen

12. src/components/character/AbilityScores.jsx
    - Standard array, point buy, roll options
    - Real SRD 5.1 rules

13. src/components/character/CharacterReview.jsx
    - Full character summary before confirming

14. src/components/dashboard/Dashboard.jsx
    - Campaign list, create new, join by code

15. src/components/dashboard/CampaignLobby.jsx
    - Waiting room, invite code, player list

---

## Phase 2 — Wire Screens to Real Logic
For each screen above, verify it calls real src/lib/ functions.
If it uses mock data or hardcoded strings, fix it.

16. Wire GameLayout to real Supabase session
    - Load campaign state on mount
    - Show real player data from Zustand store

17. Wire HUD to real character state
    - Real HP, AC, spell slots from Zustand
    - Conditions update in real time via Supabase Realtime

18. Wire NarratorBar to Claude Haiku API
    - Input sends to narratorApi.js
    - Response streams to narrator display
    - Uses session context from sessionContext.js

19. Wire CombatUI to real combat engine
    - Actions call src/lib/combat.js
    - Initiative from real rolls
    - End turn advances real turn order
    - Broadcasts via broadcastEncounterAction

20. Wire PreCombatMenu to stealth/perception system
    - Sneak triggers real Stealth vs Perception check
    - Pickpocket triggers Sleight of Hand check
    - Results affect real game state and broadcast

21. Wire NPCDialogue to narrator API and faction system
    - Dialogue calls narratorApi with full NPC context
    - Faction reputation affects available options
    - Skill checks use real dice rolls from src/lib/

22. Wire Inventory to real item system
    - Real items from character Zustand state
    - Equip/drop mutates store
    - Gold from real campaign state

23. Wire CharacterCreation to Supabase
    - Completed character saves to Supabase characters table
    - Redirects to campaign lobby on completion

24. Wire SpellTargeting to real spell system
    - Spell shapes from SRD 5.1 spell data
    - Targets from real token positions on PixiJS map
    - Casting consumes real spell slots from store

25. Wire SessionResume to Supabase state loader
    - Loads all three memory layers in correct order
    - Shows real last scene from narrative summary table

26. Wire Dashboard to real Supabase campaigns
    - Lists real campaigns from database
    - Create campaign writes to Supabase
    - Join by invite code queries campaigns table

27. Wire CampaignLobby to Supabase Realtime
    - Player list updates via Realtime broadcast
    - Host starts session when ready
    - Invite code share functionality

---

## Phase 3 — New Systems (build these if not in src/lib/)

28. src/lib/worldGenerator.js
    - Procedural campaign map from src/data/chunks/
    - Places NPCs with faction affiliations
    - Creates starting quest hooks
    - Generates dungeon layouts, town layouts, wilderness

29. src/lib/narrativeSummary.js
    - Summarizes session turns every 20 turns
    - Saves summary to Supabase narrative_summaries table
    - Replaces raw transcript to keep context small
    - Called automatically by session context manager

30. src/lib/sessionContext.js
    - Enforces max 20 turn session buffer
    - Builds context package for each narrator turn
    - Assembles: system prompt + canonical state + summary + buffer
    - Routes to Haiku for gameplay, Sonnet for generation

31. src/lib/deathSaves.js
    - Tracks death save successes and failures
    - Broadcasts death save results to all players
    - Handles stabilization and death outcomes
    - Integrates with HUD condition display

32. src/lib/levelUp.js
    - Triggers on XP threshold per SRD 5.1 tables
    - Presents level up choices to player
    - Applies stat increases, new abilities, new spells
    - Saves updated character to Supabase

33. src/components/game/LevelUpPanel.jsx
    - Level up notification overlay
    - Stat increase selection UI
    - New ability and spell selection
    - Confirms and saves

34. src/lib/trapSystem.js
    - Trap detection via Perception checks
    - Disarm via Thieves Tools and Dexterity
    - Trap trigger consequences
    - Broadcasts trap events to all players

35. src/lib/lockpickSystem.js
    - Lock difficulty classes (DC 10-25)
    - Thieves Tools proficiency check
    - Success/failure consequences
    - Integrates with exploration UI

36. src/components/game/ExplorationActions.jsx
    - Search room button and result display
    - Lockpick attempt UI
    - Trap detection and disarm UI
    - Connects to trapSystem.js and lockpickSystem.js

---

## Phase 4 — Improvements and Polish

For each existing component and lib file, review and improve:

37. Review ALL src/lib/ files
    - Find any function that returns mock data
    - Replace with real logic
    - Find any TODO or placeholder comments
    - Implement them

38. Review ALL src/components/ files
    - Find any hardcoded strings
    - Find any missing mobile styles
    - Find any missing touch targets under 44px
    - Find any "Dungeon Master" references still in code
    - Fix all of the above

39. Review PixiJS rendering in src/engine/
    - Token movement should be smooth and animated
    - Detection zones should pulse visually
    - Spell targeting overlays should be clear
    - Fog of war should update correctly
    - All engine code should handle multiplayer state

40. Review Supabase integration
    - Every state change that needs to persist must save
    - Every multiplayer event must broadcast
    - Session resume must reliably restore full state
    - No state that lives only in one client

41. Review narrator API integration
    - System prompts are short and focused
    - Context packages are lean (max 20 turns)
    - Haiku used for all live turns
    - Responses stream to UI smoothly
    - Error handling when API is slow or fails

42. Full multiplayer audit
    - Play through a session as two players mentally
    - Every action one player takes must appear for the other
    - Combat turns must be enforced — only active player can act
    - Narrator responses must appear for all players simultaneously

43. Mobile audit
    - Every screen works in landscape on a 375px wide phone
    - All buttons are 44x44px minimum
    - No text is smaller than 14px
    - Narrator bar slide gesture works on touch
    - Map is pannable and zoomable via pinch

44. Performance audit
    - PixiJS render loop is not leaking memory
    - Supabase subscriptions are cleaned up on unmount
    - No unnecessary re-renders in React components
    - Build output is under 5MB total

45. Final integration test
    - New user can log in
    - Create a campaign
    - Create a character
    - Join from a second browser tab
    - Start a session
    - Move on the map
    - Trigger pre-combat
    - Enter combat
    - Cast a spell
    - End combat
    - Resume session after closing browser
    All of the above must work end to end.
