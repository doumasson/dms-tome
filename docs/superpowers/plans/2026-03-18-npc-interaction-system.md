# NPC Interaction System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace auto-proximity NPC triggers with intentional E-key/click interactions, add chat bubbles, NPC dialog, critical story cutscenes, story flags, player journal, and campaign generator updates.

**Architecture:** New `storySlice.js` for story flags + journal state. `interactionController.js` handles adjacency/interaction logic extracted from GameV2. Shared `NpcConversation.jsx` powers both `NpcDialog.jsx` and `StoryCutscene.jsx`. Chat bubbles as HTML overlays positioned from PixiJS world coords. Campaign generator updated to produce NPC hints/critical/sideQuest data.

**Tech Stack:** React, Zustand (slice pattern), Supabase (campaigns.campaign_data JSONB), PixiJS (world-to-screen coords), Web Speech API (voice input), existing dark fantasy HUD infrastructure.

**Spec:** `docs/superpowers/specs/2026-03-18-npc-interaction-system-design.md`

---

### Task 1: Story Slice + Broadcast Infrastructure

**Files:**
- Create: `src/store/storySlice.js`
- Modify: `src/store/useStore.js` (merge slice)
- Modify: `src/lib/liveChannel.js` (add broadcast functions)

Foundation — no UI, just state + multiplayer sync.

- [ ] **Step 1: Create `src/store/storySlice.js`**

```javascript
/**
 * Story progression state — flags, journal, NPC busy locks.
 * Merged into the main Zustand store.
 */
export function createStorySlice(set, get) {
  return {
    // Story flags — shared party-level progression
    storyFlags: new Set(),
    addStoryFlag: (flag) => {
      const flags = new Set(get().storyFlags)
      if (flags.has(flag)) return // already set
      flags.add(flag)
      set({ storyFlags: flags })
    },
    hasStoryFlag: (flag) => get().storyFlags.has(flag),
    loadStoryFlags: (flagsArray) => set({ storyFlags: new Set(flagsArray) }),

    // Player journal — critical story info + side quests
    journal: [],
    addJournalEntry: (entry) => set(s => ({
      journal: [...s.journal, { ...entry, timestamp: Date.now() }]
    })),
    loadJournal: (entries) => set({ journal: entries || [] }),

    // NPC busy state — which NPC is being talked to and by whom
    npcBusy: null, // { npcName, playerId, playerName } or null
    setNpcBusy: (info) => set({ npcBusy: info }),
    clearNpcBusy: () => set({ npcBusy: null }),

    // Active cutscene — freezes all players
    activeCutscene: null, // { npcName, initiatorId, messages } or null
    setActiveCutscene: (info) => set({ activeCutscene: info }),
    clearActiveCutscene: () => set({ activeCutscene: null }),
  }
}
```

- [ ] **Step 2: Merge slice into `src/store/useStore.js`**

Add import at top of file:
```javascript
import { createStorySlice } from './storySlice'
```

Find the `create((set, get) => ({` block and spread the slice at the end, before the closing `}))`:
```javascript
    // === Story Progression ===
    ...createStorySlice(set, get),
  }))
```

- [ ] **Step 3: Add broadcast functions to `src/lib/liveChannel.js`**

Append after the existing `broadcastZoneTransition` function:
```javascript
// NPC dialog lock — prevent multiple players talking to same NPC
export function broadcastNpcDialogStart(npcName, playerId, playerName) {
  _channel?.send({ type: 'broadcast', event: 'npc-dialog-start', payload: { npcName, playerId, playerName } })
}

export function broadcastNpcDialogEnd(npcName) {
  _channel?.send({ type: 'broadcast', event: 'npc-dialog-end', payload: { npcName } })
}

// Critical story cutscene — freezes all players
export function broadcastStoryCutsceneStart(npcName, initiatorId, criticalInfo) {
  _channel?.send({ type: 'broadcast', event: 'story-cutscene-start', payload: { npcName, initiatorId, criticalInfo } })
}

export function broadcastStoryCutsceneEnd(npcName, storyFlag) {
  _channel?.send({ type: 'broadcast', event: 'story-cutscene-end', payload: { npcName, storyFlag } })
}

// Cutscene conversation messages — relay to all watching players
export function broadcastCutsceneMessage(msg) {
  _channel?.send({ type: 'broadcast', event: 'cutscene-message', payload: msg })
}

// Story flag sync — when any flag is set, broadcast to all
export function broadcastStoryFlag(flag) {
  _channel?.send({ type: 'broadcast', event: 'story-flag', payload: { flag } })
}

// Journal entry sync — broadcast new entries
export function broadcastJournalEntry(entry) {
  _channel?.send({ type: 'broadcast', event: 'journal-entry', payload: entry })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/store/storySlice.js src/store/useStore.js src/lib/liveChannel.js
git commit -m "feat: add story slice (flags, journal, NPC locks) and broadcast functions"
```

---

### Task 2: Interaction Controller + E-Key Handler

**Files:**
- Create: `src/lib/interactionController.js`
- Modify: `src/GameV2.jsx` (add E-key, remove NPC proximity effect)

- [ ] **Step 1: Create `src/lib/interactionController.js`**

```javascript
/**
 * Determines what the player can interact with at their current position.
 * Used by GameV2 to handle E-key and click interactions.
 */

/**
 * Find an NPC within 1 tile of the player position.
 * @returns {object|null} The NPC object, or null if none adjacent.
 */
export function getAdjacentNpc(playerPos, zone) {
  if (!zone?.npcs) return null
  for (const npc of zone.npcs) {
    if (!npc.position) continue
    const dx = Math.abs(playerPos.x - npc.position.x)
    const dy = Math.abs(playerPos.y - npc.position.y)
    if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
      return npc
    }
  }
  return null
}

/**
 * Find an exit within 1 tile of the player position.
 * @returns {object|null} The exit object, or null if none adjacent.
 */
export function getAdjacentExit(playerPos, zone) {
  if (!zone?.exits) return null
  for (const exit of zone.exits) {
    if (!exit.position) continue
    const w = exit.width || 1
    for (let i = 0; i < w; i++) {
      const ex = exit.position.x + i
      const ey = exit.position.y
      const dx = Math.abs(playerPos.x - ex)
      const dy = Math.abs(playerPos.y - ey)
      if (dx <= 1 && dy <= 1) {
        return exit
      }
    }
  }
  return null
}

/**
 * Resolve which hint to show for an NPC based on current story flags.
 * Walks hints array backward, returns first match.
 * @returns {string} The hint text to display.
 */
export function resolveHint(npc, storyFlags) {
  if (!npc.hints || npc.hints.length === 0) {
    return npc.personality || ''
  }
  // Walk backward — find the most advanced matching hint
  for (let i = npc.hints.length - 1; i >= 0; i--) {
    const hint = npc.hints[i]
    if (hint.after === null || hint.after === undefined) {
      return hint.text // default fallback
    }
    if (storyFlags.has(hint.after)) {
      return hint.text
    }
  }
  // Fallback to first hint (should have after: null)
  return npc.hints[0]?.text || npc.personality || ''
}

/**
 * Determine what to interact with. Priority: NPC > Exit.
 * @returns {{ type: 'npc'|'exit', target: object }|null}
 */
export function handleInteract(playerPos, zone) {
  const npc = getAdjacentNpc(playerPos, zone)
  if (npc) return { type: 'npc', target: npc }
  const exit = getAdjacentExit(playerPos, zone)
  if (exit) return { type: 'exit', target: exit }
  return null
}
```

- [ ] **Step 2: Add E-key to the WASD handler in `src/GameV2.jsx`**

Find the WASD `handleKeyDown` function (inside the useEffect at ~line 183). Add E-key handling at the top of the function, before the direction check:

```javascript
    function handleKeyDown(e) {
      // Don't interact if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // E key — interact with adjacent NPC or exit
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        handleInteractRef.current()
        return
      }

      const dir = dirs[e.key]
      // ... rest of existing WASD code ...
```

Add the `handleInteractRef` and `handleInteractFn` above the useEffect:

```javascript
  const handleInteractRef = useRef(null)
```

After the existing `handleChatRef` setup, add the interact handler:

```javascript
  // E-key / click interaction handler
  const handleInteractFn = useCallback(() => {
    if (isAnimating()) return
    if (inCombat) return
    const pos = playerPosRef.current
    const result = handleInteract(pos, zone)
    if (!result) return

    if (result.type === 'npc') {
      const npc = result.target
      // Check if NPC is busy
      const busy = useStore.getState().npcBusy
      if (busy && busy.npcName === npc.name) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: `${npc.name} is speaking with ${busy.playerName}.` })
        return
      }
      // Check if critical and flag not yet set
      if (npc.critical && !useStore.getState().hasStoryFlag(npc.criticalFlag)) {
        setActiveNpc({ ...npc, isCutscene: true })
      } else {
        setActiveNpc({ ...npc, isCutscene: false })
      }
    } else if (result.type === 'exit') {
      handleExitClick({ targetZone: result.target.targetZone, entryPoint: result.target.entryPoint })
    }
  }, [zone, inCombat, addNarratorMessage, handleExitClick])

  handleInteractRef.current = handleInteractFn
```

Add `activeNpc` state near the other useState declarations:

```javascript
  const [activeNpc, setActiveNpc] = useState(null) // { name, role, personality, hints, critical, isCutscene, ... }
```

Add import at top:
```javascript
import { handleInteract } from './lib/interactionController'
```

- [ ] **Step 3: Delete the NPC proximity effect + add movement blocking**

Remove the entire NPC proximity useEffect block at lines ~373–399 (the one with `handleChatRef.current(prompt)`). Also remove the `handleChatRef` setup. Keep `lastNpcTriggerRef` — it's used in zone transition handlers (lines 91, 224). Keep `chatInFlightRef` and `handleChat` — used for HUD chat.

Add a `dialogOpenRef` for movement blocking:
```javascript
  const dialogOpenRef = useRef(false)
```

Update the `activeNpc` setter to also update the ref:
```javascript
  // When activeNpc changes, update the movement-blocking ref
  useEffect(() => {
    dialogOpenRef.current = !!activeNpc
  }, [activeNpc])
```

In the WASD `handleKeyDown` function (~line 192), add after the INPUT/TEXTAREA check:
```javascript
      if (dialogOpenRef.current) return // block movement during NPC dialog
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/interactionController.js src/GameV2.jsx
git commit -m "feat: add interaction controller, E-key handler, remove NPC auto-proximity"
```

---

### Task 3: NPC Click Detection in PixiApp

**Files:**
- Modify: `src/engine/PixiApp.jsx` (add NPC click callback)
- Modify: `src/GameV2.jsx` (wire onNpcClick)

- [ ] **Step 1: Add `onNpcClick` prop to PixiApp**

In `src/engine/PixiApp.jsx`, add `onNpcClick` to the props and create a ref for it (same pattern as `onTileClick`):

```javascript
const PixiApp = forwardRef(function PixiApp({ zone, tokens, onTileClick, onExitClick, onNpcClick, inCombat }, ref) {
  const onNpcClickRef = useRef(onNpcClick)
  onNpcClickRef.current = onNpcClick
```

In the existing pointerdown handler (~line 60-74), after computing tile coords `tx, ty`, add NPC detection before the general tile click:

```javascript
      // Check if clicked on an NPC token
      const clickedNpc = tokens?.find(t => t.isNpc && t.x === tx && t.y === ty)
      if (clickedNpc && onNpcClickRef.current) {
        onNpcClickRef.current(clickedNpc)
        return // don't fire tile click for NPC clicks
      }
```

- [ ] **Step 2: Wire `onNpcClick` in GameV2.jsx**

Add the `onNpcClick` handler and pass it to PixiApp:

```javascript
  const handleNpcClick = useCallback((clickedToken) => {
    if (inCombat || isAnimating()) return
    const npc = zone?.npcs?.find(n => n.name === clickedToken.name || n.name === clickedToken.id)
    if (!npc) return
    // Check adjacency (must be within 1 tile)
    const pos = playerPosRef.current
    const dx = Math.abs(pos.x - npc.position.x)
    const dy = Math.abs(pos.y - npc.position.y)
    if (dx > 1 || dy > 1) {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `You need to move closer to ${npc.name}.` })
      return
    }
    handleInteractRef.current()
  }, [zone, inCombat, addNarratorMessage])
```

Pass to PixiApp:
```javascript
<PixiApp ref={pixiRef} zone={zone} tokens={tokens} onTileClick={handleTileClick} onExitClick={handleExitClick} onNpcClick={handleNpcClick} inCombat={inCombat} />
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/PixiApp.jsx src/GameV2.jsx
git commit -m "feat: add NPC click detection in PixiApp, wire to interaction handler"
```

---

### Task 4: NPC Conversation Component (Shared)

**Files:**
- Create: `src/components/NpcConversation.jsx`
- Modify: `src/lib/narratorApi.js` (add NPC system prompt builder)

Shared conversation component used by both NpcDialog and StoryCutscene.

- [ ] **Step 1: Add NPC system prompt builder to `src/lib/narratorApi.js`**

Add after the existing `buildSystemPrompt` function:

```javascript
/**
 * Build a system prompt for an NPC conversation.
 * NPC stays in character, guides toward story/side quest.
 */
export function buildNpcSystemPrompt(npc, campaign, storyFlags, promptCount, isCritical) {
  const flagsList = storyFlags.size > 0 ? Array.from(storyFlags).join(', ') : 'none'
  const steerHint = isCritical && promptCount >= 5
    ? '\nThe conversation has gone on long enough. Start wrapping up — hint that you have nothing more to say.'
    : ''

  return `You are ${npc.name}, a ${npc.role}. You are an NPC in a D&D 5e campaign called "${campaign?.title || 'an unnamed campaign'}".

Personality: ${npc.personality}
${npc.sideQuest ? `Side quest you can offer: ${npc.sideQuest}` : ''}
${isCritical && npc.criticalInfo ? `Critical information to deliver: ${npc.criticalInfo}` : ''}

Story progress flags: ${flagsList}

Rules:
- Stay in character at all times. You are ${npc.name}, not an AI.
- Keep responses to 2-3 sentences. Be concise and natural.
- Guide conversation toward information relevant to the campaign storyline.
- If the player asks about something you would know, share it helpfully.
- If they ask about something outside your knowledge, say so in character.
${npc.sideQuest ? '- If appropriate, mention your side quest to interest the player.' : ''}
${steerHint}

Respond ONLY with a raw JSON object — no markdown, no code fences:
{"narrative":"Your in-character response here."}`
}
```

- [ ] **Step 2: Create `src/components/NpcConversation.jsx`**

```javascript
import { useState, useRef, useEffect } from 'react'
import { callNarrator } from '../lib/narratorApi'
import { buildNpcSystemPrompt } from '../lib/narratorApi'
import useStore from '../store/useStore'

/**
 * Shared conversation component for NPC dialog and story cutscene.
 * Handles: message display, text/voice input, AI calls, prompt counting.
 */
export default function NpcConversation({
  npc,
  isCritical,
  initialMessage,
  onPromptCount,
  onClose,
  disabled, // true for non-initiating players watching a cutscene
  maxPrompts, // hard limit (e.g. 10 for critical)
}) {
  const campaign = useStore(s => s.campaign)
  const storyFlags = useStore(s => s.storyFlags)
  const sessionApiKey = useStore(s => s.sessionApiKey)

  const [messages, setMessages] = useState(() => {
    if (initialMessage) {
      return [{ role: 'npc', speaker: npc.name, text: initialMessage }]
    }
    return []
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [promptCount, setPromptCount] = useState(0)
  const [hardLimited, setHardLimited] = useState(false)
  const scrollRef = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  // Report prompt count changes
  useEffect(() => {
    onPromptCount?.(promptCount)
  }, [promptCount, onPromptCount])

  async function handleSend(text) {
    const trimmed = (text || input).trim()
    if (!trimmed || loading || disabled || hardLimited) return

    const apiKey = sessionApiKey
    if (!apiKey) return

    // Check hard limit
    if (maxPrompts && promptCount >= maxPrompts) {
      setHardLimited(true)
      setMessages(prev => [...prev, {
        role: 'npc', speaker: npc.name,
        text: `${npc.name} has said all they have to say.`,
      }])
      return
    }

    const playerMsg = { role: 'player', speaker: 'You', text: trimmed }
    setMessages(prev => [...prev, playerMsg])
    setInput('')
    setLoading(true)

    const newCount = promptCount + 1
    setPromptCount(newCount)

    try {
      const systemPrompt = buildNpcSystemPrompt(npc, campaign, storyFlags, newCount, isCritical)
      const history = [...messages, playerMsg].map(m => ({
        role: m.role === 'npc' ? 'assistant' : 'user',
        content: m.text,
      }))

      const result = await callNarrator({
        messages: history,
        systemPrompt,
        apiKey,
      })

      const dialogue = result?.narrative || '...'

      setMessages(prev => [...prev, { role: 'npc', speaker: npc.name, text: dialogue }])

      // Show impatience hint at prompt 7
      if (isCritical && newCount >= 7 && newCount < (maxPrompts || 10)) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'system', speaker: '',
            text: `${npc.name} grows impatient...`,
          }])
        }, 1500)
      }
    } catch (err) {
      console.error('[NpcConversation] AI error:', err)
      setMessages(prev => [...prev, {
        role: 'npc', speaker: npc.name,
        text: '...',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    handleSend()
  }

  return (
    <div className="npc-conv">
      {/* Messages */}
      <div className="npc-conv-messages" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`npc-conv-msg npc-conv-${msg.role}`}>
            {msg.speaker && (
              <span className="npc-conv-speaker">{msg.speaker}</span>
            )}
            <span className="npc-conv-text">{msg.text}</span>
          </div>
        ))}
        {loading && (
          <div className="npc-conv-msg npc-conv-npc">
            <span className="npc-conv-speaker">{npc.name}</span>
            <span className="npc-conv-text npc-conv-loading">...</span>
          </div>
        )}
      </div>

      {/* Input (hidden for disabled/watching players) */}
      {!disabled && !hardLimited && (
        <form onSubmit={handleSubmit} className="npc-conv-input-row">
          <input
            className="npc-conv-input"
            placeholder={`Speak to ${npc.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="npc-conv-send" disabled={loading}>
            {loading ? '...' : '▶'}
          </button>
        </form>
      )}
      {hardLimited && (
        <div className="npc-conv-limited">The conversation has concluded.</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add NPC conversation styles to `src/hud/hud.css`**

```css
/* NPC Conversation (shared) */
.npc-conv {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.npc-conv-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px 16px;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.npc-conv-msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.npc-conv-npc { text-align: left; }
.npc-conv-player { text-align: right; }
.npc-conv-system { text-align: center; font-style: italic; }

.npc-conv-speaker {
  font-family: var(--font-heading);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.npc-conv-npc .npc-conv-speaker { color: var(--gold-bright); }
.npc-conv-player .npc-conv-speaker { color: #5ab0ee; }
.npc-conv-system .npc-conv-speaker { color: var(--gold-muted); }

.npc-conv-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
}

.npc-conv-npc .npc-conv-text {
  color: var(--gold-bright);
  font-style: italic;
}

.npc-conv-loading {
  animation: pulse 1.5s ease-in-out infinite;
}

.npc-conv-input-row {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid rgba(201, 168, 76, 0.15);
}

.npc-conv-input {
  flex: 1;
  background: rgba(10, 8, 14, 0.95);
  border: 1px solid rgba(201, 168, 76, 0.2);
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-heading);
  outline: none;
  border-radius: 0;
}

.npc-conv-input::placeholder { color: #5a4a30; }

.npc-conv-send {
  width: 42px;
  background: linear-gradient(135deg, #d4b85c, #9a7a30);
  border: none;
  color: #08060c;
  font-weight: 900;
  font-size: 14px;
  cursor: pointer;
  border-radius: 0;
  min-height: 0;
  padding: 0;
}

.npc-conv-limited {
  text-align: center;
  padding: 12px;
  color: var(--gold-muted);
  font-style: italic;
  font-size: 12px;
  font-family: var(--font-heading);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/NpcConversation.jsx src/lib/narratorApi.js src/hud/hud.css
git commit -m "feat: add shared NPC conversation component with AI chat and prompt limiting"
```

---

### Task 5: NPC Dialog Box

**Files:**
- Create: `src/components/NpcDialog.jsx`
- Modify: `src/GameV2.jsx` (render NpcDialog when activeNpc is set)

- [ ] **Step 1: Create `src/components/NpcDialog.jsx`**

```javascript
import { useEffect } from 'react'
import NpcConversation from './NpcConversation'
import { resolveHint } from '../lib/interactionController'
import { broadcastNpcDialogStart, broadcastNpcDialogEnd } from '../lib/liveChannel'
import useStore from '../store/useStore'

/**
 * Normal NPC dialog overlay. Center-bottom, above HUD bar.
 * Shows NPC's hint as opening line, then player can chat via AI.
 */
export default function NpcDialog({ npc, onClose }) {
  const user = useStore(s => s.user)
  const myCharacter = useStore(s => s.myCharacter)
  const storyFlags = useStore(s => s.storyFlags)

  const hint = resolveHint(npc, storyFlags)

  // Broadcast busy state on mount/unmount
  useEffect(() => {
    const playerName = myCharacter?.name || user?.email || 'Someone'
    broadcastNpcDialogStart(npc.name, user?.id, playerName)
    useStore.getState().setNpcBusy({ npcName: npc.name, playerId: user?.id, playerName })
    return () => {
      broadcastNpcDialogEnd(npc.name)
      useStore.getState().clearNpcBusy()
    }
  }, [npc.name, user?.id, myCharacter?.name, user?.email])

  // Escape / E to close
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        // Don't close if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          if (e.key === 'Escape') onClose()
          return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="npc-dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="npc-dialog">
        {/* Corner filigree */}
        <svg className="npc-dialog-corner npc-dialog-corner-tl" width="40" height="40" viewBox="0 0 40 40">
          <path d="M0,14 L0,4 Q0,0 4,0 L14,0" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5"/>
        </svg>
        <svg className="npc-dialog-corner npc-dialog-corner-tr" width="40" height="40" viewBox="0 0 40 40">
          <path d="M26,0 L36,0 Q40,0 40,4 L40,14" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5"/>
        </svg>
        <svg className="npc-dialog-corner npc-dialog-corner-bl" width="40" height="40" viewBox="0 0 40 40">
          <path d="M0,26 L0,36 Q0,40 4,40 L14,40" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5"/>
        </svg>
        <svg className="npc-dialog-corner npc-dialog-corner-br" width="40" height="40" viewBox="0 0 40 40">
          <path d="M26,40 L36,40 Q40,40 40,36 L40,26" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.5"/>
        </svg>

        {/* Header */}
        <div className="npc-dialog-header">
          <span className="npc-dialog-name">◆ {npc.name}</span>
          <span className="npc-dialog-role"> — {npc.role}</span>
          <button className="npc-dialog-close" onClick={onClose}>✕</button>
        </div>

        {/* Ornate divider */}
        <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none" className="npc-dialog-divider">
          <path d="M0,4 L150,4 Q175,0 200,4 Q225,8 250,4 L400,4" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>

        {/* Conversation */}
        <NpcConversation
          npc={npc}
          isCritical={false}
          initialMessage={hint}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add NPC dialog styles to `src/hud/hud.css`**

```css
/* NPC Dialog Overlay */
.npc-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 150px;
  pointer-events: auto;
}

.npc-dialog {
  position: relative;
  width: 90%;
  max-width: 520px;
  max-height: 320px;
  background: linear-gradient(180deg, rgba(16,12,22,0.98) 0%, rgba(8,6,12,0.98) 100%);
  border: 1px solid rgba(201, 168, 76, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.npc-dialog-corner { position: absolute; pointer-events: none; }
.npc-dialog-corner-tl { top: -2px; left: -2px; }
.npc-dialog-corner-tr { top: -2px; right: -2px; }
.npc-dialog-corner-bl { bottom: -2px; left: -2px; }
.npc-dialog-corner-br { bottom: -2px; right: -2px; }

.npc-dialog-header {
  padding: 10px 16px 6px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.npc-dialog-name {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--gold-bright);
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.npc-dialog-role {
  font-family: var(--font-heading);
  font-size: 10px;
  color: var(--gold-muted);
  letter-spacing: 1px;
}

.npc-dialog-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--gold-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  min-height: 0;
}

.npc-dialog-close:hover { color: var(--gold-bright); }

.npc-dialog-divider {
  display: block;
  margin: 0 12px 4px;
  width: calc(100% - 24px);
}
```

- [ ] **Step 3: Wire NpcDialog into GameV2.jsx**

In the render section of GameV2.jsx, add after the existing modals:
```javascript
      {/* NPC Dialog (normal) */}
      {activeNpc && !activeNpc.isCutscene && (
        <NpcDialog
          npc={activeNpc}
          onClose={() => setActiveNpc(null)}
        />
      )}
```

Add import:
```javascript
import NpcDialog from './components/NpcDialog'
```

- [ ] **Step 4: Commit**

```bash
git add src/components/NpcDialog.jsx src/hud/hud.css src/GameV2.jsx
git commit -m "feat: add ornate NPC dialog box with AI conversation"
```

---

### Task 6: Critical Story Cutscene

**Files:**
- Create: `src/components/StoryCutscene.jsx`
- Modify: `src/GameV2.jsx` (render cutscene, handle broadcast)

- [ ] **Step 1: Create `src/components/StoryCutscene.jsx`**

```javascript
import { useEffect, useCallback } from 'react'
import NpcConversation from './NpcConversation'
import { broadcastStoryCutsceneStart, broadcastStoryCutsceneEnd, broadcastStoryFlag, broadcastJournalEntry } from '../lib/liveChannel'
import { playZoneTransition } from '../engine/ZoneTransition'
import useStore from '../store/useStore'

const MAX_CRITICAL_PROMPTS = 10

/**
 * Full-screen story cutscene for critical NPCs.
 * Freezes all players, broadcasts conversation.
 */
export default function StoryCutscene({ npc, pixiRef, onClose, isWatching }) {
  const user = useStore(s => s.user)
  const myCharacter = useStore(s => s.myCharacter)
  const addStoryFlag = useStore(s => s.addStoryFlag)
  const addJournalEntry = useStore(s => s.addJournalEntry)

  // Broadcast cutscene start on mount (initiator only)
  useEffect(() => {
    if (!isWatching) {
      broadcastStoryCutsceneStart(npc.name, user?.id, npc.criticalInfo)
      useStore.getState().setActiveCutscene({ npcName: npc.name, initiatorId: user?.id })
    }
  }, [npc.name, npc.criticalInfo, user?.id, isWatching])

  const handleDone = useCallback(() => {
    if (!isWatching) {
      // Set story flag
      if (npc.criticalFlag) {
        addStoryFlag(npc.criticalFlag)
        broadcastStoryFlag(npc.criticalFlag)
      }
      // Add journal entry
      const entry = {
        type: 'critical',
        npcName: npc.name,
        zoneName: useStore.getState().zones?.[useStore.getState().currentZoneId]?.name || 'Unknown',
        text: npc.criticalInfo,
        flag: npc.criticalFlag,
      }
      addJournalEntry(entry)
      broadcastJournalEntry(entry)

      // End cutscene
      broadcastStoryCutsceneEnd(npc.name, npc.criticalFlag)
      useStore.getState().clearActiveCutscene()
    }
    onClose()
  }, [npc, isWatching, addStoryFlag, addJournalEntry, onClose])

  const playerName = myCharacter?.name || 'Adventurer'
  const playerClass = myCharacter?.class || 'Hero'

  return (
    <div className="story-cutscene-overlay">
      <div className="story-cutscene">
        {/* Corner filigree — double layer for drama */}
        <svg className="story-corner story-corner-tl" width="80" height="80" viewBox="0 0 80 80">
          <path d="M0,28 L0,8 Q0,0 8,0 L28,0" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
          <path d="M0,20 L0,5 Q0,0 5,0 L20,0" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>
        <svg className="story-corner story-corner-tr" width="80" height="80" viewBox="0 0 80 80">
          <path d="M52,0 L72,0 Q80,0 80,8 L80,28" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
          <path d="M60,0 L75,0 Q80,0 80,5 L80,20" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>
        <svg className="story-corner story-corner-bl" width="80" height="80" viewBox="0 0 80 80">
          <path d="M0,52 L0,72 Q0,80 8,80 L28,80" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
        </svg>
        <svg className="story-corner story-corner-br" width="80" height="80" viewBox="0 0 80 80">
          <path d="M52,80 L72,80 Q80,80 80,72 L80,52" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
        </svg>

        {/* Header */}
        <div className="story-header">
          <svg width="240" height="12" viewBox="0 0 240 12" className="story-header-divider">
            <path d="M0,6 L80,6 Q100,0 120,6 Q140,12 160,6 L240,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.4"/>
            <circle cx="120" cy="6" r="3" fill="#c9a84c" opacity="0.3"/>
          </svg>
          <h1 className="story-title">A Moment of Fate</h1>
          <svg width="240" height="12" viewBox="0 0 240 12" className="story-header-divider">
            <path d="M0,6 L80,6 Q100,12 120,6 Q140,0 160,6 L240,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.4"/>
            <circle cx="120" cy="6" r="3" fill="#c9a84c" opacity="0.3"/>
          </svg>
        </div>

        {/* Silhouettes */}
        <div className="story-silhouettes">
          <div className="story-silhouette">
            <div className="story-silhouette-figure story-silhouette-npc" />
            <span className="story-silhouette-name">{npc.name}</span>
            <span className="story-silhouette-role">{npc.role}</span>
          </div>
          <div className="story-silhouette">
            <div className="story-silhouette-figure story-silhouette-player" />
            <span className="story-silhouette-name">{playerName}</span>
            <span className="story-silhouette-role">{playerClass}</span>
          </div>
        </div>

        {/* Conversation */}
        <NpcConversation
          npc={npc}
          isCritical={true}
          initialMessage={npc.criticalInfo}
          maxPrompts={MAX_CRITICAL_PROMPTS}
          disabled={isWatching}
          onClose={handleDone}
        />

        {/* Done button */}
        {!isWatching && (
          <button className="story-done-btn" onClick={handleDone}>
            Done
          </button>
        )}
        {isWatching && (
          <div className="story-watching">Watching — {myCharacter?.name || 'a party member'} is speaking</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add cutscene styles to `src/hud/hud.css`**

```css
/* Story Cutscene */
.story-cutscene-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: radial-gradient(ellipse at center, #14101c 0%, #08060c 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.story-cutscene {
  position: relative;
  width: 90%;
  max-width: 640px;
  max-height: 85vh;
  background: linear-gradient(180deg, rgba(20,16,28,0.98) 0%, rgba(8,6,12,0.98) 100%);
  border: 1px solid rgba(201, 168, 76, 0.3);
  display: flex;
  flex-direction: column;
  padding: 24px 0 16px;
}

.story-corner { position: absolute; pointer-events: none; }
.story-corner-tl { top: -3px; left: -3px; }
.story-corner-tr { top: -3px; right: -3px; }
.story-corner-bl { bottom: -3px; left: -3px; }
.story-corner-br { bottom: -3px; right: -3px; }

.story-header {
  text-align: center;
  padding: 0 24px 12px;
}

.story-header-divider {
  display: block;
  margin: 0 auto;
}

.story-title {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--gold-bright);
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  text-shadow: 0 0 24px rgba(201, 168, 76, 0.3);
  margin: 8px 0;
}

.story-silhouettes {
  display: flex;
  justify-content: space-around;
  padding: 8px 32px 16px;
}

.story-silhouette {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.story-silhouette-figure {
  width: 60px;
  height: 80px;
  border-radius: 4px 4px 0 0;
  opacity: 0.6;
}

.story-silhouette-npc {
  background: linear-gradient(180deg, #2a2018 0%, #1a1008 100%);
  border: 1px solid rgba(201, 168, 76, 0.3);
  clip-path: polygon(20% 0%, 80% 0%, 90% 15%, 90% 100%, 10% 100%, 10% 15%);
}

.story-silhouette-player {
  background: linear-gradient(180deg, #182028 0%, #081018 100%);
  border: 1px solid rgba(68, 153, 221, 0.3);
  clip-path: polygon(20% 0%, 80% 0%, 90% 15%, 90% 100%, 10% 100%, 10% 15%);
}

.story-silhouette-name {
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold-bright);
}

.story-silhouette-role {
  font-size: 9px;
  color: var(--gold-muted);
  letter-spacing: 1px;
}

.story-done-btn {
  margin: 8px 24px 0;
  padding: 10px 24px;
  background: linear-gradient(135deg, #d4b85c, #9a7a30);
  border: none;
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #08060c;
  cursor: pointer;
  border-radius: 0;
  min-height: 0;
}

.story-watching {
  text-align: center;
  padding: 10px;
  color: var(--gold-muted);
  font-style: italic;
  font-size: 11px;
  font-family: var(--font-heading);
  letter-spacing: 1px;
}
```

- [ ] **Step 3: Wire StoryCutscene into GameV2.jsx**

Add import, store selector, and render:
```javascript
import StoryCutscene from './components/StoryCutscene'
```

Add store selector near the top of GameV2:
```javascript
  const activeCutscene = useStore(s => s.activeCutscene)
```

In the render, add after the NpcDialog:
```javascript
      {/* Story Cutscene (critical NPC — initiator) */}
      {activeNpc && activeNpc.isCutscene && (
        <StoryCutscene
          npc={activeNpc}
          pixiRef={pixiRef}
          onClose={() => setActiveNpc(null)}
          isWatching={false}
        />
      )}
      {/* Story Cutscene (non-initiator — watching via broadcast) */}
      {!activeNpc && activeCutscene && activeCutscene.initiatorId !== user?.id && (
        <StoryCutscene
          npc={{ name: activeCutscene.npcName, criticalInfo: activeCutscene.criticalInfo, role: '' }}
          pixiRef={pixiRef}
          onClose={() => {}}
          isWatching={true}
        />
      )}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/StoryCutscene.jsx src/hud/hud.css src/GameV2.jsx
git commit -m "feat: add critical story cutscene with full-screen takeover and silhouettes"
```

---

### Task 7: Chat Bubbles

**Files:**
- Create: `src/components/ChatBubble.jsx`
- Modify: `src/GameV2.jsx` (render chat bubbles based on proximity)

- [ ] **Step 1: Create `src/components/ChatBubble.jsx`**

HTML overlay positioned above NPC tokens using PixiJS world-to-screen coordinates.

```javascript
import { resolveHint } from '../lib/interactionController'
import useStore from '../store/useStore'

/**
 * Floating chat bubble above an NPC token.
 * Positioned using PixiJS world-to-screen coordinate conversion.
 */
export default function ChatBubble({ npc, tileSize, worldTransform }) {
  const storyFlags = useStore(s => s.storyFlags)
  const hint = resolveHint(npc, storyFlags)
  if (!hint || !npc.position || !worldTransform) return null

  // Convert NPC tile position to screen coordinates
  const screenX = npc.position.x * tileSize * worldTransform.scale + worldTransform.x + (tileSize * worldTransform.scale) / 2
  const screenY = npc.position.y * tileSize * worldTransform.scale + worldTransform.y - 8

  // Truncate long hints
  const displayText = hint.length > 60 ? hint.slice(0, 57) + '...' : hint

  return (
    <div
      className="chat-bubble"
      style={{
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <span className="chat-bubble-text">{displayText}</span>
      <div className="chat-bubble-tail" />
    </div>
  )
}
```

- [ ] **Step 2: Add chat bubble styles to `src/hud/hud.css`**

```css
/* Chat Bubbles */
.chat-bubble {
  position: absolute;
  z-index: 12;
  background: rgba(10, 8, 14, 0.92);
  border: 1px solid rgba(201, 168, 76, 0.3);
  padding: 5px 10px;
  max-width: 180px;
  pointer-events: none;
  animation: fadeIn 0.2s ease-out;
}

.chat-bubble-text {
  font-family: var(--font-heading);
  font-size: 10px;
  color: var(--gold-bright);
  font-style: italic;
  line-height: 1.4;
}

.chat-bubble-tail {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(201, 168, 76, 0.3);
}
```

- [ ] **Step 3: Wire chat bubbles in GameV2.jsx**

Expose world transform from PixiApp via ref. Add a method to PixiApp's `useImperativeHandle`:

In `src/engine/PixiApp.jsx`, find `useImperativeHandle` and add:
```javascript
    getWorldTransform: () => {
      const w = worldRef.current
      if (!w) return null
      return { x: w.x, y: w.y, scale: w.scale.x }
    },
```

In `GameV2.jsx`, compute nearby NPCs and render bubbles:

```javascript
  // Compute which NPCs are close enough to show chat bubbles
  const nearbyNpcs = useMemo(() => {
    if (!zone?.npcs || inCombat || activeNpc) return []
    return zone.npcs.filter(npc => {
      if (!npc.position) return false
      const dx = Math.abs(playerPos.x - npc.position.x)
      const dy = Math.abs(playerPos.y - npc.position.y)
      return dx <= 3 && dy <= 3
    })
  }, [playerPos, zone, inCombat, activeNpc])

  const [worldTransform, setWorldTransform] = useState(null)

  // Update world transform periodically for bubble positioning
  useEffect(() => {
    function updateTransform() {
      const t = pixiRef.current?.getWorldTransform?.()
      if (t) setWorldTransform(t)
    }
    updateTransform()
    const interval = setInterval(updateTransform, 200)
    return () => clearInterval(interval)
  }, [zone])
```

In the render, add bubbles inside the game div (after PixiApp, before GameHUD):
```javascript
      {/* NPC Chat Bubbles */}
      {nearbyNpcs.map(npc => (
        <ChatBubble
          key={npc.name}
          npc={npc}
          tileSize={32}
          worldTransform={worldTransform}
        />
      ))}
```

Add import:
```javascript
import ChatBubble from './components/ChatBubble'
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ChatBubble.jsx src/engine/PixiApp.jsx src/hud/hud.css src/GameV2.jsx
git commit -m "feat: add NPC chat bubbles as HTML overlays with dynamic hint text"
```

---

### Task 8: Player Journal

**Files:**
- Create: `src/components/JournalModal.jsx`
- Modify: `src/hud/ActionArea.jsx` (add JOURNAL button)
- Modify: `src/GameV2.jsx` (wire journal modal)

- [ ] **Step 1: Create `src/components/JournalModal.jsx`**

```javascript
import useStore from '../store/useStore'

/**
 * Player journal — ornate parchment/scroll modal showing story events.
 */
export default function JournalModal({ onClose }) {
  const journal = useStore(s => s.journal) || []

  const criticalEntries = journal.filter(e => e.type === 'critical')
  const questEntries = journal.filter(e => e.type === 'sidequest')

  return (
    <div className="journal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="journal-modal">
        {/* Close */}
        <button className="journal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="journal-header">
          <svg width="180" height="10" viewBox="0 0 180 10" className="journal-divider">
            <path d="M0,5 L60,5 Q75,0 90,5 Q105,10 120,5 L180,5" fill="none" stroke="#4a3520" strokeWidth="1" opacity="0.6"/>
          </svg>
          <h1 className="journal-title">Journal</h1>
          <svg width="180" height="10" viewBox="0 0 180 10" className="journal-divider">
            <path d="M0,5 L60,5 Q75,10 90,5 Q105,0 120,5 L180,5" fill="none" stroke="#4a3520" strokeWidth="1" opacity="0.6"/>
          </svg>
        </div>

        {/* Content */}
        <div className="journal-content">
          {journal.length === 0 ? (
            <p className="journal-empty">Your journal is empty. Speak with the people of this world to uncover its secrets.</p>
          ) : (
            <>
              {criticalEntries.length > 0 && (
                <div className="journal-section">
                  <h2 className="journal-section-title">◆ Story Events</h2>
                  {criticalEntries.map((entry, i) => (
                    <div key={i} className="journal-entry journal-entry-critical">
                      <div className="journal-entry-header">
                        <span className="journal-entry-npc">{entry.npcName}</span>
                        <span className="journal-entry-zone">{entry.zoneName}</span>
                      </div>
                      <p className="journal-entry-text">{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {questEntries.length > 0 && (
                <div className="journal-section">
                  <h2 className="journal-section-title">◆ Quests</h2>
                  {questEntries.map((entry, i) => (
                    <div key={i} className="journal-entry">
                      <div className="journal-entry-header">
                        <span className="journal-entry-npc">{entry.npcName}</span>
                        <span className="journal-entry-zone">{entry.zoneName}</span>
                      </div>
                      <p className="journal-entry-text">{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add journal styles to `src/hud/hud.css`**

```css
/* Journal Modal — Parchment Scroll */
.journal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
}

.journal-modal {
  position: relative;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  background: linear-gradient(180deg, #2a2010 0%, #1e180c 40%, #2a2010 100%);
  border: 2px solid #4a3520;
  padding: 28px 32px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.8), inset 0 0 60px rgba(42, 32, 16, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.journal-close {
  position: absolute;
  top: 10px;
  right: 14px;
  background: transparent;
  border: none;
  color: #6a5a40;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  min-height: 0;
}

.journal-header {
  text-align: center;
  margin-bottom: 16px;
}

.journal-divider { display: block; margin: 0 auto; }

.journal-title {
  font-family: var(--font-display);
  font-size: 22px;
  color: #4a3520;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin: 6px 0;
}

.journal-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.journal-empty {
  color: #6a5a40;
  font-style: italic;
  text-align: center;
  font-size: 13px;
  line-height: 1.7;
  padding: 24px 0;
}

.journal-section { margin-bottom: 20px; }

.journal-section-title {
  font-family: var(--font-heading);
  font-size: 11px;
  color: #8a6a40;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 0 0 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(74, 53, 32, 0.3);
}

.journal-entry {
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 2px solid rgba(74, 53, 32, 0.2);
}

.journal-entry-critical {
  border-left-color: #c9a84c;
}

.journal-entry-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.journal-entry-npc {
  font-family: var(--font-heading);
  font-size: 11px;
  color: #aa8a50;
  font-weight: 700;
}

.journal-entry-zone {
  font-size: 9px;
  color: #6a5a40;
  font-style: italic;
}

.journal-entry-text {
  font-size: 12px;
  color: #8a7a60;
  line-height: 1.6;
  margin: 0;
}
```

- [ ] **Step 3: Add JOURNAL to ActionArea**

In `src/hud/ActionArea.jsx`, add to the TOOLS array:
```javascript
const TOOLS = [
  { icon: '🎲', label: 'DICE', key: 'dice' },
  { icon: '📜', label: 'CHAR', key: 'character' },
  { icon: '🎒', label: 'PACK', key: 'inventory' },
  { icon: '📖', label: 'JOURNAL', key: 'journal' },
  { icon: '🏕', label: 'REST', key: 'rest' },
]
```

- [ ] **Step 4: Wire journal in GameV2.jsx**

Add import:
```javascript
import JournalModal from './components/JournalModal'
```

Add state:
```javascript
const [showJournal, setShowJournal] = useState(false)
```

In `handleTool`, add the journal case:
```javascript
    else if (tool === 'journal') setShowJournal(true)
```

In the render, add:
```javascript
      {showJournal && <JournalModal onClose={() => setShowJournal(false)} />}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/JournalModal.jsx src/hud/ActionArea.jsx src/hud/hud.css src/GameV2.jsx
git commit -m "feat: add player journal with parchment scroll aesthetic"
```

---

### Task 9: Update Demo World + Campaign Generator

**Files:**
- Modify: `src/data/demoWorld.json` (add hints, critical, sideQuest to NPCs)
- Modify: `src/lib/campaignGenerator.js` (handle new NPC fields)

- [ ] **Step 1: Update demoWorld.json NPC data**

Find each NPC in the JSON and add the new fields. Example for town_square zone NPCs:

```json
"npcs": [
  {
    "name": "Elder Maren",
    "role": "quest_giver",
    "personality": "worried elder, begs adventurers for help",
    "position": { "x": 8, "y": 7 },
    "questRelevant": true,
    "critical": true,
    "criticalInfo": "Three villagers have vanished in the brackenwood this moon. The old ruins there have awakened — something ancient stirs beneath the stones. You must investigate before more are lost.",
    "criticalFlag": "critical_elder_maren_info",
    "sideQuest": null,
    "hints": [
      { "after": null, "text": "Please, adventurers... we need help..." },
      { "after": "critical_elder_maren_info", "text": "The brackenwood awaits. Please hurry." },
      { "after": "cleared_brackenwood", "text": "You've done it! The village owes you everything." }
    ]
  },
  {
    "name": "Guard Theron",
    "role": "guard",
    "personality": "stern but fair, warns about forest dangers",
    "position": { "x": 3, "y": 4 },
    "questRelevant": false,
    "critical": false,
    "criticalInfo": null,
    "criticalFlag": null,
    "sideQuest": "Guard Theron lost his family sword in the brackenwood during a patrol gone wrong",
    "hints": [
      { "after": null, "text": "The forest ain't safe. Stay on the road." },
      { "after": "critical_elder_maren_info", "text": "So the Elder sent you? Watch yourself out there." },
      { "after": "cleared_brackenwood", "text": "You actually came back alive. I'm impressed." }
    ]
  }
]
```

Update ALL NPCs across all zones in demoWorld.json with appropriate hints, critical flags, and side quests. Every NPC should have at least 2 hints.

- [ ] **Step 2: Update `src/lib/campaignGenerator.js` to handle new NPC fields**

In `mergeZoneWithTemplate`, the NPC mapping already passes through all fields, so no change needed — the spread `{ ...npc }` preserves hints, critical, etc.

Add a `storyMilestones` passthrough in `buildWorldFromAiOutput`:

```javascript
  return {
    title: aiWorld.title,
    startZone: aiWorld.startZone,
    questObjectives: aiWorld.questObjectives || [],
    storyMilestones: aiWorld.storyMilestones || [],
    zones: zonesMap,
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/data/demoWorld.json src/lib/campaignGenerator.js
git commit -m "feat: update demo world NPCs with hints, critical flags, and side quests"
```

---

### Task 10: Broadcast Listeners + Build Check

**Files:**
- Modify: `src/App.jsx` (add broadcast listeners for NPC dialog, cutscene, story flags, journal)
- Modify: `tasks/status.md`

- [ ] **Step 1: Add broadcast listeners in App.jsx**

Find the existing broadcast listener section (after `api-key-sync` listener, around line 171). Add:

```javascript
    // NPC dialog busy state
    ch.on('broadcast', { event: 'npc-dialog-start' }, ({ payload }) => {
      useStore.getState().setNpcBusy(payload)
    })
    ch.on('broadcast', { event: 'npc-dialog-end' }, () => {
      useStore.getState().clearNpcBusy()
    })

    // Story cutscene — freeze all players
    ch.on('broadcast', { event: 'story-cutscene-start' }, ({ payload }) => {
      useStore.getState().setActiveCutscene(payload)
    })
    ch.on('broadcast', { event: 'story-cutscene-end' }, ({ payload }) => {
      useStore.getState().clearActiveCutscene()
      if (payload.storyFlag) useStore.getState().addStoryFlag(payload.storyFlag)
    })

    // Cutscene conversation relay — update watching players
    ch.on('broadcast', { event: 'cutscene-message' }, ({ payload }) => {
      // Handled by StoryCutscene component via store
    })

    // Story flag sync
    ch.on('broadcast', { event: 'story-flag' }, ({ payload }) => {
      useStore.getState().addStoryFlag(payload.flag)
    })

    // Journal entry sync
    ch.on('broadcast', { event: 'journal-entry' }, ({ payload }) => {
      useStore.getState().addJournalEntry(payload)
    })
```

- [ ] **Step 2: Build check**

```bash
cd C:/Dev/dms-tome && npm run build
```

Expected: No build errors. Fix any import issues.

- [ ] **Step 3: Update `tasks/status.md`**

Add after the V2 Front Door section:
```markdown
### NPC Interaction System ✅ COMPLETE
- [x] E-key universal interaction (NPCs, exits)
- [x] NPC click detection in PixiApp
- [x] Interaction controller (adjacency, hint resolution)
- [x] NPC chat bubbles (HTML overlays, story-flag-driven hints)
- [x] NPC dialog box (ornate overlay, AI conversation)
- [x] Critical story cutscene (full-screen, freezes party, silhouettes)
- [x] Story flags system (Zustand slice, broadcast sync)
- [x] Player journal (parchment scroll modal, auto-populated)
- [x] Shared NPC conversation component (prompt counting, hard limits)
- [x] Campaign generator + demo world updated with new NPC schema
- [x] Multiplayer broadcast (dialog lock, cutscene sync, flag sync, journal sync)
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx tasks/status.md
git commit -m "feat: wire NPC broadcast listeners, update status — NPC interaction system complete"
```
