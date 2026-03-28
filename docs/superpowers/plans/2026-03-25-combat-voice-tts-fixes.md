# Combat Targeting, Voice Chat, TTS & Multiplayer Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix AoE spell targeting (PixiJS-native), voice chat PTT, TTS with NPC voice variety, and campaign_members 406 error.

**Architecture:** All 4 fixes are independent. AoE targeting replaces the disconnected React SpellTargeting with PixiJS-native mouse-tracked targeting. TTS rewrites Web Speech as primary with NPC voice registry. PTT adds error feedback. campaign_members switches from upsert to select-then-insert.

**Tech Stack:** PixiJS v8, Web Speech API (SpeechSynthesis + SpeechRecognition), Supabase PostgREST

---

### Task 1: AoE Spell Targeting — PixiJS Native

**Files:**
- Create: `src/engine/SpellTargetingOverlay.js`
- Modify: `src/engine/AoEOverlay.js` — add angle-based cone function
- Modify: `src/engine/PixiApp.jsx` — add mouse tracking + targeting layer integration
- Modify: `src/hooks/useCombatActions.js` — wire up PixiJS targeting instead of React overlay
- Modify: `src/GameV2.jsx` — remove showSpellTargeting state, connect pixiRef targeting
- Modify: `src/components/game/GameModalsRenderer.jsx` — remove SpellTargeting render

**Design:**
- Cone spells: origin at caster tile, cone rotates with mouse angle. Uses `getTilesInConeAngle()` (new).
- Sphere spells: circle follows mouse position, snaps to tile grid. Uses existing `getTilesInSphere()`.
- Line spells: line from caster toward mouse. Uses angle-based direction.
- All show affected tiles highlighted in real-time. Click confirms. Escape cancels.
- The PixiApp exposes `startSpellTargeting(spell, casterPos)` and `cancelSpellTargeting()` via ref.
- Mouse move updates the preview. Click fires a callback with `{ position, affectedTiles }`.

---

### Task 2: TTS with NPC Voice Registry — Web Speech Primary

**Files:**
- Rewrite: `src/lib/tts.js` — Web Speech API as primary, voice registry for NPCs

**Design:**
- On load, discover available voices. Build a registry mapping voice traits.
- Narrator: best deep male voice, pitch 0.85, rate 0.9
- NPCs: hash name → consistent voice + pitch/rate from available pool
- NPC personality traits (hostile, friendly, old, young) shift pitch/rate
- Edge gets Microsoft neural voices, Chrome gets Google voices
- Queue system: if speaking, queue next message, don't interrupt current
- Pollinations removed as primary (keep as optional upgrade path)

---

### Task 3: Voice Chat PTT — Error Feedback

**Files:**
- Modify: `src/hud/SessionLog.jsx` — better error handling in startPTT

**Design:**
- Check `e.results[0]` exists before accessing transcript
- In `onerror`, check `e.error` type: 'not-allowed' → show "Microphone blocked", 'no-speech' → show "No speech detected"
- Show feedback in chat as system message via addNarratorMessage

---

### Task 4: campaign_members 406 — Select-then-Insert

**Files:**
- Modify: `src/App.jsx` ~line 790 — replace upsert with select+insert

**Design:**
- Select existing row first
- Only insert if not found
- Avoids PostgREST upsert edge cases entirely
