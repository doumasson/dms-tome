# V2 Front Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make V2 playable — API key gate, campaign bar with invite, combat fix, HUD labels, chat polish.

**Architecture:** Six independent features layered onto the existing V2 HUD. New modules: `apiKeyVault.js` (Web Crypto encryption), `sanitize.js` (input/output cleaning), `ApiKeyGate.jsx` (full-screen blocker), `CampaignBar.jsx` (top-right info bar). Changes to existing HUD components are additive.

**Tech Stack:** React, Zustand, Supabase (campaigns.settings JSONB), Web Crypto API (AES-GCM + PBKDF2), existing PixiJS + HUD infrastructure.

**Spec:** `docs/superpowers/specs/2026-03-18-v2-front-door-design.md`

---

### Task 1: Input/Output Sanitization Module

**Files:**
- Create: `src/lib/sanitize.js`
- Modify: `src/lib/narratorApi.js:163-218` (callNarrator function)

**Why first:** No dependencies, and every subsequent task that touches AI calls benefits from this being in place.

- [ ] **Step 1: Create `src/lib/sanitize.js`**

```javascript
// Prompt injection patterns to strip from user input
const INJECTION_PATTERNS = [
  // GPT / Llama tokens
  /<\|system\|>/gi, /<\|user\|>/gi, /<\|assistant\|>/gi, /<\|endoftext\|>/gi,
  /\[INST\]/gi, /\[\/INST\]/gi, /<<SYS>>/gi, /<\/SYS>>/gi,
  // Claude legacy format
  /\n\nHuman:/g, /\n\nAssistant:/g,
  // Claude Messages API XML
  /<\/?instructions>/gi, /<\/?system>/gi, /<\/?human>/gi, /<\/?assistant>/gi,
]

const MAX_INPUT_LENGTH = 4000

/**
 * Sanitize user input before sending to Claude API.
 * Strips prompt injection patterns and caps length.
 */
export function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return ''
  let clean = text
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, '')
  }
  // Strip null bytes
  clean = clean.replace(/\0/g, '')
  // Cap length
  if (clean.length > MAX_INPUT_LENGTH) {
    clean = clean.slice(0, MAX_INPUT_LENGTH)
  }
  return clean.trim()
}

// HTML tags that are dangerous in rendered output
const DANGEROUS_HTML = /<\s*(script|iframe|object|embed|form|meta|link|base|svg\s+on|img\s+[^>]*onerror)[^>]*>/gi

/**
 * Sanitize AI response before rendering in the UI.
 * Strips dangerous HTML and javascript: URLs.
 */
export function sanitizeOutput(text) {
  if (!text || typeof text !== 'string') return ''
  let clean = text
  // Strip dangerous HTML tags
  clean = clean.replace(DANGEROUS_HTML, '')
  // Strip javascript: URLs in markdown links
  clean = clean.replace(/\[([^\]]*)\]\(javascript:[^)]*\)/gi, '$1')
  return clean
}
```

- [ ] **Step 2: Wire sanitization into `callNarrator` in `src/lib/narratorApi.js`**

Add import at top of file:
```javascript
import { sanitizeInput, sanitizeOutput } from './sanitize'
```

In `callNarrator` function (line 163), sanitize the user messages before sending:
```javascript
export async function callNarrator({ messages, systemPrompt, apiKey }) {
  // Sanitize user messages before sending to API
  const sanitizedMessages = messages.map(m => ({
    ...m,
    content: m.role === 'user' ? sanitizeInput(m.content) : m.content,
  }))

  const response = await fetch(CLAUDE_API_URL, {
    // ... existing fetch config ...
    body: JSON.stringify({
      model: NARRATOR_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: sanitizedMessages,  // use sanitized messages
    }),
  })
```

At the end of `callNarrator`, sanitize the narrative output before returning. In the `try` block where `parsed.narrative` is returned (around line 204):
```javascript
    if (parsed && typeof parsed.narrative === 'string') {
      parsed.narrative = sanitizeOutput(parsed.narrative)
      return parsed
    }
```

And in the regex fallback (around line 211):
```javascript
      return {
        narrative: sanitizeOutput(narrativeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')),
        // ...
      }
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/sanitize.js src/lib/narratorApi.js
git commit -m "feat: add input/output sanitization for AI narrator calls"
```

---

### Task 2: API Key Vault Module

**Files:**
- Create: `src/lib/apiKeyVault.js`

**Why:** Foundation for Tasks 3 and 4. Pure utility module, no UI.

- [ ] **Step 1: Create `src/lib/apiKeyVault.js`**

```javascript
import { supabase } from './supabase'

const PBKDF2_ITERATIONS = 10000

/**
 * Derive an AES-GCM encryption key from campaign ID + user ID using PBKDF2.
 * This is obfuscation at rest — not true encryption (key material is public).
 * See spec for security tradeoff documentation.
 */
async function deriveKey(campaignId, userId) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${campaignId}:${userId}`),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('dms-tome-vault'),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function isSubtleCryptoAvailable() {
  return typeof crypto !== 'undefined' && crypto.subtle != null
}

/**
 * Encrypt an API key. Returns { iv, ciphertext } as base64 strings.
 * Falls back to plaintext wrapper if SubtleCrypto unavailable (dev HTTP).
 */
export async function encryptApiKey(key, campaignId, userId) {
  if (!isSubtleCryptoAvailable()) {
    console.warn('[apiKeyVault] SubtleCrypto unavailable (non-HTTPS?) — storing plaintext')
    return { iv: '', ciphertext: btoa(key), plaintext: true }
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(key)
  const derivedKey = await deriveKey(campaignId, userId)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encoded
  )
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  }
}

/**
 * Decrypt an API key from { iv, ciphertext } base64 strings.
 * Handles plaintext fallback for dev mode.
 */
export async function decryptApiKey(payload, campaignId, userId) {
  if (!payload) return null
  // Dev-mode plaintext fallback
  if (payload.plaintext) return atob(payload.ciphertext)
  if (!isSubtleCryptoAvailable()) {
    console.warn('[apiKeyVault] SubtleCrypto unavailable — cannot decrypt')
    return null
  }
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0))
  const data = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0))
  const derivedKey = await deriveKey(campaignId, userId)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    data
  )
  return new TextDecoder().decode(decrypted)
}

/**
 * Save encrypted API key to Supabase campaign settings.
 */
export async function saveApiKeyToSupabase(campaignId, encryptedPayload) {
  const { data: cur } = await supabase
    .from('campaigns').select('settings').eq('id', campaignId).single()
  const settings = { ...(cur?.settings || {}), encrypted_api_key: encryptedPayload }
  // Remove old plaintext key if present
  delete settings.claudeApiKey
  await supabase
    .from('campaigns')
    .update({ settings })
    .eq('id', campaignId)
}

/**
 * Load encrypted API key from Supabase campaign settings.
 * Handles backward compatibility: if old plaintext `claudeApiKey` exists,
 * migrates it to encrypted format and returns the decrypted key.
 */
export async function loadApiKeyFromSupabase(campaignId, userId) {
  const { data } = await supabase
    .from('campaigns').select('settings').eq('id', campaignId).single()
  const settings = data?.settings
  if (!settings) return null

  // New encrypted format
  if (settings.encrypted_api_key) {
    try {
      return await decryptApiKey(settings.encrypted_api_key, campaignId, userId)
    } catch (e) {
      console.error('[apiKeyVault] Decryption failed:', e)
      return null
    }
  }

  // Old plaintext format — migrate
  if (settings.claudeApiKey && typeof settings.claudeApiKey === 'string') {
    console.log('[apiKeyVault] Migrating plaintext key to encrypted format')
    const encrypted = await encryptApiKey(settings.claudeApiKey, campaignId, userId)
    await saveApiKeyToSupabase(campaignId, encrypted)
    return settings.claudeApiKey
  }

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/apiKeyVault.js
git commit -m "feat: add API key vault with Web Crypto encryption and Supabase storage"
```

---

### Task 3: API Key Gate Component

**Files:**
- Create: `src/components/ApiKeyGate.jsx`

**Why:** The full-screen blocker that prevents game access without an API key. Depends on Task 2 (apiKeyVault).

- [ ] **Step 1: Create `src/components/ApiKeyGate.jsx`**

```javascript
import { useState } from 'react'
import { encryptApiKey, saveApiKeyToSupabase } from '../lib/apiKeyVault'
import { broadcastApiKeySync } from '../lib/liveChannel'
import useStore from '../store/useStore'

/**
 * Full-screen gate shown when no API key is available.
 * DM: sees input field to enter key.
 * Non-DM: sees waiting message (key comes via broadcast from DM).
 */
export default function ApiKeyGate({ campaignId, userId, onKeyReady }) {
  const isDM = useStore(s => s.isDM)
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      const encrypted = await encryptApiKey(trimmed, campaignId, userId)
      await saveApiKeyToSupabase(campaignId, encrypted)
      broadcastApiKeySync(trimmed)
      useStore.getState().setSessionApiKey(trimmed)
      onKeyReady?.(trimmed)
    } catch (err) {
      console.error('[ApiKeyGate] Save failed:', err)
      setError('Failed to save key. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.gate}>
        {/* Ornate corner filigree */}
        <svg style={styles.cornerTL} width="60" height="60" viewBox="0 0 60 60">
          <path d="M0,20 L0,6 Q0,0 6,0 L20,0" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
          <path d="M0,14 L0,4 Q0,0 4,0 L14,0" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>
        <svg style={styles.cornerTR} width="60" height="60" viewBox="0 0 60 60">
          <path d="M40,0 L54,0 Q60,0 60,6 L60,20" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
          <path d="M46,0 L56,0 Q60,0 60,4 L60,14" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>
        <svg style={styles.cornerBL} width="60" height="60" viewBox="0 0 60 60">
          <path d="M0,40 L0,54 Q0,60 6,60 L20,60" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
        </svg>
        <svg style={styles.cornerBR} width="60" height="60" viewBox="0 0 60 60">
          <path d="M40,60 L54,60 Q60,60 60,54 L60,40" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
        </svg>

        {/* Decorative divider */}
        <svg width="200" height="12" viewBox="0 0 200 12" style={{ margin: '0 auto 16px', display: 'block' }}>
          <path d="M0,6 L70,6 Q85,0 100,6 Q115,12 130,6 L200,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.4"/>
          <circle cx="100" cy="6" r="3" fill="#c9a84c" opacity="0.3"/>
        </svg>

        <h1 style={styles.title}>
          {isDM ? 'The Dungeon Master Awaits' : 'Awaiting the Dungeon Master'}
        </h1>
        <p style={styles.subtitle}>
          {isDM
            ? 'An API key is required to summon the AI Dungeon Master.'
            : 'Waiting for the Dungeon Master to share the realm key...'}
        </p>

        {isDM ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Claude API Key
              <span style={styles.labelHint}> — console.anthropic.com</span>
            </label>
            <div style={styles.inputRow}>
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="sk-ant-..."
                style={styles.input}
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              <button type="button" onClick={() => setShow(!show)} style={styles.toggleBtn}>
                {show ? '◉' : '○'}
              </button>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={saving || !key.trim()} style={styles.enterBtn}>
              {saving ? 'Entering...' : 'Enter the Realm'}
            </button>
          </form>
        ) : (
          <div style={styles.waitingDots}>
            <span style={styles.dot}>◆</span>
            <span style={{ ...styles.dot, animationDelay: '0.3s' }}>◆</span>
            <span style={{ ...styles.dot, animationDelay: '0.6s' }}>◆</span>
          </div>
        )}

        {/* Bottom divider */}
        <svg width="200" height="12" viewBox="0 0 200 12" style={{ margin: '16px auto 0', display: 'block' }}>
          <path d="M0,6 L70,6 Q85,12 100,6 Q115,0 130,6 L200,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.4"/>
          <circle cx="100" cy="6" r="3" fill="#c9a84c" opacity="0.3"/>
        </svg>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'radial-gradient(ellipse at center, #14101c 0%, #08060c 70%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  gate: {
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(20,16,28,0.98) 0%, rgba(8,6,12,0.98) 100%)',
    border: '1px solid rgba(201,168,76,0.25)',
    padding: '48px 56px',
    maxWidth: 480, width: '90%',
    textAlign: 'center',
  },
  cornerTL: { position: 'absolute', top: -2, left: -2 },
  cornerTR: { position: 'absolute', top: -2, right: -2 },
  cornerBL: { position: 'absolute', bottom: -2, left: -2 },
  cornerBR: { position: 'absolute', bottom: -2, right: -2 },
  title: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
    color: '#eedd88', fontSize: 22, fontWeight: 700,
    letterSpacing: 3, margin: '0 0 12px',
    textShadow: '0 0 20px rgba(201,168,76,0.3)',
  },
  subtitle: {
    fontFamily: "'Cinzel', serif",
    color: '#8a7a52', fontSize: 13, lineHeight: 1.7,
    margin: '0 0 28px', letterSpacing: 1,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: {
    fontFamily: "'Cinzel', serif", color: '#bba878',
    fontSize: 11, fontWeight: 700, letterSpacing: 2,
    textTransform: 'uppercase', textAlign: 'left',
  },
  labelHint: {
    color: '#5a4a30', fontSize: 9, fontFamily: 'monospace',
    fontWeight: 400, letterSpacing: 0, textTransform: 'none',
  },
  inputRow: { display: 'flex', gap: 4 },
  input: {
    flex: 1,
    background: 'rgba(10,8,14,0.95)',
    border: '1px solid rgba(201,168,76,0.2)',
    padding: '14px 16px', color: '#bba878', fontSize: 14,
    fontFamily: 'monospace', letterSpacing: 1,
    outline: 'none', borderRadius: 0,
  },
  toggleBtn: {
    width: 42, background: 'rgba(10,8,14,0.95)',
    border: '1px solid rgba(201,168,76,0.15)',
    color: '#8a7a52', cursor: 'pointer', fontSize: 16,
    borderRadius: 0, padding: 0, minHeight: 0,
  },
  error: { color: '#cc3333', fontSize: 11, margin: 0, textAlign: 'left' },
  enterBtn: {
    background: 'linear-gradient(135deg, #d4b85c, #9a7a30)',
    border: 'none', padding: '14px 24px',
    fontFamily: "'Cinzel', serif", fontSize: 13,
    fontWeight: 900, letterSpacing: 3, color: '#08060c',
    cursor: 'pointer', textTransform: 'uppercase',
    marginTop: 8, borderRadius: 0, minHeight: 0,
  },
  waitingDots: {
    display: 'flex', justifyContent: 'center', gap: 12, padding: '20px 0',
  },
  dot: {
    color: '#c9a84c', fontSize: 10, opacity: 0.4,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
}
```

- [ ] **Step 2: Add pulse animation to `src/hud/hud.css`**

Append to bottom of file:
```css
/* ApiKeyGate waiting pulse */
@keyframes pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.8; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ApiKeyGate.jsx src/hud/hud.css
git commit -m "feat: add ornate API key gate screen blocking game without key"
```

---

### Task 4: Wire API Key Gate + Remove localStorage + resetCampaign

**Files:**
- Modify: `src/GameV2.jsx` (remove localStorage reads, add gate logic)
- Modify: `src/components/ApiKeySettings.jsx` (rewrite for vault)
- Modify: `src/lib/liveChannel.js` (add request-api-key broadcast)
- Modify: `src/App.jsx` (add request-api-key listener, pass onLeave prop)
- Modify: `src/store/useStore.js` (add resetCampaign action)

**Why:** Connects all the pieces — gate blocks game, vault handles storage, broadcast handles multiplayer sync.

- [ ] **Step 1: Add request-api-key broadcast functions to `src/lib/liveChannel.js`**

Add after the existing `broadcastApiKeySync` function (after line 32):
```javascript
// Non-DM player requests the API key from DM on refresh/rejoin
export function broadcastRequestApiKey() {
  _channel?.send({ type: 'broadcast', event: 'request-api-key', payload: {} })
}
```

- [ ] **Step 2: Add request-api-key listener in `src/App.jsx`**

Find the existing `api-key-sync` listener (around line 171). After it, add:
```javascript
    // Non-DM player requests API key → DM re-broadcasts it
    ch.on('broadcast', { event: 'request-api-key' }, () => {
      const state = useStore.getState()
      if (state.isDM && state.sessionApiKey) {
        broadcastApiKeySync(state.sessionApiKey)
      }
    })
```

Add `broadcastApiKeySync` to the import from `liveChannel.js` at the top of `App.jsx` (it may already be imported — check first).

- [ ] **Step 2b: Add `resetCampaign` action to `src/store/useStore.js`**

Find `clearActiveCampaign` (line 89) and add `resetCampaign` right after it:
```javascript
  clearActiveCampaign: () => set({ activeCampaign: null, isDM: false, dmMode: false, myCharacter: null, partyMembers: [] }),
  resetCampaign: () => set({
    campaign: {}, activeCampaign: null, currentZoneId: null, zones: null,
    visitedZones: new Set(), zoneTokenPositions: {}, pendingEntryPoint: null,
    encounter: { phase: 'idle', combatants: [], currentTurn: 0, round: 1, log: [], activeEffects: [] },
    partyMembers: [], narrator: { history: [], open: false },
    sessionApiKey: null, isDM: false, dmMode: false, myCharacter: null,
  }),
```

- [ ] **Step 2c: Update `handleLeaveCampaign` in `src/App.jsx` to use `resetCampaign`**

Replace the existing `handleLeaveCampaign` function (line 416-420):
```javascript
  function handleLeaveCampaign() {
    localStorage.removeItem('activeCampaignId');
    useStore.getState().resetCampaign();
    setAppView('select');
  }
```

- [ ] **Step 3: Pass `onLeave` prop to `GameV2` in `src/App.jsx`**

Find where `<GameV2 />` is rendered (around line 570):
```javascript
// Change from:
return <GameV2 />;
// To:
return <GameV2 onLeave={handleLeaveCampaign} />;
```

- [ ] **Step 4: Rewrite `src/GameV2.jsx` — add gate, remove localStorage**

Update the component signature to accept `onLeave`:
```javascript
export default function GameV2({ onLeave }) {
```

Add imports at the top:
```javascript
import ApiKeyGate from './components/ApiKeyGate'
import { loadApiKeyFromSupabase } from './lib/apiKeyVault'
import { broadcastRequestApiKey, broadcastApiKeySync } from './lib/liveChannel'
```

Update the existing liveChannel import to include `broadcastApiKeySync` (merge with existing import line 7):
```javascript
import { broadcastZoneTransition, broadcastNarratorMessage, broadcastApiKeySync, broadcastRequestApiKey } from './lib/liveChannel'
```

Add API key loading state after the existing `useState` declarations (around line 56):
```javascript
const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
```

Add a new useEffect to load the API key from Supabase on mount (after the zone load effect, around line 91):
```javascript
  // Load API key from Supabase on mount
  useEffect(() => {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id
    if (!campaignId || !user?.id) {
      // No campaign context (e.g. ?v2 testing) — check sessionApiKey
      if (sessionApiKey) setApiKeyLoaded(true)
      return
    }
    if (isDM) {
      loadApiKeyFromSupabase(campaignId, user.id).then(key => {
        if (key) {
          useStore.getState().setSessionApiKey(key)
          broadcastApiKeySync(key)
        }
        setApiKeyLoaded(true)
      }).catch(() => setApiKeyLoaded(true))
    } else {
      // Non-DM: request key from DM
      broadcastRequestApiKey()
      // Give DM 2s to respond, then show gate
      const timer = setTimeout(() => setApiKeyLoaded(true), 2000)
      // If key arrives via broadcast before timeout, mark loaded
      const unsub = useStore.subscribe((state) => {
        if (state.sessionApiKey) { clearTimeout(timer); setApiKeyLoaded(true) }
      })
      return () => { clearTimeout(timer); unsub() }
    }
  }, [campaign?.id, user?.id, isDM])
```

Add `broadcastApiKeySync` to the import from `liveChannel.js`.

Replace all 3 localStorage fallbacks in GameV2. Change every occurrence of:
```javascript
const apiKey = sessionApiKey || localStorage.getItem('claude_api_key')
```
To:
```javascript
const apiKey = sessionApiKey
```

This appears on lines 249, 268, and 283.

In the render, add the gate before the main game content. Replace the existing return starting at line 366:
```javascript
  // Gate: no API key = no game
  if (apiKeyLoaded && !sessionApiKey) {
    const campaignId = campaign?.id || useStore.getState().activeCampaign?.id
    return (
      <ApiKeyGate
        campaignId={campaignId}
        userId={user?.id}
        onKeyReady={() => setApiKeyLoaded(true)}
      />
    )
  }

  if (!zone) {
    // ... existing loading screen ...
  }

  return (
    // ... existing game render ...
  )
```

- [ ] **Step 5: Rewrite `src/components/ApiKeySettings.jsx` for vault storage**

Replace the entire file with a version that uses `apiKeyVault` instead of localStorage. Key changes:
- Remove imports of `getClaudeApiKey`, `setClaudeApiKey`, `getOpenAiKey`, `setOpenAiKey`
- Import `encryptApiKey`, `saveApiKeyToSupabase`, `loadApiKeyFromSupabase` from `apiKeyVault`
- On mount, load existing key from Supabase (async)
- On save, encrypt + store in Supabase + broadcast
- Remove OpenAI key section entirely (V2 doesn't use it)
- Keep existing dark fantasy modal styling

```javascript
import { useState, useEffect } from 'react'
import { encryptApiKey, saveApiKeyToSupabase, loadApiKeyFromSupabase } from '../lib/apiKeyVault'
import { broadcastApiKeySync } from '../lib/liveChannel'
import useStore from '../store/useStore'

export default function ApiKeySettings({ userId, onClose }) {
  const activeCampaign = useStore(s => s.activeCampaign)
  const campaign = useStore(s => s.campaign)
  const isDM = useStore(s => s.isDM)
  const campaignId = activeCampaign?.id || campaign?.id

  const [claudeKey, setClaudeKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  // Load existing key on mount
  useEffect(() => {
    if (!campaignId || !userId) return
    loadApiKeyFromSupabase(campaignId, userId).then(key => {
      if (key) {
        setClaudeKey(key)
        setHasExisting(true)
      }
    }).catch(() => {})
  }, [campaignId, userId])

  async function handleSave() {
    const ck = claudeKey.trim()
    if (!ck || !campaignId || !userId) return

    try {
      const encrypted = await encryptApiKey(ck, campaignId, userId)
      await saveApiKeyToSupabase(campaignId, encrypted)

      // Update session and broadcast to players
      useStore.getState().setSessionApiKey(ck)
      if (isDM) broadcastApiKeySync(ck)

      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    } catch (err) {
      console.error('[ApiKeySettings] Save failed:', err)
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
        <h2 style={styles.title}>API Key Settings</h2>
        <p style={styles.hint}>
          The DM's Claude key powers the AI Dungeon Master for all players.
          Keys are encrypted and stored in your campaign record.
        </p>

        <label style={styles.label}>Claude API Key <span style={styles.labelHint}>(console.anthropic.com)</span></label>
        <input
          type="password"
          value={claudeKey}
          onChange={e => setClaudeKey(e.target.value)}
          placeholder="sk-ant-..."
          style={styles.input}
          autoComplete="off"
          spellCheck={false}
        />
        {hasExisting && <p style={styles.savedNote}>✓ Key loaded from campaign</p>}

        <div style={styles.btnRow}>
          <button onClick={handleSave} disabled={saved} style={styles.saveBtn}>
            {saved ? '✓ Saved!' : 'Save Key'}
          </button>
          <button onClick={onClose} style={styles.clearBtn}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// Keep existing styles object (same as current file lines 93-213)
const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px', boxSizing: 'border-box',
  },
  modal: {
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
    border: '1px solid rgba(201,168,76,0.25)',
    padding: '32px 36px', maxWidth: 480, width: '100%',
    boxShadow: '0 12px 48px rgba(0,0,0,0.8)', position: 'relative',
    borderRadius: 0,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 16,
    background: 'transparent', border: 'none',
    color: '#5a4a30', cursor: 'pointer', fontSize: '1rem',
    padding: 4, lineHeight: 1,
  },
  title: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
    color: '#c9a84c', fontSize: '1.2rem', fontWeight: 700,
    margin: '0 0 10px', letterSpacing: 2,
  },
  hint: {
    color: '#5a4a30', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 20px',
  },
  label: {
    color: '#bba878', fontSize: '0.8rem', fontWeight: 600,
    letterSpacing: 2, fontFamily: "'Cinzel', serif",
    display: 'block', marginBottom: 6, textTransform: 'uppercase',
  },
  labelHint: {
    color: '#5a4a30', fontSize: '0.72rem', fontFamily: 'monospace',
    fontWeight: 400, letterSpacing: 0, textTransform: 'none',
  },
  input: {
    background: 'rgba(10,8,14,0.95)', border: '1px solid rgba(201,168,76,0.2)',
    padding: '12px 14px', color: '#bba878', fontSize: '0.9rem',
    width: '100%', boxSizing: 'border-box', fontFamily: 'monospace',
    outline: 'none', letterSpacing: 1, borderRadius: 0,
  },
  savedNote: { color: '#44aa66', fontSize: '0.78rem', margin: '6px 0 0' },
  btnRow: { display: 'flex', gap: 10, marginTop: 18 },
  saveBtn: {
    flex: 1, background: 'linear-gradient(135deg, #d4b85c, #9a7a30)',
    color: '#08060c', border: 'none', padding: '12px 20px',
    fontSize: '0.9rem', fontWeight: 700, fontFamily: "'Cinzel', serif",
    cursor: 'pointer', minHeight: 46, borderRadius: 0, letterSpacing: 1,
  },
  clearBtn: {
    background: 'transparent', border: '1px solid rgba(201,168,76,0.15)',
    color: '#5a4a30', padding: '12px 16px', fontSize: '0.82rem',
    fontFamily: "'Cinzel', serif", cursor: 'pointer', minHeight: 46, borderRadius: 0,
  },
}
```

- [ ] **Step 6: Commit**

```bash
git add src/GameV2.jsx src/components/ApiKeySettings.jsx src/lib/liveChannel.js src/App.jsx src/store/useStore.js
git commit -m "feat: wire API key gate, remove all localStorage key usage in V2, add resetCampaign"
```

---

### Task 5: Campaign Bar Component

**Files:**
- Create: `src/hud/CampaignBar.jsx`
- Modify: `src/hud/GameHUD.jsx` (add CampaignBar)
- Modify: `src/hud/hud.css` (add styles)
- Modify: `src/GameV2.jsx` (pass onLeave to GameHUD)

- [ ] **Step 1: Create `src/hud/CampaignBar.jsx`**

```javascript
import { useState } from 'react'
import useStore from '../store/useStore'

export default function CampaignBar({ onSettings, onLeave }) {
  const campaign = useStore(s => s.campaign)
  const activeCampaign = useStore(s => s.activeCampaign)
  const partyMembers = useStore(s => s.partyMembers)
  const [copied, setCopied] = useState(false)

  const title = campaign?.title || activeCampaign?.name || 'Untitled Campaign'
  const inviteCode = activeCampaign?.invite_code
  const playerCount = (partyMembers?.length || 0) + 1 // +1 for self

  function handleCopyInvite() {
    if (!inviteCode) return
    const url = `${window.location.origin}?invite=${inviteCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="hud-campaign-bar">
      {/* Campaign name */}
      <span className="hud-campaign-name">{title}</span>

      {/* Player count */}
      <span className="hud-campaign-players">
        ⚔ {playerCount} {playerCount === 1 ? 'Adventurer' : 'Adventurers'}
      </span>

      {/* Divider */}
      <svg width="1" height="20" style={{ opacity: 0.2 }}>
        <line x1="0" y1="0" x2="0" y2="20" stroke="#c9a84c" strokeWidth="1"/>
      </svg>

      {/* Invite */}
      <button className="hud-campaign-btn" onClick={handleCopyInvite} title="Copy invite link">
        <span>{copied ? '✓' : '📋'}</span>
        <span className="hud-campaign-btn-label">{copied ? 'COPIED' : 'INVITE'}</span>
        <svg className="hud-btn-filigree" width="100%" height="100%" viewBox="0 0 44 34" preserveAspectRatio="none">
          <path d="M0,6 L0,3 Q0,0 3,0 L6,0" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,0 L41,0 Q44,0 44,3 L44,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M0,28 L0,31 Q0,34 3,34 L6,34" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,34 L41,34 Q44,34 44,31 L44,28" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
        </svg>
      </button>

      {/* Settings */}
      <button className="hud-campaign-btn" onClick={onSettings} title="API Key Settings">
        <span>⚙</span>
        <span className="hud-campaign-btn-label">SETTINGS</span>
        <svg className="hud-btn-filigree" width="100%" height="100%" viewBox="0 0 44 34" preserveAspectRatio="none">
          <path d="M0,6 L0,3 Q0,0 3,0 L6,0" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,0 L41,0 Q44,0 44,3 L44,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M0,28 L0,31 Q0,34 3,34 L6,34" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,34 L41,34 Q44,34 44,31 L44,28" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
        </svg>
      </button>

      {/* Leave */}
      <button className="hud-campaign-btn hud-campaign-btn-danger" onClick={onLeave} title="Leave campaign">
        <span>🚪</span>
        <span className="hud-campaign-btn-label">LEAVE</span>
        <svg className="hud-btn-filigree" width="100%" height="100%" viewBox="0 0 44 34" preserveAspectRatio="none">
          <path d="M0,6 L0,3 Q0,0 3,0 L6,0" fill="none" stroke="#cc3333" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,0 L41,0 Q44,0 44,3 L44,6" fill="none" stroke="#cc3333" strokeWidth="1.2" opacity="0.3"/>
          <path d="M0,28 L0,31 Q0,34 3,34 L6,34" fill="none" stroke="#cc3333" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,34 L41,34 Q44,34 44,31 L44,28" fill="none" stroke="#cc3333" strokeWidth="1.2" opacity="0.3"/>
        </svg>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add CampaignBar styles to `src/hud/hud.css`**

Add before the `/* ApiKeyGate waiting pulse */` section:
```css
/* Campaign bar (top-right) */
.hud-campaign-bar {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 15;
  background: rgba(8, 6, 12, 0.92);
  border: 1px solid rgba(201, 168, 76, 0.15);
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}

.hud-campaign-name {
  font-family: var(--font-display);
  font-size: 11px;
  color: var(--gold-bright);
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 0 12px rgba(201, 168, 76, 0.2);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-campaign-players {
  font-family: var(--font-heading);
  font-size: 9px;
  color: var(--gold-muted);
  letter-spacing: 1px;
  white-space: nowrap;
}

.hud-campaign-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  background: linear-gradient(180deg, #18141e, #0e0c14);
  border: 1px solid rgba(201, 168, 76, 0.2);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 14px;
  border-radius: 0;
  min-height: 0;
}

.hud-campaign-btn:hover {
  border-color: rgba(201, 168, 76, 0.5);
  background: linear-gradient(180deg, #1e1a28, #14101c);
}

.hud-campaign-btn-danger:hover {
  border-color: rgba(204, 51, 51, 0.5);
}

.hud-campaign-btn-label {
  font-family: var(--font-heading);
  font-size: 6px;
  color: var(--gold-muted);
  letter-spacing: 1px;
  font-weight: 700;
}

.hud-btn-filigree {
  position: absolute;
  inset: -1px;
  pointer-events: none;
}
```

- [ ] **Step 3: Wire CampaignBar into `src/hud/GameHUD.jsx`**

Add import and render CampaignBar in the top-right:
```javascript
import CampaignBar from './CampaignBar'

export default function GameHUD({ zone, onTool, onChat, onEndTurn, onAction, onSettings, onLeave }) {
  // ... existing code ...

  return (
    <div className="hud-v2" style={{ ... }}>
      {/* Campaign bar (top-right) — always visible */}
      <CampaignBar onSettings={onSettings} onLeave={onLeave} />

      {/* Zone label (exploration) or Turn banner (combat) */}
      {inCombat ? (
        // ... existing combat UI ...
```

- [ ] **Step 4: Pass `onSettings` and `onLeave` from `GameV2.jsx` through `GameHUD`**

In GameV2.jsx, update the GameHUD render (around line 369):
```javascript
<GameHUD
  zone={zone}
  onTool={handleTool}
  onChat={handleChat}
  onEndTurn={handleEndTurn}
  onAction={handleCombatAction}
  onSettings={() => setShowApiSettings(true)}
  onLeave={onLeave}
/>
```

- [ ] **Step 5: Remove Settings from ActionArea TOOLS**

In `src/hud/ActionArea.jsx`, remove the settings entry from line 9:
```javascript
// Remove this line:
  { icon: '⚙', title: 'Settings', key: 'settings' },
```

And remove the `settings` case from `handleTool` in `GameV2.jsx` (line 218):
```javascript
// Remove this line:
    else if (tool === 'settings') setShowApiSettings(true)
```

- [ ] **Step 6: Commit**

```bash
git add src/hud/CampaignBar.jsx src/hud/GameHUD.jsx src/hud/hud.css src/hud/ActionArea.jsx src/GameV2.jsx
git commit -m "feat: add ornate campaign bar with invite link, settings, and leave"
```

---

### Task 6: HUD Button Labels + Test Combat Fix

**Files:**
- Modify: `src/hud/ActionArea.jsx` (add labels, resize buttons)
- Modify: `src/hud/hud.css` (label styles)
- Modify: `src/GameV2.jsx` (fix test combat button, style it ornate)

- [ ] **Step 1: Add labels to ActionArea buttons**

Rewrite the TOOLS array and button rendering in `src/hud/ActionArea.jsx`:
```javascript
const TOOLS = [
  { icon: '🎲', label: 'DICE', key: 'dice' },
  { icon: '📜', label: 'CHAR', key: 'character' },
  { icon: '🎒', label: 'PACK', key: 'inventory' },
  { icon: '🏕', label: 'REST', key: 'rest' },
]
```

Update the button rendering (replace lines 26-41):
```javascript
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {TOOLS.map(tool => (
          <button
            key={tool.key}
            className="hud-tool-btn hud-tool-btn-labeled"
            title={tool.label}
            onClick={() => onTool?.(tool.key)}
          >
            <span style={{ fontSize: 16 }}>{tool.icon}</span>
            <span className="hud-tool-label">{tool.label}</span>
            <svg style={{ position: 'absolute', inset: -2, pointerEvents: 'none' }} width="54" height="52" viewBox="0 0 54 52">
              <path d="M0,8 L0,3 Q0,0 3,0 L8,0" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
              <path d="M46,0 L51,0 Q54,0 54,3 L54,8" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
              <path d="M0,44 L0,49 Q0,52 3,52 L8,52" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
              <path d="M46,52 L51,52 Q54,52 54,49 L54,44" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
            </svg>
          </button>
        ))}
      </div>
```

- [ ] **Step 2: Add label styles to `src/hud/hud.css`**

```css
.hud-tool-btn-labeled {
  width: 50px;
  height: 48px;
  flex-direction: column;
  gap: 1px;
}

.hud-tool-label {
  font-family: var(--font-heading);
  font-size: 7px;
  color: var(--gold-muted);
  letter-spacing: 1px;
  font-weight: 700;
}
```

- [ ] **Step 3: Fix test combat button in `src/GameV2.jsx`**

Replace the test combat button block (lines 371-394) with:
```javascript
      {!inCombat && (
        <button
          onClick={() => {
            try {
              const { startEncounter } = useStore.getState()
              const char = myCharacter || {
                id: 'test-hero', name: 'Test Hero', hp: 20, maxHp: 20, ac: 15,
                class: 'Fighter', level: 3, speed: 30, type: 'player',
                attackBonus: 5, damageMod: 3,
                stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
                attacks: [{ name: 'Longsword', bonus: '+5', damage: '1d8+3' }],
              }
              startEncounter([
                { name: 'Goblin', hp: 15, maxHp: 15, ac: 15, isEnemy: true, type: 'enemy',
                  attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }],
                  position: { x: 6, y: 4 }, speed: 30,
                  stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 } },
                { name: 'Goblin Archer', hp: 12, maxHp: 12, ac: 13, isEnemy: true, type: 'enemy',
                  attacks: [{ name: 'Shortbow', bonus: '+4', damage: '1d6+2' }],
                  position: { x: 8, y: 3 }, speed: 30,
                  stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 } },
              ], [char])
            } catch (err) {
              console.error('[GameV2] Test combat failed:', err)
              addNarratorMessage({ role: 'dm', speaker: 'System', text: `Combat test failed: ${err.message}` })
            }
          }}
          className="hud-campaign-btn"
          style={{
            position: 'fixed', top: 50, right: 10, zIndex: 100,
            flexDirection: 'row', gap: 6, padding: '6px 14px',
            borderColor: 'rgba(204,51,51,0.4)',
          }}
        >
          <span>⚔</span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: '#cc3333', fontWeight: 900, letterSpacing: 2 }}>
            TEST COMBAT
          </span>
        </button>
      )}
```

- [ ] **Step 4: Commit**

```bash
git add src/hud/ActionArea.jsx src/hud/hud.css src/GameV2.jsx
git commit -m "feat: add HUD button labels, fix test combat with fallback character"
```

---

### Task 7: Session Log Polish

**Files:**
- Modify: `src/hud/SessionLog.jsx`
- Modify: `src/hud/hud.css`

- [ ] **Step 1: Update SessionLog for better chat display**

Replace `src/hud/SessionLog.jsx`:
```javascript
import { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import OrnateFrame from './OrnateFrame'

export default function SessionLog() {
  const [tab, setTab] = useState('chat')
  const sessionLog = useStore(s => s.sessionLog) || []
  const narratorHistory = useStore(s => s.narrator?.history) || []
  const scrollRef = useRef(null)

  const entries = tab === 'log' ? sessionLog : narratorHistory

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      // Only auto-scroll if user is near the bottom (within 60px)
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
      if (nearBottom) {
        el.scrollTop = el.scrollHeight
      }
    }
  }, [entries.length])

  return (
    <div className="hud-log-panel" style={{ position: 'relative' }}>
      <OrnateFrame size={18} stroke="#c9a84c" weight={2.5} />
      {/* Tabs */}
      <div className="hud-log-tabs">
        <div
          className={`hud-log-tab ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => setTab('chat')}
        >Chat</div>
        <div
          className={`hud-log-tab ${tab === 'log' ? 'active' : ''}`}
          onClick={() => setTab('log')}
        >Log</div>
      </div>
      {/* Entries */}
      <div className="hud-log-entries" ref={scrollRef}>
        {tab === 'log' ? (
          sessionLog.length > 0 ? sessionLog.map((entry, i) => (
            <div key={entry.id || i} className="hud-log-entry">
              <span className="hud-log-time">
                {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>{' '}
              <span className="hud-log-action">{entry.icon} {entry.title}</span>
              {entry.detail && <span className="hud-log-action"> — {entry.detail}</span>}
            </div>
          )) : (
            <div className="hud-log-entry hud-log-empty">No events yet...</div>
          )
        ) : (
          narratorHistory.length > 0 ? narratorHistory.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`hud-log-entry hud-chat-msg ${msg.role === 'dm' ? 'hud-chat-dm' : 'hud-chat-player'}`}
            >
              <span className="hud-chat-speaker">
                {msg.speaker || (msg.role === 'dm' ? 'DM' : 'You')}
              </span>
              <span className="hud-chat-text">{msg.text}</span>
            </div>
          )) : (
            <div className="hud-log-entry hud-log-empty">No messages yet...</div>
          )
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update chat styles in `src/hud/hud.css`**

Find the existing `.hud-log-entries` rule (around line 70) and change `max-height: 82px` to `flex: 1`:
```css
.hud-log-entries {
  /* Remove: max-height: 82px; */
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.hud-log-panel {
  display: flex;
  flex-direction: column;
}

.hud-log-empty {
  color: #4a3a28;
  font-style: italic;
}

/* Chat message styles */
.hud-chat-msg {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 0;
}

.hud-chat-dm {
  text-align: left;
}

.hud-chat-player {
  text-align: right;
}

.hud-chat-speaker {
  font-family: var(--font-heading);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.hud-chat-dm .hud-chat-speaker { color: var(--gold-bright); }
.hud-chat-player .hud-chat-speaker { color: #5ab0ee; }

.hud-chat-text {
  color: var(--text-log);
  font-size: 11px;
  line-height: 1.5;
}

.hud-chat-dm .hud-chat-text {
  color: var(--text-primary);
  font-style: italic;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hud/SessionLog.jsx src/hud/hud.css
git commit -m "feat: polish session log with chat-first default and message alignment"
```

---

### Task 8: Final Integration Test + Status Update

**Files:**
- Modify: `tasks/status.md`

- [ ] **Step 1: Build check**

```bash
cd C:/Dev/dms-tome && npm run build
```

Expected: No build errors. If there are import errors, fix them.

- [ ] **Step 2: Manual verification checklist**

Open `localhost:5173?v2` in browser and verify:
- [ ] API key gate appears (full-screen, ornate, not dismissable)
- [ ] Entering a key stores it and loads the game
- [ ] Campaign bar visible top-right with campaign name, player count
- [ ] Invite button copies URL to clipboard
- [ ] Settings button opens API key modal
- [ ] Leave button returns to campaign select
- [ ] HUD buttons have labels (DICE, CHAR, PACK, REST)
- [ ] Test combat button works (creates 2 goblins vs test hero)
- [ ] Chat tab is default in session log
- [ ] Messages auto-scroll

- [ ] **Step 3: Update `tasks/status.md`**

Add under Phase 4 or as a new section:
```markdown
### V2 Front Door ✅ COMPLETE
- [x] API key gate (full-screen blocker, encrypted DB storage, no localStorage)
- [x] Campaign bar (name, player count, invite link, settings, leave)
- [x] Input/output sanitization for AI narrator
- [x] HUD button labels (DICE, CHAR, PACK, REST)
- [x] Session log polish (chat-first, auto-scroll, message alignment)
- [x] Test combat button fix (fallback character, error handling)
```

- [ ] **Step 4: Commit**

```bash
git add tasks/status.md
git commit -m "docs: update status — V2 front door complete"
```
