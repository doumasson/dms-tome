# V2 Front Door — Fix Functional Gaps & API Key Security

> **Goal:** Make V2 actually usable as a game — visible settings, invite flow, campaign identity, secure API key handling, and discoverable HUD.

---

## 1. Top Bar — Campaign Info + Menu

**New component: `src/hud/CampaignBar.jsx`** — absolute top-right, ornate dark fantasy style matching existing HUD.

### Layout
```
[Campaign Name]  ⚔ 3 Adventurers  [📋 Invite] [⚙ Settings] [🚪 Leave]
```

### Details
- **Campaign name** — Cinzel Decorative, gold (`#eedd88`), pulled from `campaign.title` in Zustand store
- **Player count** — dynamic from `partyMembers.length`, no hard cap. Format: `⚔ N Adventurers` (or `1 Adventurer`)
- **Invite button** — copies `${window.location.origin}?invite=${campaign.invite_code}` to clipboard. Shows "Copied!" toast for 2s. Gold border on hover.
- **Settings button** — opens `ApiKeySettings` modal (moved from ActionArea)
- **Leave button** — calls `resetCampaign()` in store, returns to campaign select view
- **Styling** — same `bg-panel` background, gold SVG corner filigree on each button (matching existing `hud-tool-btn` style), `pointer-events: auto`

### `resetCampaign()` — exact fields cleared
Resets: `campaign` → `{}`, `activeCampaign` → `null`, `currentZoneId` → `null`, `zones` → `null`, `visitedZones` → `Set()`, `zoneTokenPositions` → `{}`, `pendingEntryPoint` → `null`, `encounter` → `{ phase: 'idle', combatants: [], currentTurn: 0, round: 0 }`, `partyMembers` → `[]`, `narrator` → `{ history: [], open: false }`, `sessionApiKey` → `null`. Then sets `appView` → `'select'`.

### Changes to ActionArea
- Remove `⚙ Settings` from TOOLS array (moved to top bar)
- Keep: 🎲 Dice, 📜 Character, 🎒 Inventory, 🏕 Rest
- Add labels below each icon (8px Cinzel uppercase): `DICE`, `CHAR`, `PACK`, `REST`

---

## 2. API Key Security — Mission Critical

### Storage Architecture

**Zero localStorage.** All `localStorage.getItem('claude_api_key')`, `localStorage.getItem('claude-api-key-${userId}')`, and `localStorage.getItem('openai_api_key')` calls removed throughout the entire codebase. This includes the `getClaudeApiKey(userId)` and `setClaudeApiKey(userId, key)` helper functions in `claudeApi.js`.

**Database storage (obfuscated at rest):**
- API key stored in `campaigns.settings` JSONB field as `{ encrypted_api_key: { iv, ciphertext } }`
- Obfuscated client-side using Web Crypto API (AES-GCM):
  - Derive key from `campaign.id` + user ID using PBKDF2
  - Generate random IV per encryption
  - Store as `{ iv: "<base64>", ciphertext: "<base64>" }`
- Only the campaign host (DM) can write the key
- On load, fetch from DB → decrypt → store in Zustand `sessionApiKey` (memory only)
- On logout/leave/tab close, `sessionApiKey` is cleared

**Security posture — honest tradeoffs:**
- This is **obfuscation at rest**, not true encryption. The key material (campaign ID + user ID) is known to campaign members. This prevents casual DB browsing but not a determined attacker with DB access.
- The API key is also **broadcast in plaintext** over Supabase Realtime for multiplayer key sharing. This is the existing behavior and a known limitation.
- **Future upgrade path:** A Supabase Edge Function proxy that makes Claude API calls server-side would eliminate client-side key exposure entirely. This is the right long-term solution but out of scope for this sprint.

**Backward compatibility:** On first load after this change, if `campaigns.settings.claudeApiKey` contains a raw string (old plaintext format), detect it (type check — string vs object), encrypt it, re-save as `{ encrypted_api_key: { iv, ciphertext } }`, and delete the old `claudeApiKey` field.

**Multiplayer key sharing:**
- DM's client decrypts key on load → broadcasts via existing `broadcastApiKeySync`
- Non-DM players receive key into `sessionApiKey` (memory only, never written to DB or disk)
- **Non-DM refresh recovery:** On mount, non-DM clients broadcast a `request-api-key` message. The DM client listens for this and responds by re-broadcasting the key. If DM is offline, non-DM player sees the gate screen with a message: *"Waiting for the Dungeon Master to share the realm key..."* (no input field — only DM can set the key).

### New module: `src/lib/apiKeyVault.js`

```javascript
// encryptApiKey(key, campaignId, userId) → { iv, ciphertext }
// decryptApiKey({ iv, ciphertext }, campaignId, userId) → plaintext key
// saveApiKeyToSupabase(campaignId, encryptedPayload) → void
// loadApiKeyFromSupabase(campaignId) → encryptedPayload | null
// migrateIfPlaintext(campaignId, userId) → void (handles old format)
```

Uses Web Crypto API (SubtleCrypto) — no external dependencies.

### Prompt Flow

**Campaign creation:**
- After campaign JSON is generated, before entering the game, show API key prompt step
- Can't proceed to game without providing a key
- Key is encrypted and stored immediately

**Game entry (gate screen) — new component: `src/components/ApiKeyGate.jsx`**
- On `GameV2` mount, check for API key (try DB first, then `sessionApiKey`)
- If no key found: render **full-screen gate** instead of the game
  - Ornate dark fantasy styling (Cinzel Decorative, gold filigree border, dark background)
  - **DM view:** Title: *"The Dungeon Master Awaits"* — API key input + "Enter the Realm" button
  - **Non-DM view:** *"Waiting for the Dungeon Master to share the realm key..."* — no input, auto-resolves when DM broadcasts key
  - This gate is **not dismissable** — no key, no game
- Works for both normal flow and `?v2` testing shortcut

**Existing flows cleaned up:**
- Remove `localStorage.getItem('claude_api_key')` from: `GameV2.jsx` (3 occurrences), `App.jsx`, `ApiKeySettings.jsx`
- V2 code paths stop using `getClaudeApiKey()` / `setClaudeApiKey()` — but keep these functions in `claudeApi.js` for V1 backward compatibility (V1 components like `NarratorPanel.jsx`, `CampaignEndModal.jsx`, `CampaignImporter.jsx` still call them)
- All V2 code reads from `sessionApiKey` in Zustand store only

**OpenAI key:** Currently used only for TTS in V1. V2 doesn't use it. Remove from V2's `ApiKeySettings` — if needed later, add back as a separate concern. Note: `dalleApi.js` retains its own localStorage usage for V1 — this is known and out of scope.

**PBKDF2 iteration count:** Use 10,000 iterations. This is acknowledged obfuscation, not high-security encryption.

**Web Crypto fallback:** If SubtleCrypto is unavailable (e.g., non-HTTPS localhost), store the key as plaintext in the DB and log a console warning. Dev-mode convenience, not a security gap since the key is already visible in dev tools.

### Input Sanitization

**New module: `src/lib/sanitize.js`**

**User input → Claude API:**
- Strip prompt injection patterns for multiple model families:
  - GPT/Llama: `<|system|>`, `<|user|>`, `<|assistant|>`, `[INST]`, `[/INST]`, `<<SYS>>`, `</SYS>>`
  - Claude legacy: `\n\nHuman:`, `\n\nAssistant:`
  - Claude Messages API: `<instructions>`, `</instructions>`
  - Generic XML role tags: `<system>`, `<human>`, `<assistant>`
- Cap input length: 4000 characters (generous for RP — players may write multi-paragraph actions)
- Strip null bytes
- Applied in `narratorApi.js` before every API call

**AI response → UI rendering:**
- Strip HTML tags (`<script>`, `<iframe>`, `<img onerror>`, etc.)
- Strip markdown-based XSS (`javascript:` URLs in links)
- Applied in `narratorApi.js` on response before returning

---

## 3. Test Combat Button Fix

### Root cause investigation
The button calls `startEncounter(enemies, party)` where `party` is `[myCharacter]`. In `?v2` testing, `myCharacter` may be null (no character creation flow was run), causing `startEncounter` to receive `[null]` or `[]` as the party. Additionally, `startEncounter` in the store may roll initiative using fields that don't exist on the hardcoded enemy objects.

### Fix approach
- Wrap in try-catch, log errors to narrator as system message
- If `myCharacter` is null, create a temporary test character with full required fields:
  ```javascript
  { id: 'test-hero', name: 'Test Hero', hp: 20, maxHp: 20, ac: 15,
    class: 'Fighter', level: 3, speed: 30, type: 'player',
    attackBonus: 5, damageMod: 3,
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 } }
  ```
- Style the button ornate: dark background, gold border, SVG corner filigree, Cinzel font — matches HUD aesthetic instead of raw red rectangle

---

## 4. HUD Button Discoverability

### ActionArea buttons get labels
Current: emoji-only tiny squares (40x38px)
New: emoji + text label below, slightly wider

```
[🎲]  [📜]  [🎒]  [🏕]
DICE  CHAR  PACK  REST
```

- Labels: 7px Cinzel, uppercase, gold-muted color, letter-spacing 1px
- Button width: 40px → 50px, height: 38px → 48px to accommodate labels
- Keep existing SVG corner filigree (scale viewBox to match new size)

---

## 5. Session Log / Chat Polish

### Tab behavior
- **LOG** tab: game events (movement, zone changes, combat results) — auto-scrolls
- **CHAT** tab: narrator/DM messages + player chat — auto-scrolls

### Improvements
- Increase max-height from 82px to fill available space (flex: 1)
- Add auto-scroll-to-bottom on new messages (useRef + scrollIntoView)
- Show timestamps in muted gold
- Speaker names in gold Cinzel font, differentiated per player in multiplayer
- Player messages right-aligned, DM messages left-aligned (chat bubble feel without actual bubbles)

---

## Files Changed

| File | Change |
|------|--------|
| **New: `src/hud/CampaignBar.jsx`** | Campaign name, player count, invite/settings/leave buttons |
| **New: `src/components/ApiKeyGate.jsx`** | Full-screen gate when no API key (DM input vs non-DM waiting) |
| **New: `src/lib/apiKeyVault.js`** | Web Crypto obfuscate/deobfuscate, Supabase read/write, plaintext migration |
| **New: `src/lib/sanitize.js`** | Input sanitization for Claude API, output sanitization for rendering |
| `src/hud/ActionArea.jsx` | Remove settings button, add text labels to remaining buttons |
| `src/hud/GameHUD.jsx` | Add CampaignBar to top-right |
| `src/hud/SessionLog.jsx` | Auto-scroll, better height, chat alignment, multiplayer speaker names |
| `src/hud/hud.css` | Styles for CampaignBar, ApiKeyGate, button labels, improved log |
| `src/GameV2.jsx` | Wire ApiKeyGate + CampaignBar, remove localStorage reads, fix test combat |
| `src/components/ApiKeySettings.jsx` | Rewrite to use apiKeyVault (encrypted DB storage), remove OpenAI key |
| `src/lib/narratorApi.js` | Add sanitization layer on input/output |
| `src/lib/claudeApi.js` | Keep V1 helpers, but V2 code stops calling them |
| `src/App.jsx` | Remove localStorage API key sync, add `request-api-key` listener for DM |
| `src/lib/liveChannel.js` | Add `broadcastRequestApiKey` and `onRequestApiKey` handlers |
| `src/store/useStore.js` | Add `resetCampaign` action (fields enumerated in Section 1) |

### Migration
- No new Supabase migration needed — `campaigns.settings` JSONB already exists
- Backward compat: auto-migrate plaintext `claudeApiKey` → encrypted `encrypted_api_key` on first load

---

## Out of Scope
- Real tileset assets (waiting on transfer from brother)
- Mobile responsive design
- AI character portraits
- Spell casting UI (existing placeholder stays)
- Full target selection in combat (auto-targets first enemy for now)
- Edge Function API proxy (future upgrade for true key security)
