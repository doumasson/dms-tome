# NPC Interaction System — Design Spec

> **Goal:** Replace auto-proximity NPC triggers with intentional player-driven interactions. Add chat bubbles, dedicated dialog UI, critical story cutscenes, story flag progression, a player journal, and campaign generator updates.

---

## 1. E-Key Universal Interaction

**E is the interact key for everything in the game.** NPCs, exits, doors, and future interactables.

### Interaction targets (by priority)
1. Adjacent NPC (within 1 tile) — opens NPC dialog or cutscene
2. Adjacent/on exit tile — triggers zone transition

### Mobile support
- **Tap on NPC token** — opens dialog (existing click detection)
- **Tap on exit** — triggers zone transition (already works)
- **Interact button** — visible on-screen button (bottom-right, near HUD) for mobile users, equivalent to E key. Only appears when player is adjacent to an interactable.

### Implementation
- Single `handleInteract()` function checks what's adjacent, prioritizes NPCs over exits
- Replaces the current NPC proximity auto-trigger effect entirely (delete it)
- E key listener added alongside existing WASD handler
- Click-on-NPC detection added to PixiApp tile click handler

---

## 2. NPC Chat Bubbles

**Floating hint text above NPC tokens** when the player is within 3 tiles. Not a UI panel — rendered on the tilemap canvas or as an absolute-positioned HTML overlay above the token.

### Behavior
- Appears when player is within 3 tiles of an NPC
- Disappears when player moves away (> 4 tiles)
- Shows the NPC's current hint based on story flags (see Section 5)
- No NPC highlight/glow — just the text bubble
- Max ~60 characters visible, truncated with "..." if longer
- Subtle fade-in/out animation (200ms)

### Styling
- Small dark panel with gold border, slight transparency
- Cinzel font, 10px, gold text
- Positioned above the NPC token, centered
- Tail/arrow pointing down to the NPC

### Data
Each NPC has a `hints` array in the campaign JSON:
```json
{
  "name": "Greta",
  "role": "innkeeper",
  "personality": "gruff but kind, knows about forest disappearances",
  "critical": false,
  "sideQuest": "Greta's missing supply shipment from the eastern road",
  "hints": [
    { "after": null, "text": "The forest ain't safe no more..." },
    { "after": "talked_to_durnan", "text": "Durnan told you about the brackenwood?" },
    { "after": "cleared_brackenwood", "text": "The mayor's been asking about you." }
  ]
}
```

### Hint resolution
Walk `hints` array backward. Return the first entry whose `after` flag exists in the player's `storyFlags` set, or the `null` entry as default. Always shows something.

---

## 3. Normal NPC Dialog Box

**Dedicated overlay panel** for NPC conversations. Center-bottom, above the HUD bar.

### Layout
```
┌──────────────────────────────────────────────┐
│  ◆ GRETA — Innkeeper                    [✕] │
│  ────────────────────────────────────────     │
│                                              │
│  "What'll it be? Ale or answers?"            │
│                                              │
│  > Player: Tell me about the forest.         │
│                                              │
│  "The brackenwood's been swallowing folk     │
│   whole. Three gone this moon alone."        │
│                                              │
│  [input field / 🎤 voice]          [Send]    │
└──────────────────────────────────────────────┘
```

### Behavior
- **Opens on E/click** when adjacent to a non-critical NPC
- **NPC's current hint** shown as their opening line automatically (no API call)
- **Player can type or use voice** (Web Speech API push-to-talk, same as V1)
- **AI responds in character** — system prompt includes NPC name, personality, role, side quest context, and current story flags so it steers players toward relevant content
- **Player can't move** while dialog is open (initiating player only)
- **Other players can still move** — they see a small indicator that someone is talking to an NPC but don't see the conversation
- **Dismiss** with X button, Escape key, E key, or tap outside on mobile
- **Big tap targets** — input field, send button, close button all sized for touch

### Styling
- Dark panel background (`rgba(10,8,14,0.97)`)
- Gold border with SVG corner filigree (matching HUD pattern)
- NPC name in Cinzel Decorative gold, role in muted gold
- Conversation: NPC text in gold italic (left), player text in blue (right)
- Ornate divider line between header and conversation area
- Max width 520px, responsive down to 320px for mobile

### AI System Prompt Addition
```
You are voicing {npc.name}, a {npc.role}. Personality: {npc.personality}.
{npc.sideQuest ? `Side quest: ${npc.sideQuest}` : ''}
Stay in character. Guide the conversation toward information relevant to the campaign storyline.
Keep responses to 2-3 sentences. Be helpful but natural — don't info-dump.
Current story progress: {storyFlags as context}
```

---

## 4. Critical Story Cutscene

**Full-screen takeover** for story-critical NPC encounters.

### Trigger
- Player presses E or taps a `critical: true` NPC
- Only triggers if the NPC's story flag has NOT been set yet
- Once triggered and completed, the flag is set and the NPC reverts to normal dialog going forward

### Transition
1. Fade-to-black (reuse `playZoneTransition` effect)
2. Broadcast `story-cutscene-start` to all players — freezes all movement
3. Cutscene screen fades in

### Layout
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│          ◆ ─── A MOMENT OF FATE ─── ◆               │
│                                                      │
│   [NPC silhouette]              [Player silhouette]  │
│   GRETA                         TAAAACO              │
│   Innkeeper                     Dwarf Fighter        │
│                                                      │
│  ═══════════════════════════════════════════════════  │
│                                                      │
│  "Listen close, dwarf. The disappearances started    │
│   three moons ago. First it was hunters..."          │
│                                                      │
│  [input field / 🎤 voice]        [Ask More] [Done]   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Behavior
- **NPC delivers critical info first** — one AI call using `npc.criticalInfo` as context. Auto-displayed on cutscene open.
- **Player can ask follow-ups** — type or voice, NPC responds in character
- **After 5 prompts post-critical-info**, NPC steers toward closing: "You know what you need to know. Go." But doesn't force close.
- **"Done" button** dismisses the cutscene
- **On dismiss:**
  - Sets the story flag (e.g., `critical_greta_info`)
  - Adds entry to player journal automatically
  - Broadcasts `story-cutscene-end` — unfreezes all players
  - Fade back to gameplay

### Multiplayer
- **All players see the cutscene** — broadcast includes NPC info and conversation text
- **Non-initiating players** see the conversation in real-time but cannot type or interact
- **All players frozen** during cutscene (movement disabled)

### Silhouettes
- Humanoid silhouette shapes (not circles) — dark figure outlines
- NPC on left, player on right
- Placeholder for future character art (easy to swap `<img>` src later)
- Name and class/role displayed below each silhouette

### Styling
- Full dark background with radial gradient (same as ApiKeyGate overlay)
- Ornate gold filigree border — more elaborate than normal dialog
- "A MOMENT OF FATE" header in Cinzel Decorative with text-shadow glow
- Ornate dividers (SVG wave patterns) above and below conversation area
- Designed to be easily reskinned/modified — styles in CSS classes, not inline

### Critical info data
```json
{
  "name": "Durnan",
  "critical": true,
  "criticalInfo": "The disappearances trace back to the brackenwood ruins. An ancient cult has awakened something in the deep.",
  "criticalFlag": "critical_durnan_info",
  "hints": [
    { "after": null, "text": "Something's wrong in the brackenwood..." },
    { "after": "critical_durnan_info", "text": "You know what I know. Be careful out there." }
  ]
}
```

---

## 5. Story Flags System

### Store
- `storyFlags: Set<string>` in Zustand store
- Persisted to `campaigns.campaign_data.storyFlags` in Supabase (campaign-level, shared by all players)

### Flag sources
| Event | Flag pattern | Example |
|---|---|---|
| Critical NPC conversation complete | `critical_{npc_name}_info` | `critical_durnan_info` |
| Encounter cleared | `cleared_{zone_id}` | `cleared_brackenwood_cave` |
| Zone first visit | `visited_{zone_id}` | `visited_brackenwood` |
| Side quest accepted | `quest_{quest_id}` | `quest_greta_shipment` |

### Multiplayer sync
- Story flags broadcast to all players when set
- All players share the same story flags (party-level progression)
- Persisted to Supabase on every flag change

### API
```javascript
// In Zustand store
storyFlags: new Set(),
addStoryFlag: (flag) => {
  const flags = new Set(get().storyFlags)
  flags.add(flag)
  set({ storyFlags: flags })
  // Broadcast + persist to Supabase
},
hasStoryFlag: (flag) => get().storyFlags.has(flag),
```

---

## 6. Campaign Generator Updates

The AI campaign generator (`src/lib/campaignGenerator.js`) must produce NPC data with the new fields.

### NPC schema (updated)
```json
{
  "name": "string",
  "role": "string (innkeeper, guard, merchant, etc.)",
  "personality": "string (1-2 sentences)",
  "critical": "boolean",
  "criticalInfo": "string | null (story-essential message, only if critical)",
  "criticalFlag": "string | null (flag to set on completion)",
  "sideQuest": "string | null (brief side quest description)",
  "hints": [
    { "after": "string | null (story flag, null = default)", "text": "string (max 80 chars)" }
  ],
  "position": { "x": "number", "y": "number" }
}
```

### Generation prompt updates
- Instruct AI to give most NPCs a `sideQuest` that aligns with the campaign direction
- Critical NPCs get `criticalInfo` that advances the main plot
- Hints should guide players toward the storyline and objectives
- Each NPC should have 2-4 hints covering different story progression states

### Story flags definition
The campaign generator also outputs a `storyMilestones` array listing all flags in order:
```json
{
  "storyMilestones": [
    { "flag": "visited_town_square", "description": "Party arrives in Milhaven" },
    { "flag": "critical_durnan_info", "description": "Durnan reveals brackenwood threat" },
    { "flag": "cleared_brackenwood", "description": "Party clears the brackenwood ruins" }
  ]
}
```

---

## 7. Player Journal

**New HUD button** — ornate papyrus scroll icon, opens a styled modal.

### HUD button
- Added to ActionArea alongside DICE, CHAR, PACK, REST
- Icon: 📜 (or custom SVG scroll)
- Label: "JOURNAL"
- Same ornate button styling with SVG corner filigree

### Journal modal
- **Parchment/scroll aesthetic** — tan/aged paper background, dark ink text, torn edges or scroll roll visual
- **Header:** "Journal" in Cinzel Decorative, ornate divider below
- **Entries:** Reverse chronological (newest first)
  - Each entry: timestamp, NPC name, location, critical info summary
  - Gold accent on critical story entries
  - Side quest entries in separate section or tab
- **Auto-populated** when critical NPC conversations complete
- **Side quest tracking** — quests accepted during NPC conversations listed with status

### Data
```javascript
// In Zustand store
journal: [],
addJournalEntry: (entry) => set(s => ({
  journal: [...s.journal, { ...entry, timestamp: Date.now() }]
})),
```

### Entry schema
```json
{
  "type": "critical | sidequest | note",
  "npcName": "Durnan",
  "zoneName": "Milhaven Town Square",
  "text": "The disappearances trace back to the brackenwood ruins...",
  "flag": "critical_durnan_info",
  "timestamp": 1710812400000
}
```

### Persistence
- Journal entries persisted to `campaigns.settings` or `campaign_characters` in Supabase
- Loaded on game join, synced on write

---

## 8. Architecture Notes

### GameV2.jsx extraction
GameV2.jsx is already ~493 lines. To stay under 400, extract interaction logic into `src/lib/interactionController.js`:
- `handleInteract(playerPos, zone, storyFlags)` — determines what's adjacent, returns `{ type: 'npc'|'exit', target }`
- `getAdjacentNpc(playerPos, zone)` — finds NPC within 1 tile
- `getAdjacentExit(playerPos, zone)` — finds exit within 1 tile
- `resolveHint(npc, storyFlags)` — picks the right hint from the hints array

GameV2 stays as thin orchestrator — calls `handleInteract()`, opens the right dialog/cutscene.

### Store slicing
Add `storyFlags`, `journal`, `addStoryFlag`, `addJournalEntry` as a dedicated slice in `src/store/storySlice.js` merged into the main store. Keeps `useStore.js` from growing further.

### Concurrent NPC interaction
When a player opens NPC dialog, broadcast `npc-dialog-start` with `{ npcName, playerId }`. Other players see a small indicator ("Greta is speaking with Taaaco"). A second player pressing E gets blocked with that message. On dialog close, broadcast `npc-dialog-end`. If interacting player disconnects, host clears the lock after 10s timeout.

### Cutscene disconnect recovery
If the initiating player disconnects during a critical cutscene:
- Host detects disconnect via Supabase Realtime presence
- After 5s, host broadcasts `story-cutscene-end` with the story flag still set (info was already displayed)
- All players unfreeze
If the HOST disconnects, each client has a 30s timeout that auto-unfreezes locally.

### Chat bubbles — HTML overlays
Chat bubbles are React components (`ChatBubble.jsx`) rendered as absolute-positioned HTML overlays outside the PixiJS canvas. They read world-to-screen coordinates from the PixiJS stage transform to position themselves above NPC tokens. This allows full CSS styling (gold borders, Cinzel font, dark panels) without PixiJS text limitations.

### Multi-turn conversation history
Both `NpcDialog.jsx` and `StoryCutscene.jsx` maintain a local `messages[]` array in component state. Each API call sends the full history (system prompt + alternating user/assistant messages) to `callNarrator`. This enables coherent multi-turn NPC conversations.

### 5-prompt grace period — client enforcement
Track prompt count in component state. After 5 prompts post-critical-info:
- Prompt 5: NPC response includes steering toward close (AI instruction)
- Prompt 7: UI shows "Durnan grows impatient..." hint
- Prompt 10: Hard limit — "Durnan has said all he has to say." Dialog auto-closes, flag set.

### Journal + story flags persistence
Both stored in `campaigns.campaign_data` (JSONB). Only the host writes to Supabase. Other players receive updates via broadcast. Loaded on game join.

### Shared conversation component
Extract `NpcConversation.jsx` — shared between `NpcDialog.jsx` and `StoryCutscene.jsx`. Handles: message display, input field, voice input button, send logic, prompt counting. Each parent provides different styling and wrapping UI.

---

## 9. Files Changed

| File | Change |
|------|--------|
| **New: `src/components/NpcConversation.jsx`** | Shared conversation component (messages, input, voice, prompt counter) |
| **New: `src/components/NpcDialog.jsx`** | Normal NPC conversation overlay (wraps NpcConversation) |
| **New: `src/components/StoryCutscene.jsx`** | Critical NPC full-screen cutscene (wraps NpcConversation) |
| **New: `src/components/JournalModal.jsx`** | Player journal with scroll/parchment aesthetic |
| **New: `src/components/ChatBubble.jsx`** | HTML overlay hint text positioned above NPC tokens |
| **New: `src/lib/interactionController.js`** | handleInteract, getAdjacentNpc, getAdjacentExit, resolveHint |
| **New: `src/store/storySlice.js`** | storyFlags, journal, addStoryFlag, addJournalEntry, persistence |
| `src/GameV2.jsx` | Remove NPC proximity effect, add E-key handler, wire dialog/cutscene/journal |
| `src/engine/PixiApp.jsx` | Add NPC click detection, expose world-to-screen coords for bubbles |
| `src/hud/ActionArea.jsx` | Add JOURNAL button |
| `src/hud/hud.css` | Styles for dialog, cutscene, journal, chat bubbles, mobile interact button |
| `src/store/useStore.js` | Merge storySlice |
| `src/lib/campaignGenerator.js` | Update NPC schema, add hints/critical/sideQuest generation |
| `src/lib/liveChannel.js` | Add npc-dialog-start/end, story-cutscene-start/end, story-flag-sync broadcasts |
| `src/lib/narratorApi.js` | Add NPC conversation system prompt builder |
| `src/data/demoWorld.json` | Update NPCs with new schema (hints, critical, sideQuest) |

---

## 9. Out of Scope
- Character art / portrait assets (placeholder silhouettes for now)
- Full ornate styling overhaul across all UI (separate visual pass)
- NPC voice output / TTS for NPC dialog (future enhancement)
- Side quest completion tracking UI beyond journal entries
- NPC movement / patrol behavior
