# DungeonMind — Architecture & Product Vision

## Branding Rules
- Product name: DungeonMind
- The AI: "The Narrator" (never "Dungeon Master" or "DM")
- Rules system: "SRD 5.1 rules" (never "D&D" or "Dungeons & Dragons")
- Campaigns, Sessions, Players — fine as-is

---

## Core Concepts

### Campaign
The primary unit of the product.
- One campaign = one world, one party, one story
- One campaign owns exactly one Narrator AI agent
- Campaigns persist for weeks or months
- This is what users create, subscribe to, and manage

### The Narrator (AI)
- One persistent AI brain per campaign
- Persona: narration style, tone, rules strictness
- Tool access: dice roller, rules engine, state mutation
- Memory access: campaign state + narrative history
- Does NOT reset between sessions
- All players in a campaign share the same Narrator
- Player count does not affect AI cost

### Session
- A temporary interaction window (minutes to hours)
- Can end and resume
- Multiple sessions occur over a campaign lifetime
- Sessions do NOT define memory or cost boundaries

### Players
- Clients of the same Narrator agent
- 1-6 players per campaign
- No separate AI instances per player

---

## Memory Model (Critical)

The Claude API has no built-in persistence. Memory is explicitly managed 
in three layers.

### Layer 1: Canonical Campaign State (Structured, Authoritative)
Stored in Supabase. Never summarized away. Source of truth.
- Party members, classes, stats
- HP, spell slots, conditions
- Inventory, gold
- Time, date, location
- Active quests
- NPC relationships and faction reputation

### Layer 2: Narrative Memory (Compressed, AI-Friendly)
Text summaries generated periodically and stored in Supabase.
- Major story events
- Consequences of player actions
- NPC attitudes and world changes
- Summarize every N turns or at session end
- Keep summaries short (1-2 pages max)
- Replace raw transcripts with summaries over time

### Layer 3: Short-Term Session Buffer
Live context only. Discarded when session ends.
- Last 10-20 turns
- Current scene description
- Active combat state

### Session Resume Flow
When a session resumes, inject in this order:
1. System prompt (Narrator rules and persona)
2. Canonical campaign state (from Supabase)
3. Narrative summary (from Supabase)
4. Last scene recap (optional)

---

## AI Model Routing

### Claude Sonnet
- Campaign and world generation only
- NPC creation and faction setup
- One-time high-reasoning tasks
- Infrequent, used sparingly

### Claude Haiku
- ALL live Narrator interactions
- Every turn of gameplay
- Combat narration
- NPC dialogue
- Everything real-time

---

## Token Efficiency Rules (Critical)
- Haiku for ALL live gameplay — never Sonnet for real-time turns
- Narrative summaries replace raw transcripts
- Session buffer is max 20 turns — older turns are summarized and dropped
- Canonical state is structured JSON — not prose
- System prompt is fixed and short — loaded once per session
- Do NOT send full campaign history on every turn
- Do NOT send full character sheet on every turn
- Pass only what is relevant to the current moment

---

## Cost Reality
- Typical 3-4 hour session: ~$0.25-0.35
- Heavy campaign (20+ hrs/week): a few dollars/month
- Cost scales with campaign activity not player count

---

## Commercial Pricing Model

### Core Principle
Price per campaign (table), never per player or per seat.

### Default Tier
- $6-10/month per campaign
- Unlimited players
- Normal weekly play fully covered
- AI costs included

### Guardrails (Not Metering)
- Campaign-level rate limits
- Turn caps per hour
- Idle timeouts
- Cooldowns after extreme bursts

### Power Tier (BYOK)
- Bring Your Own Claude API Key
- For unlimited or daily play
- Optional, never required

---

## Screen Layout

### Desktop
- Top 80%: scene map (full bleed, dominant, feels like a game)
- Bottom 20%: narrator bar (collapsed by default)
- Narrator bar expands to max 40% when player is typing or reading
- Map never shrinks below 60% under any circumstances

### Mobile (landscape only)
- Lock orientation to landscape — portrait is not supported
- Top 80%: scene map
- Bottom 20%: narrator bar collapsed, slides up to 40% max
- Action buttons sit above narrator bar, thumb-reachable
- All tap targets minimum 44x44px
- Works at 375px wide (iPhone) up to 1920px wide (desktop)
- Touch controls: tap to move, tap to attack, tap to select
- No hover states — use tap/active states instead

---

## Asset Strategy

### Current State: CSS Placeholders
The agent builds all UI with CSS placeholders:
- Correct dark colors (#1a1a1a, #2a2a1a backgrounds)
- Gold borders (#d4af37)
- Correct sizes and layout
- No external image files required
- Everything works and is testable

This is intentional. Placeholders define layout and component sizes.
Real art drops in later without touching layout code.

### When Real Assets Arrive
Save art files to: public/ui/
Component slot names are already defined — just update the CSS/imports.

### Recommended Asset Sources (in order)
1. Itch.io dark fantasy UI packs ($5-15, made by real artists)
   - Search: "dark fantasy UI pack" or "RPG UI kit"
2. Midjourney for atmospheric art
   - Prompt style: "dark fantasy RPG UI panel, stone texture, 
     ornate gold border, aged parchment, Baldur's Gate aesthetic, 
     game UI, transparent background --v 6 --ar 4:1"
3. Fiverr game UI artists ($50-200 for full kit)
   - Search: "game UI design fantasy"

### Asset Specifications
- All UI panels: transparent PNG
- Tile sprites: 200x200px WebP (already built, 3199 tiles)
- Token portraits: 128x128px PNG
- UI buttons: minimum 44x44px (mobile tap targets)
- Dark fantasy style, gold accents, aged textures

---

## Complete UI Screen Inventory
Every screen from first load to full gameplay.
Agent works through this list in priority order.
Check boxes as screens are completed in tasks/status.md.

### Auth Flow
- [ ] Landing page (login / signup CTA)
- [ ] Supabase auth screen
- [ ] Post-login redirect to dashboard
- [ ] Dev auto-login bypass (VITE_DEV_AUTO_LOGIN=true, never in production)

### Dashboard
- [ ] Campaign list (my campaigns)
- [ ] Create new campaign button
- [ ] Join campaign via invite code
- [ ] Account settings

### Campaign Setup
- [ ] New campaign wizard (name, world tone, difficulty)
- [ ] Campaign lobby (host waiting for players)
- [ ] Invite code display and share
- [ ] Player list (who has joined)

### Character Creation
- [ ] Race selection (all SRD 5.1 races)
- [ ] Class selection (all 12 SRD 5.1 classes)
- [ ] Ability score assignment (standard array / point buy / roll)
- [ ] Background selection
- [ ] Equipment selection
- [ ] Character name and appearance
- [ ] Character review and confirm
- [ ] Character sheet (persistent, viewable during play)

### Main Game Screen
- [ ] Scene image (top 80%, full bleed)
- [ ] PixiJS tilemap with token layer
- [ ] Grid overlay (always visible)
- [ ] Fog of war overlay
- [ ] Narrator bar (bottom 20%, collapses and expands)
- [ ] Player input (text + push to talk)
- [ ] HUD: HP bar, AC, spell slots, conditions
- [ ] Initiative order tracker (combat only)
- [ ] Action buttons above narrator bar, thumb-reachable on mobile
- [ ] Bonus action buttons (class specific)
- [ ] Movement remaining indicator (combat only)
- [ ] End turn button (combat only)

### Pre-Combat Phase
- [ ] Detection zone visual on map
- [ ] Pre-combat choice panel: Sneak / Talk / Pickpocket / Ambush / Charge
- [ ] Stealth check result display
- [ ] Pickpocket result display
- [ ] Perception check result display

### Combat
- [ ] Turn order banner with portraits
- [ ] Active player highlight on map
- [ ] Enemy token HP bars
- [ ] Spell targeting overlay (cone / line / sphere SVG)
- [ ] Attack roll display with breakdown
- [ ] Damage roll display
- [ ] Death save UI (3 successes / 3 failures)
- [ ] Concentration tracker
- [ ] Condition icons on tokens
- [ ] Opportunity attack prompt

### NPC Interaction
- [ ] NPC dialogue panel with portrait
- [ ] Skill check prompt (Persuasion / Intimidation / Deception)
- [ ] Skill check result with roll breakdown
- [ ] Faction reputation indicator
- [ ] Trade / barter screen

### Inventory and Equipment
- [ ] Inventory panel with item grid
- [ ] Equipment slots
- [ ] Loot display after combat or search
- [ ] Gold display
- [ ] Item tooltip
- [ ] Use / Equip / Drop actions

### Exploration
- [ ] Search room result
- [ ] Lockpick attempt UI
- [ ] Trap detection and disarm UI
- [ ] Area transition (fade to new scene)
- [ ] Area name indicator

### Session Management
- [ ] Session resume screen
- [ ] Player disconnected notification
- [ ] Host migration if host drops
- [ ] Session end summary (XP, loot)

### Leveling Up
- [ ] Level up notification
- [ ] Stat increase selection
- [ ] New ability and spell selection
- [ ] Updated character sheet confirmation

---

## Visual Style
- Dark fantasy, Baldur's Gate 2 / Icewind Dale aesthetic
- Gold accents: #d4af37
- Deep brown and black backgrounds: #1a1a1a, #2a2a1a
- PixiJS WebGL rendering, 200px tiles
- Big tap/click targets (TV, tablet, and mobile use)
- No white space visible in the game screen
- Narrator-only info: dashed red border, rgba(200,80,80,0.8) label
- Spell effects render on the scene map, not in a sidebar
- Grid always visible, activates for turn-based movement in combat
- CSS placeholders now, real art assets later
- All placeholder colors must match the final dark fantasy palette
