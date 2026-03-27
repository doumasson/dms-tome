# Campaign Creation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul campaign creation with a simplified 2-step wizard, chapter-based generation, dynamic encounter scaling, per-campaign character level scaling with snapshots, and chapter continuation.

**Architecture:** Big bang rewrite. All changes ship together on `agent-dev` branch. CreateCampaign.jsx is rewritten (2-step wizard), campaignGenerator.js gets chapter-format prompts + continuation, encounterSlice.js resolves encounter templates at combat trigger time, characterSlice.js + charBuilder.js gain level snapshot and scaling systems, new ChapterCompleteModal.jsx handles milestone completion. Backward compat preserved for existing campaigns.

**Tech Stack:** React, Zustand, Supabase (campaigns.campaign_data JSONB), Claude API (Sonnet for generation, Haiku for summaries), existing areaBuilder/chunk pipeline.

**Spec:** `docs/superpowers/specs/2026-03-26-campaign-creation-overhaul-design.md`

**IMPORTANT:** Do NOT write tests. This project's rule: every iteration produces game code, assets, or bug fixes. No test files.

---

### Task 1: Update Tones, Settings, and Prompt Constants

**Files:**
- Modify: `src/components/CreateCampaign.jsx:9-13` (constants)
- Modify: `src/components/CreateCampaign.jsx:201-211` (DEFAULT_FIELDS)

- [ ] **Step 1: Replace TONES, SETTINGS constants, remove LENGTHS/LEVELS/VILLAINS**

Replace lines 9-13 in `src/components/CreateCampaign.jsx`:

```javascript
const TONES = ['Heroic Fantasy', 'Grimdark', 'Horror', 'Mystery', 'Whimsical', 'Sword & Sorcery', 'War', 'Heist'];
const SETTINGS = ['Medieval Kingdom', 'Frozen North', 'Desert Empire', 'Jungle Wilds', 'The Deep Below', 'Coastal Isles', 'Haunted Realm', 'Planar Crossroads'];
```

Delete the `LENGTHS`, `LEVELS`, and `VILLAINS` constants entirely.

- [ ] **Step 2: Update DEFAULT_FIELDS**

Replace lines 201-211:

```javascript
const DEFAULT_FIELDS = {
  name: '',
  isAiDm: true,
  tone: TONES[0],
  setting: SETTINGS[0],
  themes: '',
};
```

Remove `length`, `players`, `level`, `villain` fields.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds (there will be runtime issues from removed fields — that's fine, we fix those in later tasks)

- [ ] **Step 4: Commit**

```bash
git add src/components/CreateCampaign.jsx
git commit -m "Update tones/settings, remove length/players/level/villain constants"
```

---

### Task 2: Rewrite CreateCampaign UI to 2-Step Wizard

**Files:**
- Modify: `src/components/CreateCampaign.jsx:213-726` (component body + JSX)

This task rewrites the component flow: Step 1 = Concept + Forge (name, tone, setting, notes, demo, forge button). Step 2 = Forging spinner → Success.

- [ ] **Step 1: Simplify state and remove step 2 handler**

Replace the state declarations (lines 215-226) and handlers. The new component body:

```javascript
export default function CreateCampaign({ user, onDone, onBack, draftCampaign }) {
  const preGenerateSceneImages = useStore(s => s.preGenerateSceneImages);
  const [demoLoading, setDemoLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [campaignId, setCampaignId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [byokKey, setByokKey] = useState('');
  const [needsByok, setNeedsByok] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    if (draftCampaign?.campaign_data?.__draft) {
      const { fields: savedFields, __step } = draftCampaign.campaign_data;
      if (savedFields) setFields(f => ({ ...f, ...savedFields }));
      setCampaignId(draftCampaign.id);
    }
  }, []);

  function setField(key, val) {
    setFields(f => ({ ...f, [key]: val }));
  }

  function saveDraftToDb(currentFields, id) {
    if (!id) return;
    supabase
      .from('campaigns')
      .update({ campaign_data: { __draft: true, __step: 1, fields: currentFields } })
      .eq('id', id)
      .then(() => {});
  }
```

- [ ] **Step 2: Rewrite handleForge (replaces handleStep1Next + handleAutoGenerate)**

This single handler creates the DB record AND triggers generation in one flow:

```javascript
  async function handleForge() {
    if (!fields.name.trim()) return;
    setSaving(true);
    setGenerateError('');

    // Create or update DB record
    let id = campaignId;
    if (!id) {
      const inviteCode = generateInviteCode();
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          name: fields.name.trim(),
          dm_user_id: user.id,
          invite_code: inviteCode,
          campaign_data: { __draft: true, __step: 1, fields },
          settings: { isAiDm: true },
        })
        .select()
        .single();

      if (!error && campaign) {
        id = campaign.id;
        setCampaignId(id);
        await supabase.from('campaign_members').insert({
          campaign_id: id,
          user_id: user.id,
          role: 'dm',
        });
      }
    } else {
      supabase
        .from('campaigns')
        .update({ name: fields.name.trim(), campaign_data: { __draft: true, __step: 1, fields } })
        .eq('id', id)
        .then(() => {});
    }

    setSaving(false);

    // Move to forging step and start generation
    setStep(2);
    setGenerating(true);
    setNeedsByok(false);

    try {
      let apiKey = await loadDefaultApiKey();
      if (!apiKey) {
        setGenerating(false);
        setNeedsByok(true);
        return;
      }
      await doGenerate(apiKey);
    } catch (err) {
      setGenerateError(err.message || 'Generation failed');
      setGenerating(false);
    }
  }

  function handleStartOver() {
    localStorage.removeItem(DRAFT_KEY);
    setFields(DEFAULT_FIELDS);
    setStep(1);
    setGenerateError('');
    setNeedsByok(false);
    setByokKey('');
  }
```

- [ ] **Step 3: Keep handleTryDemo, doGenerate, handleByokSubmit, handleCreate mostly as-is**

`handleTryDemo` stays unchanged (we update demo data in a later task).
`doGenerate` stays unchanged.
`handleByokSubmit` stays unchanged.
`handleCreate` stays unchanged except: update step 4 → step 2 success state (step is already 2, success shows when `createdCampaign` is set).

- [ ] **Step 4: Rewrite JSX — Step 1: Concept + Forge**

Replace the entire JSX return (lines 484-726) with:

```jsx
  const inviteLink = createdCampaign
    ? `${window.location.origin}?invite=${createdCampaign.invite_code}`
    : '';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Corner filigree accents */}
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
          <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="2" cy="2" r="1.5" fill="#d4af37" opacity="0.35" />
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', top: 8, right: 8, pointerEvents: 'none', transform: 'scaleX(-1)' }}>
          <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="2" cy="2" r="1.5" fill="#d4af37" opacity="0.35" />
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', bottom: 8, left: 8, pointerEvents: 'none', transform: 'scaleY(-1)' }}>
          <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="2" cy="2" r="1.5" fill="#d4af37" opacity="0.35" />
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', bottom: 8, right: 8, pointerEvents: 'none', transform: 'scale(-1,-1)' }}>
          <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="2" cy="2" r="1.5" fill="#d4af37" opacity="0.35" />
        </svg>

        {/* Back button */}
        {step === 1 && (
          <button onClick={onBack} style={styles.backBtn}>← Back</button>
        )}

        {/* STEP 1: Concept + Forge */}
        {step === 1 && !createdCampaign && (
          <>
            <h2 style={styles.stepTitle}>Create Your Campaign</h2>

            {/* Demo quick-start */}
            <button onClick={handleTryDemo} disabled={demoLoading} style={styles.demoCard}>
              <div style={styles.demoLeft}>
                <span style={styles.demoBadge}>QUICK START</span>
                <span style={styles.demoIcon}>⚔</span>
              </div>
              <div style={styles.demoRight}>
                <span style={styles.demoTitle}>{demoLoading ? 'Loading...' : 'Whispers in Millhaven'}</span>
                <span style={styles.demoSubtitle}>A ready-to-play demo chapter</span>
              </div>
              <span style={styles.demoArrow}>→</span>
            </button>

            <div style={styles.orDivider}>
              <span style={styles.orLine} /><span style={styles.orText}>or create your own</span><span style={styles.orLine} />
            </div>

            {/* Campaign Name */}
            <label style={styles.label}>Campaign Name</label>
            <input
              style={styles.input}
              placeholder="e.g. The Curse of the Shadow King"
              value={fields.name}
              onChange={e => setField('name', e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleForge()}
            />

            {/* Tone */}
            <label style={styles.label}>Tone</label>
            <div style={styles.optionGrid}>
              {TONES.map(t => (
                <button key={t} onClick={() => setField('tone', t)}
                  style={{ ...styles.optionBtn, ...(fields.tone === t ? styles.optionBtnActive : {}) }}>{t}</button>
              ))}
            </div>

            {/* Setting */}
            <label style={styles.label}>Setting</label>
            <div style={styles.optionGrid}>
              {SETTINGS.map(s => (
                <button key={s} onClick={() => setField('setting', s)}
                  style={{ ...styles.optionBtn, ...(fields.setting === s ? styles.optionBtnActive : {}) }}>{s}</button>
              ))}
            </div>

            {/* Notes */}
            <label style={styles.label}>Notes <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
            <textarea
              style={styles.textarea}
              rows={3}
              placeholder="Any custom themes, world details, or ideas you want the AI to include..."
              value={fields.themes}
              onChange={e => setField('themes', e.target.value)}
            />

            {/* Forge button */}
            <button onClick={handleForge} disabled={!fields.name.trim() || saving}
              style={{ ...styles.createBtn, marginTop: 18, opacity: fields.name.trim() ? 1 : 0.5 }}>
              {saving ? 'Saving...' : '🔥 Forge'}
            </button>
          </>
        )}

        {/* STEP 2: Forging / BYOK / Error / Success */}
        {step === 2 && !createdCampaign && (
          <>
            {generating && (
              <div style={styles.generatingWrap}>
                <div style={styles.spinner} />
                <h3 style={{ color: '#d4af37', marginTop: 16, fontFamily: 'Cinzel, serif' }}>Forging your world...</h3>
                <p style={styles.hint}>This usually takes about 30 seconds...</p>
              </div>
            )}

            {needsByok && !generating && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <h3 style={{ color: '#d4af37', fontFamily: 'Cinzel, serif' }}>API Key Required</h3>
                <p style={styles.hint}>No platform key found. Enter your Claude API key:</p>
                <input
                  type="password"
                  style={{ ...styles.input, maxWidth: 400, margin: '12px auto' }}
                  placeholder="sk-ant-..."
                  value={byokKey}
                  onChange={e => setByokKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleByokSubmit()}
                />
                <button onClick={handleByokSubmit} disabled={!byokKey.trim()} style={styles.createBtn}>Generate Campaign →</button>
                <button onClick={handleStartOver} style={styles.startOverBtn}>Start Over</button>
              </div>
            )}

            {generateError && !generating && !needsByok && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <h3 style={{ color: '#ff6b6b', fontFamily: 'Cinzel, serif' }}>Generation Failed</h3>
                <p style={styles.errorMsg}>{generateError}</p>
                <button onClick={() => handleForge()} style={styles.createBtn}>Retry →</button>
                <button onClick={handleStartOver} style={styles.startOverBtn}>Start Over</button>
              </div>
            )}
          </>
        )}

        {/* SUCCESS */}
        {createdCampaign && (
          <>
            <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>⚔</div>
              <h2 style={{ color: '#d4af37', fontFamily: 'Cinzel, serif', margin: 0 }}>Campaign Created!</h2>
            </div>

            <label style={styles.label}>Invite Link</label>
            <div style={styles.inviteBox}>
              <span style={styles.inviteLink}>{inviteLink}</span>
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={styles.copyLinkBtn}>{copied ? '✓' : '📋'}</button>
            </div>
            <div style={styles.inviteCodeLabel}>{createdCampaign.invite_code}</div>

            <button onClick={() => onDone({ ...createdCampaign, userRole: 'dm' })} style={styles.createBtn}>
              Enter Campaign →
            </button>
          </>
        )}
      </div>
    </div>
  );
```

- [ ] **Step 5: Clean up styles — remove step progress indicator and step 2 dropdown styles**

In the styles object, remove `progressWrap`, `progressDot`, `progressLine`, `progressLabel` styles (step indicator). Remove `select` style (dropdowns are gone). Keep all other styles as they're reused.

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/components/CreateCampaign.jsx
git commit -m "Rewrite CreateCampaign to 2-step wizard: Concept+Forge → Success"
```

---

### Task 3: Rewrite Generator Prompt for Chapter Format

**Files:**
- Modify: `src/components/CreateCampaign.jsx:45-175` (generatePrompt function)

- [ ] **Step 1: Replace generatePrompt with chapter-format prompt**

Replace the entire `generatePrompt` function (lines 45-175):

```javascript
function generatePrompt(fields) {
  return `You are a D&D 5e SRD campaign designer. Create Chapter 1 of a campaign as interconnected area briefs. This chapter should contain approximately 4 hours of gameplay content.

Campaign Name: ${fields.name}
Tone: ${fields.tone}
Setting: ${fields.setting}
Custom Notes: ${fields.themes || 'None specified'}
Chapter: 1
Starting Level: 1

Generate a JSON object with this EXACT structure (no extra text, just valid JSON):

{
  "title": "${fields.name}",
  "chapter": 1,
  "startArea": "area-village",
  "factions": [
    { "id": "faction-id", "name": "Faction Name", "description": "What they want and why", "alignment": "Lawful Good" }
  ],
  "questObjectives": [
    { "id": "q1", "name": "Main quest objective", "status": "active" }
  ],
  "storyMilestones": ["First major event", "Second major event", "Chapter climax"],
  "chapterMilestone": {
    "trigger": "defeat_boss",
    "targetId": "boss-encounter-zone-id",
    "description": "Defeat the chapter boss to complete Chapter 1"
  },
  "areaBriefs": {
    "area-village": {
      "id": "area-village",
      "name": "Starting Town Name",
      "width": 80,
      "height": 60,
      "theme": "village",
      "pois": [
        { "type": "tavern_main", "position": "center-west", "label": "Tavern Name" },
        { "type": "house_small", "position": "center-east", "label": "Notable Building" },
        { "type": "clearing_grass", "position": "south-center", "label": "Town Square" }
      ],
      "connections": [
        { "from": "Tavern Name", "to": "Town Square" }
      ],
      "npcs": [
        { "name": "NPC Name", "position": "Tavern Name", "personality": "Personality and role in story", "faction": "faction-id", "questRelevant": true }
      ],
      "encounterZones": [],
      "exits": [
        { "edge": "north", "targetArea": "area-next", "label": "Path Name" }
      ]
    },
    "area-forest": {
      "id": "area-forest",
      "name": "Wilderness Area",
      "width": 100,
      "height": 75,
      "theme": "forest",
      "pois": [
        { "type": "clearing_grass", "position": "center", "label": "Clearing" }
      ],
      "connections": [],
      "npcs": [],
      "encounterZones": [
        {
          "id": "encounter-id",
          "triggerRadius": 5,
          "difficulty": "medium",
          "enemyTemplates": [
            { "name": "Goblin", "role": "grunt", "countPerPlayer": 0.75 },
            { "name": "Goblin Boss", "role": "leader", "fixedCount": 1 }
          ],
          "narratorPrompt": "Description of how the encounter begins"
        }
      ],
      "exits": [
        { "edge": "south", "targetArea": "area-village", "label": "Back to Town" }
      ]
    }
  }
}

ENCOUNTER TEMPLATE RULES:
- Use "encounterZones" with "enemyTemplates" instead of "enemies" arrays
- Each enemy template has: name, role (grunt|leader|boss|minion), and EITHER countPerPlayer (scales with party) OR fixedCount (always that many)
- countPerPlayer: 0.75 means 3 enemies for 4 players (rounded up). Use 0.5-1.0 for grunts.
- fixedCount: 1 means exactly 1 regardless of party size. Use for leaders and bosses.
- role determines AI behavior: grunt=charge+attack, leader=tactical, boss=phases+legendary, minion=support
- difficulty: easy|medium|hard|deadly — affects CR scaling at runtime

CHAPTER MILESTONE:
- Every chapter MUST have a chapterMilestone marking its climax
- trigger types: defeat_boss, reach_area, complete_quest, story_flag
- targetId must reference an encounterZone id, area id, quest id, or flag name
- The milestone should feel like a natural story climax, not arbitrary

CONTENT DENSITY (approximately 4 hours of play):
- Create 5-6 areas forming a connected graph
- Include at least 4-6 encounter zones spread across areas (mix of easy, medium, hard)
- Include 1 boss encounter zone (difficulty: deadly) as the chapter climax
- Include 4-8 NPCs across areas with distinct personalities and faction ties
- Include at least 2-3 side quest opportunities (NPCs with questRelevant: true)
- Include 2-4 factions with motivations
- Create exploration content: shops, locked doors, hidden passages, lore objects
- Pacing: start with safe town, escalate through wilderness/exploration, climax in dungeon/boss

AVAILABLE POI TYPES (you MUST use only these):
- tavern_main — indoor tavern building (10x8 tiles)
- house_small — small house/hut building (6x6 tiles)
- clearing_grass — open grass clearing (6x6 tiles)
- dungeon_room_basic — stone dungeon chamber (8x8 tiles)
- road_horizontal — horizontal road segment (8x3 tiles)

AVAILABLE THEMES:
- village — grass terrain with stone roads
- forest — grass terrain with dirt roads
- dungeon — brick/stone terrain
- cave — dark stone terrain
- town — cobblestone terrain with paved roads

POSITION VALUES:
center, north, south, east, west, north-east, north-west, south-east, south-west, center-north, center-south, center-east, center-west

EXIT EDGES: north, south, east, west
EXIT TYPES (optional): stairs_up, stairs_down, ladder

MULTI-FLOOR BUILDINGS:
When a building warrants multiple floors, generate separate area briefs linked by stair exits.

Requirements:
- Exits MUST be bidirectional: if area A exits to area B, area B must exit back to area A
- Each area should have 2-5 POIs
- NPC "position" must match a POI "label" in the same area
- Connection "from"/"to" must match POI "label" values
- Outdoor area dimensions: width 80-120, height 60-90
- Dungeon/cave dimensions: width 30-50, height 25-40
- Tone: ${fields.tone}
- Setting: ${fields.setting}

OUTPUT INSTRUCTIONS:
- Output ONLY valid JSON, no other text
- Use standard brackets [ ] not escaped \\[ \\]
- Do NOT wrap in markdown code blocks
- Start with { and end with }`;
}
```

- [ ] **Step 2: Update validateCampaignJson to accept chapter format**

Update the validation function (around line 181) to also check for `chapterMilestone`:

```javascript
function validateCampaignJson(text) {
  try {
    const cleaned = cleanJsonText(text);
    const data = JSON.parse(cleaned);
    if (!data.title) return { ok: false, error: 'Missing "title" in generated JSON.' };
    if (!data.areaBriefs && !data.scenes && !data.zones) {
      return { ok: false, error: 'Missing area data. Expected "areaBriefs", "scenes", or "zones".' };
    }
    return { ok: true, data };
  } catch (e) {
    const hint = /Unexpected token/.test(e.message)
      ? 'The AI included extra text or formatting. Copy only the JSON — it must start with { and end with }.'
      : e.message;
    return { ok: false, error: hint };
  }
}
```

(This is basically unchanged — the existing validator already accepts areaBriefs. The chapter format just adds `chapter` and `chapterMilestone` fields which don't need strict validation.)

- [ ] **Step 3: Verify build passes**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/CreateCampaign.jsx
git commit -m "Rewrite generator prompt for chapter-based format with encounter templates"
```

---

### Task 4: Update campaignGenerator.js for Chapter Support

**Files:**
- Modify: `src/lib/campaignGenerator.js` (add chapter fields passthrough)

- [ ] **Step 1: Update buildAreaWorld to preserve chapter fields**

```javascript
import { buildAreaFromBrief } from './areaBuilder.js'

/**
 * Convert AI-generated campaign output into the final campaign data structure.
 * Builds only the starting area; remaining areas stay as briefs for on-demand generation.
 */
export function buildAreaWorld(aiOutput) {
  const {
    title = 'Untitled Campaign',
    chapter = 1,
    startArea,
    areaBriefs = {},
    questObjectives = [],
    storyMilestones = [],
    factions = [],
    chapterMilestone = null,
  } = aiOutput

  const effectiveStartArea = startArea || Object.keys(areaBriefs)[0]
  const startBrief = effectiveStartArea ? areaBriefs[effectiveStartArea] : null
  if (!startBrief) {
    console.error(`[campaignGenerator] No brief found for startArea "${startArea}"`)
    return { title, chapter, startArea: null, areas: {}, areaBriefs, questObjectives, storyMilestones, factions, chapterMilestone }
  }

  const builtStartArea = buildAreaFromBrief(startBrief, 42)

  const remainingBriefs = { ...areaBriefs }
  delete remainingBriefs[effectiveStartArea]

  return {
    title,
    chapter,
    startArea: effectiveStartArea,
    areas: { [effectiveStartArea]: builtStartArea },
    areaBriefs: remainingBriefs,
    questObjectives,
    storyMilestones,
    factions,
    chapterMilestone,
  }
}

/**
 * Generate a "Story So Far" summary for chapter continuation.
 * Takes the session log and campaign state, returns a ~200 word narrative summary.
 */
export function buildStorySoFarPrompt(campaignState, sessionLog) {
  const { title, chapter, factions, questObjectives } = campaignState
  const completedQuests = (questObjectives || []).filter(q => q.completed || q.status === 'completed')
  const activeQuests = (questObjectives || []).filter(q => q.status === 'active')

  // Extract key events from session log (last 50 messages)
  const recentLog = (sessionLog || []).slice(-50).map(m => m.text).join('\n')

  return `Summarize the story so far for "${title}" Chapter ${chapter} in exactly 200 words or less.

Key events from the session log:
${recentLog}

Completed quests: ${completedQuests.map(q => q.name || q.text).join(', ') || 'None'}
Active quests: ${activeQuests.map(q => q.name || q.text).join(', ') || 'None'}
Factions: ${(factions || []).map(f => f.name).join(', ') || 'None'}

Write a narrative summary that captures: major combat outcomes, important NPC interactions, key player choices, and areas visited. This will be used to generate the next chapter.`
}

/**
 * Generate the prompt for a continuation chapter.
 */
export function generateContinuationPrompt(tone, setting, chapter, storySoFar, questState, factionState) {
  return `You are a D&D 5e SRD campaign designer. Create Chapter ${chapter} continuing an existing campaign.

Tone: ${tone}
Setting: ${setting}
Chapter: ${chapter}

STORY SO FAR:
${storySoFar}

ACTIVE QUESTS:
${(questState || []).filter(q => q.status === 'active').map(q => `- ${q.name || q.text}`).join('\n') || 'None'}

FACTIONS:
${(factionState || []).map(f => `- ${f.name}: ${f.description}`).join('\n') || 'None'}

Continue the story naturally. The new chapter should:
- Pick up where Chapter ${chapter - 1} left off
- Advance or resolve active quests
- Introduce new challenges and story threads
- Escalate stakes from the previous chapter
- Include a new chapterMilestone as the climax

Generate the same JSON structure as Chapter 1 (areaBriefs with encounterZones using enemyTemplates, factions, questObjectives, chapterMilestone). Output ONLY valid JSON.`
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/lib/campaignGenerator.js
git commit -m "Add chapter support, story-so-far summary, and continuation prompt to campaignGenerator"
```

---

### Task 5: Dynamic Encounter Scaling — Resolve Templates at Trigger Time

**Files:**
- Modify: `src/hooks/useGameEffects.js:181-277` (encounter zone trigger)
- Modify: `src/store/encounterSlice.js:45-63` (enemy scaling)
- Create: `src/lib/encounterTemplateResolver.js` (new template resolution logic)

- [ ] **Step 1: Create encounterTemplateResolver.js**

This module resolves encounter templates into concrete enemy arrays based on current party size and level.

```javascript
/**
 * Resolve encounter zone enemy templates into concrete enemy arrays.
 * Scales enemy count by party size and stats by party level.
 */

// Base stats for common SRD enemies by name, keyed by name
const BASE_ENEMY_STATS = {
  'Goblin': { hp: 7, ac: 15, speed: 30, cr: 0.25, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8, attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }] },
  'Goblin Boss': { hp: 21, ac: 17, speed: 30, cr: 1, str: 10, dex: 14, con: 10, int: 10, wis: 8, cha: 10, attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }, { name: 'Javelin', bonus: '+2', damage: '1d6' }] },
  'Skeleton': { hp: 13, ac: 13, speed: 30, cr: 0.25, str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5, attacks: [{ name: 'Shortsword', bonus: '+4', damage: '1d6+2' }] },
  'Zombie': { hp: 22, ac: 8, speed: 20, cr: 0.25, str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5, attacks: [{ name: 'Slam', bonus: '+3', damage: '1d6+1' }] },
  'Wolf': { hp: 11, ac: 13, speed: 40, cr: 0.25, str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6, attacks: [{ name: 'Bite', bonus: '+4', damage: '2d4+2' }] },
  'Bandit': { hp: 11, ac: 12, speed: 30, cr: 0.125, str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10, attacks: [{ name: 'Scimitar', bonus: '+3', damage: '1d6+1' }] },
  'Bandit Captain': { hp: 65, ac: 15, speed: 30, cr: 2, str: 15, dex: 16, con: 14, int: 14, wis: 11, cha: 14, attacks: [{ name: 'Scimitar', bonus: '+5', damage: '1d6+3' }] },
  'Orc': { hp: 15, ac: 13, speed: 30, cr: 0.5, str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10, attacks: [{ name: 'Greataxe', bonus: '+5', damage: '1d12+3' }] },
  'Ogre': { hp: 59, ac: 11, speed: 40, cr: 2, str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7, attacks: [{ name: 'Greatclub', bonus: '+6', damage: '2d8+4' }] },
  'Giant Spider': { hp: 26, ac: 14, speed: 30, cr: 1, str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4, attacks: [{ name: 'Bite', bonus: '+5', damage: '1d8+3' }] },
  'Cultist': { hp: 9, ac: 12, speed: 30, cr: 0.125, str: 11, dex: 12, con: 10, int: 10, wis: 11, cha: 10, attacks: [{ name: 'Scimitar', bonus: '+3', damage: '1d6+1' }] },
  'Cult Fanatic': { hp: 33, ac: 13, speed: 30, cr: 2, str: 11, dex: 14, con: 12, int: 10, wis: 13, cha: 14, attacks: [{ name: 'Dagger', bonus: '+4', damage: '1d4+2' }] },
}

// CR scaling factor for enemy roles
const ROLE_CR_MULTIPLIER = {
  grunt: 0.5,    // CR = avgLevel * 0.5
  leader: 1.0,   // CR = avgLevel
  boss: 2.0,     // CR = avgLevel + 2 (additive, not multiplicative)
  minion: 0.25,  // CR = avgLevel * 0.25
}

// Difficulty multipliers on total CR budget
const DIFFICULTY_MULTIPLIER = {
  easy: 0.75,
  medium: 1.0,
  hard: 1.25,
  deadly: 1.5,
}

/**
 * Scale enemy HP and AC based on target CR vs base CR.
 */
function scaleStats(baseStats, targetCR) {
  const baseCR = baseStats.cr || 0.25
  if (baseCR <= 0) return { ...baseStats }
  const ratio = Math.max(0.5, targetCR / baseCR)
  return {
    ...baseStats,
    hp: Math.max(1, Math.round(baseStats.hp * ratio)),
    ac: Math.round(baseStats.ac + (ratio > 1.5 ? 1 : 0) + (ratio > 3 ? 1 : 0)),
    cr: targetCR,
  }
}

/**
 * Resolve an encounter zone's enemy templates into concrete enemy objects.
 *
 * @param {object} encounterZone — zone with enemyTemplates array
 * @param {number} playerCount — current number of players in session
 * @param {number} avgLevel — average party level
 * @returns {Array} concrete enemy objects ready for startEncounter
 */
export function resolveEncounterTemplates(encounterZone, playerCount, avgLevel) {
  const templates = encounterZone.enemyTemplates
  if (!templates || !templates.length) return []

  const difficulty = encounterZone.difficulty || 'medium'
  const diffMult = DIFFICULTY_MULTIPLIER[difficulty] || 1.0
  const enemies = []

  for (const template of templates) {
    // Calculate count
    let count = 0
    if (template.fixedCount != null) {
      count = template.fixedCount
    } else if (template.countPerPlayer != null) {
      count = Math.max(1, Math.ceil(template.countPerPlayer * playerCount))
    } else {
      count = 1
    }

    // Calculate target CR based on role
    const role = template.role || 'grunt'
    let targetCR
    if (role === 'boss') {
      targetCR = avgLevel + 2
    } else {
      const mult = ROLE_CR_MULTIPLIER[role] || 0.5
      targetCR = Math.max(0.125, avgLevel * mult)
    }
    targetCR = Math.round(targetCR * diffMult * 4) / 4 // Round to nearest 0.25

    // Look up base stats
    const baseStats = BASE_ENEMY_STATS[template.name] || {
      hp: 10 + avgLevel * 5,
      ac: 10 + Math.floor(avgLevel / 3),
      speed: 30,
      cr: targetCR,
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      attacks: [{ name: 'Attack', bonus: `+${Math.floor(avgLevel / 2) + 2}`, damage: `1d6+${Math.floor(avgLevel / 2)}` }],
    }

    const scaled = scaleStats(baseStats, targetCR)

    enemies.push({
      name: template.name,
      count,
      stats: {
        hp: scaled.hp,
        ac: scaled.ac,
        speed: scaled.speed || 30,
        cr: scaled.cr,
        str: scaled.str || 10,
        dex: scaled.dex || 10,
        con: scaled.con || 10,
        int: scaled.int || 10,
        wis: scaled.wis || 10,
        cha: scaled.cha || 10,
      },
      attacks: scaled.attacks || baseStats.attacks,
      role: role,
    })
  }

  return enemies
}

/**
 * Check if an encounter zone uses the new template format.
 */
export function isTemplateFormat(encounterZone) {
  return Array.isArray(encounterZone.enemyTemplates) && encounterZone.enemyTemplates.length > 0
}
```

- [ ] **Step 2: Update useGameEffects.js encounter trigger to resolve templates**

In `src/hooks/useGameEffects.js`, add the import at the top:

```javascript
import { resolveEncounterTemplates, isTemplateFormat } from '../lib/encounterTemplateResolver'
```

Then update the encounter zone trigger effect (around line 199-201) where `relevantEnemies` is computed. Replace the enemy resolution logic:

```javascript
    // Resolve enemies — new template format or legacy fixed format
    let relevantEnemies
    if (isTemplateFormat(triggered)) {
      // New chapter format: resolve templates based on current party
      const playerCount = Math.max(1, (partyMembers || []).length + 1) // +1 for self
      const avgLevel = Math.max(1, Math.round(
        [...(partyMembers || []), myCharacter].filter(Boolean).reduce((s, m) => s + (m.level || 1), 0) /
        Math.max(1, (partyMembers || []).length + 1)
      ))
      relevantEnemies = resolveEncounterTemplates(triggered, playerCount, avgLevel)
    } else {
      // Legacy format: use fixed enemy arrays from zone
      relevantEnemies = triggered.enemies?.length
        ? (zone.enemies || []).filter(e => triggered.enemies.some(name => e.name === name || e.name?.startsWith(name + ' ')))
        : (zone.enemies || [])
    }
```

Also update the `buildEncounterPrompt` call to use `narratorPrompt` when present:

```javascript
    const prompt = buildEncounterPrompt(
      { ...triggered, dmPrompt: triggered.narratorPrompt || triggered.dmPrompt },
      ''
    )
```

- [ ] **Step 3: Update encounterSlice.js to skip old scaling for template-resolved enemies**

In `src/store/encounterSlice.js`, the scaling code at lines 48-63 should be skipped when enemies are already template-resolved. Add a check: if enemies have a `role` field (set by the template resolver), skip the old count scaling:

```javascript
    startEncounter: (enemies, partyMembers, autoRollInitiative = false, { surprise = false, hazards = [] } = {}) => {
      const combatants = [];

      // Scale enemy count to party size (legacy format only — template-resolved enemies skip this)
      const playerCount = Math.max(1, (partyMembers || []).length);
      let scaledEnemies = [...(enemies || [])];
      const isTemplateResolved = scaledEnemies.some(e => e.role);
      if (!isTemplateResolved) {
        if (playerCount <= 2 && scaledEnemies.length > 2) {
          scaledEnemies = scaledEnemies.slice(0, Math.max(1, playerCount));
        } else if (playerCount <= 3 && scaledEnemies.length > playerCount + 1) {
          scaledEnemies = scaledEnemies.slice(0, playerCount + 1);
        }
        if (playerCount <= 2) {
          scaledEnemies = scaledEnemies.map(e => ({
            ...e,
            count: Math.min(e.count || 1, Math.max(1, playerCount)),
          }));
        }
      }
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/lib/encounterTemplateResolver.js src/hooks/useGameEffects.js src/store/encounterSlice.js
git commit -m "Dynamic encounter scaling: resolve enemy templates at trigger time based on party size/level"
```

---

### Task 6: Character Level Snapshots

**Files:**
- Modify: `src/store/characterSlice.js:300-315` (applyLevelUp)
- Modify: `src/lib/charBuilder.js` (add autoLevelCharacter, stripToLevel)

- [ ] **Step 1: Add snapshot saving to applyLevelUp**

In `src/store/characterSlice.js`, replace `applyLevelUp` (lines 300-315):

```javascript
    applyLevelUp: (updates) => {
      set((state) => {
        const myChar = state.myCharacter;
        if (!myChar) return state;

        // Save snapshot of character at CURRENT level before applying level-up
        const snapshots = { ...(myChar.levelSnapshots || {}) };
        const { levelSnapshots: _, ...charWithoutSnapshots } = myChar;
        snapshots[String(myChar.level || 1)] = { ...charWithoutSnapshots };

        const updatedChar = { ...myChar, ...updates, levelSnapshots: snapshots };

        // Also save snapshot at the NEW level
        const { levelSnapshots: _2, ...newCharWithoutSnapshots } = updatedChar;
        updatedChar.levelSnapshots[String(updatedChar.level)] = { ...newCharWithoutSnapshots };

        const updatedCampaignChars = state.campaign.characters.map(c =>
          (c.id === myChar?.id || c.name === myChar?.name)
            ? { ...c, ...updates, levelSnapshots: updatedChar.levelSnapshots }
            : c
        );
        return {
          myCharacter: updatedChar,
          campaign: { ...state.campaign, characters: updatedCampaignChars },
        };
      });
      get().saveCampaignToSupabase();
    },
```

- [ ] **Step 2: Add scaleCharacterToLevel action to characterSlice**

Add this new action after `applyLevelUp` in `src/store/characterSlice.js`:

```javascript
    // Scale character to a target level for campaign joining
    // NOTE: import charBuilder at the top of characterSlice.js:
    //   import { autoLevelCharacter, stripToLevel } from '../lib/charBuilder'
    scaleCharacterToLevel: (targetLevel) => {
      set((state) => {
        const myChar = state.myCharacter;
        if (!myChar) return state;
        const currentLevel = myChar.level || 1;
        if (currentLevel === targetLevel) return state;

        let scaledChar;
        if (targetLevel < currentLevel) {
          // Scaling DOWN — try snapshot, fall back to strip
          const snapshot = myChar.levelSnapshots?.[String(targetLevel)];
          if (snapshot) {
            scaledChar = { ...snapshot, levelSnapshots: myChar.levelSnapshots };
          } else {
            scaledChar = { ...stripToLevel(myChar, targetLevel), levelSnapshots: myChar.levelSnapshots || {} };
          }
        } else {
          // Scaling UP — auto-level
          scaledChar = { ...autoLevelCharacter(myChar, currentLevel, targetLevel), levelSnapshots: myChar.levelSnapshots || {} };
        }

        return { myCharacter: scaledChar };
      });
      // Persist the scaled character
      get().updateMyCharacter({});
    },
```

- [ ] **Step 3: Add autoLevelCharacter and stripToLevel to charBuilder.js**

Append to the end of `src/lib/charBuilder.js`:

```javascript
/**
 * Auto-level a character from fromLevel to toLevel.
 * Uses average HP per level (no manual rolls). Auto-selects ASIs and spells.
 */
export function autoLevelCharacter(char, fromLevel, toLevel) {
  const result = { ...char }
  const cls = CLASS_DATA[result.class?.toLowerCase()] || CLASS_DATA.fighter || { hitDie: 8 }
  const conMod = statMod(result.stats?.con || 10)

  for (let lvl = fromLevel + 1; lvl <= toLevel; lvl++) {
    // HP: average hit die + CON mod per level
    const avgHp = Math.floor(cls.hitDie / 2) + 1 + conMod
    result.maxHp = (result.maxHp || 10) + Math.max(1, avgHp)
    result.currentHp = result.maxHp

    // Proficiency bonus
    result.proficiencyBonus = profBonus(lvl)

    // ASI at levels 4, 8, 12, 16, 19 — auto-apply to highest stat
    if ([4, 8, 12, 16, 19].includes(lvl)) {
      const stats = { ...result.stats }
      const highest = Object.entries(stats).sort((a, b) => b[1] - a[1])[0]
      if (highest && highest[1] < 20) {
        stats[highest[0]] = Math.min(20, highest[1] + 2)
        result.stats = stats
      }
    }

    // Spell slots
    result.spellSlots = buildSpellSlots(result.class, lvl)

    // Features
    result.features = buildFeatures(result.class, lvl)

    // Save snapshot at each auto-leveled level
    const snapshots = { ...(result.levelSnapshots || {}) }
    const { levelSnapshots: _, ...withoutSnapshots } = result
    snapshots[String(lvl)] = { ...withoutSnapshots, level: lvl }
    result.levelSnapshots = snapshots
  }

  result.level = toLevel
  return result
}

/**
 * Strip a character down to a target level when no snapshot exists.
 * Recalculates HP, spell slots, features, and removes higher-level content.
 */
export function stripToLevel(char, targetLevel) {
  const result = { ...char, level: targetLevel }
  const cls = CLASS_DATA[result.class?.toLowerCase()] || CLASS_DATA.fighter || { hitDie: 8 }
  const conMod = statMod(result.stats?.con || 10)

  // Recalculate HP from scratch
  const baseHp = cls.hitDie + conMod // Level 1 HP
  const perLevelHp = Math.floor(cls.hitDie / 2) + 1 + conMod
  result.maxHp = Math.max(1, baseHp + perLevelHp * (targetLevel - 1))
  result.currentHp = result.maxHp

  // Proficiency bonus
  result.proficiencyBonus = profBonus(targetLevel)

  // Spell slots for target level
  result.spellSlots = buildSpellSlots(result.class, targetLevel)

  // Features for target level
  result.features = buildFeatures(result.class, targetLevel)

  // Filter spells to only those available at target level
  if (result.spells && Array.isArray(result.spells)) {
    const maxSpellLevel = Math.ceil(targetLevel / 2)
    result.spells = result.spells.filter(s => (s.level || 0) <= maxSpellLevel)
  }

  // Remove excess ASI points (revert stats applied above target level)
  // This is approximate — we can't know exactly which ASIs were chosen
  // But we don't add stats beyond what's fair for the target level
  const asiLevels = [4, 8, 12, 16, 19].filter(l => l <= targetLevel)
  // No stat reduction needed — ASIs stay from prior decisions. Only features/spells restricted.

  return result
}
```

Note: `CLASS_DATA` is already available in charBuilder.js (defined in the helper constants at the top). If it's not exported, the functions above reference it locally.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/store/characterSlice.js src/lib/charBuilder.js
git commit -m "Add character level snapshots on level-up and auto-level/strip helpers"
```

---

### Task 7: Character Scaling on Campaign Join

**Files:**
- Modify: `src/components/CharacterSelect.jsx:72-93` (handleBring)
- Modify: `src/App.jsx` (campaign join flow)

- [ ] **Step 1: Update CharacterSelect handleBring to scale character**

In `src/components/CharacterSelect.jsx`, update the `handleBring` function to calculate party average level and scale:

```javascript
  async function handleBring(char) {
    // Calculate party average level from existing campaign members
    const { data: members } = await supabase
      .from('campaign_members')
      .select('character_data')
      .eq('campaign_id', campaignId)
      .not('character_data', 'is', null);

    const existingLevels = (members || [])
      .map(m => m.character_data?.level || 1)
      .filter(l => l > 0);
    const avgLevel = existingLevels.length > 0
      ? Math.max(1, Math.floor(existingLevels.reduce((a, b) => a + b, 0) / existingLevels.length))
      : 1;

    // Scale character to party average level if different
    let scaledChar = { ...char };
    const charLevel = char.level || 1;
    if (charLevel !== avgLevel) {
      if (charLevel > avgLevel) {
        // Scale down — try snapshot
        const snapshot = char.levelSnapshots?.[String(avgLevel)];
        if (snapshot) {
          scaledChar = { ...snapshot, levelSnapshots: char.levelSnapshots };
        } else {
          // Auto-strip
          const { stripToLevel } = await import('../lib/charBuilder');
          scaledChar = { ...stripToLevel(char, avgLevel), levelSnapshots: char.levelSnapshots || {} };
        }
      } else {
        // Scale up — auto-level
        const { autoLevelCharacter } = await import('../lib/charBuilder');
        scaledChar = { ...autoLevelCharacter(char, charLevel, avgLevel), levelSnapshots: char.levelSnapshots || {} };
      }
    }

    // Ensure level 1 snapshot exists (for characters created before snapshot system)
    if (!scaledChar.levelSnapshots?.[String(1)]) {
      const snapshots = { ...(scaledChar.levelSnapshots || {}) };
      const { levelSnapshots: _, ...withoutSnapshots } = scaledChar;
      if (charLevel === 1 || avgLevel === 1) {
        snapshots['1'] = { ...withoutSnapshots };
      }
      scaledChar.levelSnapshots = snapshots;
    }

    const { error: dbErr } = await supabase
      .from('campaign_members')
      .update({ character_data: scaledChar })
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id);

    if (dbErr) console.error('Failed to save character:', dbErr.message);
    onSelectExisting(scaledChar);
  }
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/CharacterSelect.jsx
git commit -m "Scale character to party average level on campaign join with snapshot support"
```

---

### Task 8: Chapter Milestone Detection + ChapterCompleteModal

**Files:**
- Modify: `src/store/campaignSlice.js` (add milestone tracking)
- Create: `src/components/ChapterCompleteModal.jsx` (new modal)
- Modify: `src/components/game/GameModalsRenderer.jsx` (wire modal)

- [ ] **Step 1: Add milestone state and check to campaignSlice**

In `src/store/campaignSlice.js`, add after `setCampaignComplete` (around line 180):

```javascript
    // Chapter milestone tracking
    chapterMilestoneReached: false,

    checkChapterMilestone: (triggerType, triggerId) => {
      const state = get();
      const milestone = state.campaign?.chapterMilestone;
      if (!milestone || state.chapterMilestoneReached) return false;
      if (milestone.trigger === triggerType && milestone.targetId === triggerId) {
        set({ chapterMilestoneReached: true });
        return true;
      }
      return false;
    },

    resetChapterMilestone: () => set({ chapterMilestoneReached: false }),
```

- [ ] **Step 2: Create ChapterCompleteModal.jsx**

```javascript
import { useState } from 'react';

export default function ChapterCompleteModal({ campaign, onContinue, onEndSession }) {
  const [continuing, setContinuing] = useState(false);
  const chapter = campaign?.chapter || 1;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Filigree corners */}
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
          <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.4" />
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', top: 8, right: 8, pointerEvents: 'none', transform: 'scaleX(-1)' }}>
          <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.4" />
        </svg>

        <div style={styles.icon}>⚔</div>
        <h2 style={styles.title}>Chapter {chapter} Complete!</h2>
        <p style={styles.description}>
          {campaign?.chapterMilestone?.description || 'You have reached a major milestone in your adventure.'}
        </p>

        <div style={styles.buttons}>
          <button
            onClick={() => { setContinuing(true); onContinue(); }}
            disabled={continuing}
            style={styles.continueBtn}
          >
            {continuing ? 'Forging next chapter...' : '🔥 Continue the Story'}
          </button>
          <button onClick={onEndSession} style={styles.endBtn}>
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    position: 'relative',
    background: 'linear-gradient(135deg, #1a1207 0%, #2a1f0e 50%, #1a1207 100%)',
    border: '2px solid #d4af37',
    borderRadius: 12,
    padding: '40px 48px',
    maxWidth: 480,
    width: '90vw',
    textAlign: 'center',
    boxShadow: '0 0 40px rgba(212,175,55,0.2), inset 0 1px 0 rgba(212,175,55,0.1)',
  },
  icon: { fontSize: 56, marginBottom: 8 },
  title: {
    color: '#d4af37',
    fontFamily: 'Cinzel, serif',
    fontSize: 28,
    margin: '0 0 12px',
  },
  description: {
    color: '#c4a882',
    fontSize: 15,
    lineHeight: 1.5,
    margin: '0 0 28px',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  continueBtn: {
    background: 'linear-gradient(135deg, #d4af37, #b8962e)',
    color: '#1a1207',
    border: 'none',
    borderRadius: 8,
    padding: '14px 24px',
    fontSize: 16,
    fontFamily: 'Cinzel, serif',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },
  endBtn: {
    background: 'transparent',
    color: '#8a7a6a',
    border: '1px solid #5a4a3a',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 14,
    cursor: 'pointer',
  },
};
```

- [ ] **Step 3: Wire ChapterCompleteModal into GameModalsRenderer**

In `src/components/game/GameModalsRenderer.jsx`, add a lazy import at the top:

```javascript
const ChapterCompleteModal = lazy(() => import('../ChapterCompleteModal'));
```

Add the modal render after the existing GameOverModal section (around line 267). The component needs access to `chapterMilestoneReached` from store and handlers:

```jsx
        {chapterMilestoneReached && (
          <Suspense fallback={null}>
            <ChapterCompleteModal
              campaign={campaign}
              onContinue={handleChapterContinue}
              onEndSession={handleEndSession}
            />
          </Suspense>
        )}
```

The `handleChapterContinue` and `handleEndSession` functions will need to be passed as props from the parent GameV2. For now, wire them as no-ops and implement in the next task:

Add to the GameModalsRenderer props:
```javascript
chapterMilestoneReached, handleChapterContinue, handleEndSession,
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/store/campaignSlice.js src/components/ChapterCompleteModal.jsx src/components/game/GameModalsRenderer.jsx
git commit -m "Add chapter milestone detection and ChapterCompleteModal"
```

---

### Task 9: Wire Milestone Checks Into Game Events

**Files:**
- Modify: `src/store/encounterSlice.js` (check milestone on combat victory)
- Modify: `src/hooks/useGameEffects.js` (check milestone on area transition)
- Modify: `src/store/campaignSlice.js` (check milestone on quest complete and story flag)

- [ ] **Step 1: Check milestone after combat victory**

In `src/store/encounterSlice.js`, in the `endEncounter` function (around line 899-993), after the victory handling, add a milestone check. Find where enemies are checked as all dead and add:

```javascript
      // Check chapter milestone: defeat_boss
      const milestone = get().campaign?.chapterMilestone;
      if (milestone?.trigger === 'defeat_boss') {
        // Check if any defeated enemy was in the milestone's target encounter zone
        const checkChapterMilestone = get().checkChapterMilestone;
        if (checkChapterMilestone) {
          checkChapterMilestone('defeat_boss', milestone.targetId);
        }
      }
```

- [ ] **Step 2: Check milestone after area transition**

In `src/hooks/useGameEffects.js`, in the area transition handler, after successfully transitioning to a new area, add:

```javascript
      // Check chapter milestone: reach_area
      const { checkChapterMilestone } = useStore.getState();
      if (checkChapterMilestone) {
        checkChapterMilestone('reach_area', newAreaId);
      }
```

- [ ] **Step 3: Check milestone on quest completion and story flags**

In `src/store/campaignSlice.js`, wherever quests are marked complete, add:

```javascript
    completeQuestObjective: (questId) => {
      set((state) => ({
        campaign: {
          ...state.campaign,
          questObjectives: (state.campaign.questObjectives || []).map(q =>
            q.id === questId ? { ...q, status: 'completed', completed: true } : q
          ),
        },
      }));
      // Check chapter milestone
      get().checkChapterMilestone('complete_quest', questId);
      get().saveCampaignToSupabase();
    },
```

For story flags, in the story flag slice (wherever `setStoryFlag` lives), add:

```javascript
      // After setting the flag:
      get().checkChapterMilestone?.('story_flag', flagName);
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/store/encounterSlice.js src/hooks/useGameEffects.js src/store/campaignSlice.js
git commit -m "Wire chapter milestone checks into combat victory, area transition, quest complete, story flags"
```

---

### Task 10: Chapter Continuation Flow

**Files:**
- Modify: `src/hooks/useGameEffects.js` or create `src/hooks/useChapterContinuation.js`
- Modify: `src/components/GameV2.jsx` (or wherever game orchestration lives)

- [ ] **Step 1: Create useChapterContinuation hook**

```javascript
import { useState, useCallback } from 'react';
import useStore from '../store/useStore';
import { generateCampaignJSON, getClaudeApiKey } from '../lib/claudeApi';
import { buildAreaWorld, buildStorySoFarPrompt, generateContinuationPrompt } from '../lib/campaignGenerator';
import { broadcastNarratorMessage } from '../lib/liveChannel';
import { v4 as uuidv4 } from 'uuid';

export function useChapterContinuation() {
  const [continuing, setContinuing] = useState(false);

  const handleChapterContinue = useCallback(async () => {
    setContinuing(true);
    const state = useStore.getState();
    const { campaign, narrator, activeCampaign } = state;

    try {
      const apiKey = await getClaudeApiKey(activeCampaign);
      if (!apiKey) {
        console.error('[chapterContinue] No API key available');
        setContinuing(false);
        return;
      }

      // Generate story summary
      const sessionLog = narrator?.history || [];
      const summaryPrompt = buildStorySoFarPrompt(campaign, sessionLog);

      // Use Haiku for the summary (cheap, fast)
      const summaryResponse = await generateCampaignJSON(summaryPrompt, apiKey, 'claude-haiku-4-5-20251001');
      const storySoFar = typeof summaryResponse === 'string' ? summaryResponse : JSON.stringify(summaryResponse);

      // Generate next chapter
      const nextChapter = (campaign.chapter || 1) + 1;
      const contPrompt = generateContinuationPrompt(
        campaign.tone || 'Heroic Fantasy',
        campaign.setting || 'Medieval Kingdom',
        nextChapter,
        storySoFar,
        campaign.questObjectives,
        campaign.factions,
      );

      const rawText = await generateCampaignJSON(contPrompt, apiKey);
      const parsed = JSON.parse(rawText.replace(/```json\n?/g, '').replace(/```/g, '').trim());
      const newWorld = buildAreaWorld({ ...parsed, chapter: nextChapter });

      // Merge new areas/briefs into existing campaign
      useStore.setState((s) => ({
        campaign: {
          ...s.campaign,
          chapter: nextChapter,
          areas: { ...s.campaign.areas, ...newWorld.areas },
          areaBriefs: { ...s.campaign.areaBriefs, ...newWorld.areaBriefs },
          questObjectives: [
            ...(s.campaign.questObjectives || []),
            ...(newWorld.questObjectives || []).filter(q =>
              !(s.campaign.questObjectives || []).some(eq => eq.id === q.id)
            ),
          ],
          chapterMilestone: newWorld.chapterMilestone,
          storyMilestones: [...(s.campaign.storyMilestones || []), ...(newWorld.storyMilestones || [])],
        },
        chapterMilestoneReached: false,
      }));

      // Transition to new chapter start area
      if (newWorld.startArea) {
        const { activateArea } = useStore.getState();
        if (activateArea) activateArea(newWorld.startArea);
      }

      // Announce to all players
      const msg = {
        role: 'dm',
        speaker: 'The Narrator',
        text: `Chapter ${nextChapter} begins! The adventure continues...`,
        id: uuidv4(),
        timestamp: Date.now(),
      };
      useStore.getState().addNarratorMessage?.(msg);
      broadcastNarratorMessage(msg);

      // Save
      useStore.getState().saveCampaignToSupabase?.();
    } catch (err) {
      console.error('[chapterContinue] Error:', err);
      const msg = {
        role: 'dm',
        speaker: 'The Narrator',
        text: 'Failed to generate the next chapter. Try again later.',
        id: uuidv4(),
        timestamp: Date.now(),
      };
      useStore.getState().addNarratorMessage?.(msg);
    }

    setContinuing(false);
  }, []);

  const handleEndSession = useCallback(() => {
    useStore.getState().saveCampaignToSupabase?.();
    useStore.getState().saveSessionStateToSupabase?.();
    // Reset milestone state but keep campaign
    useStore.setState({ chapterMilestoneReached: false });
    // Navigate back to campaign select
    useStore.getState().setAppView?.('campaignSelect');
  }, []);

  return { continuing, handleChapterContinue, handleEndSession };
}
```

- [ ] **Step 2: Wire hook into GameV2 and pass to GameModalsRenderer**

In `src/components/GameV2.jsx` (or the game orchestrator), import and use the hook:

```javascript
import { useChapterContinuation } from '../hooks/useChapterContinuation';
```

Inside the component:
```javascript
  const { handleChapterContinue, handleEndSession } = useChapterContinuation();
  const chapterMilestoneReached = useStore(s => s.chapterMilestoneReached);
```

Pass these as props to GameModalsRenderer:
```javascript
  <GameModalsRenderer
    /* ...existing props... */
    chapterMilestoneReached={chapterMilestoneReached}
    handleChapterContinue={handleChapterContinue}
    handleEndSession={handleEndSession}
  />
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useChapterContinuation.js src/components/GameV2.jsx src/components/game/GameModalsRenderer.jsx
git commit -m "Wire chapter continuation flow: story summary, next chapter generation, area transition"
```

---

### Task 11: Update Demo Campaign to Chapter Format

**Files:**
- Modify: `src/data/demoArea.js`
- Modify: `src/components/CreateCampaign.jsx` (handleTryDemo)

- [ ] **Step 1: Update DEMO_BRIEFS to use encounter templates**

Replace `src/data/demoArea.js` entirely:

```javascript
import { buildAreaFromBrief } from '../lib/areaBuilder.js'

/**
 * Demo world briefs — a playable chapter-1 campaign across 3 connected areas:
 *   Village → Forest (goblins) → Ruins (boss)
 * Uses encounter templates for dynamic party scaling.
 */
const DEMO_BRIEFS = {
  'area-village': {
    id: 'area-village',
    name: 'Millhaven Village',
    width: 80,
    height: 60,
    theme: 'village',
    pois: [
      { type: 'tavern_main', position: 'center-west', label: 'The Weary Traveler' },
      { type: 'house_small', position: 'center-east', label: "Elder's House" },
      { type: 'clearing_grass', position: 'south-center', label: 'Town Square' },
    ],
    connections: [
      { from: 'The Weary Traveler', to: 'Town Square' },
      { from: "Elder's House", to: 'Town Square' },
    ],
    npcs: [
      { name: 'Barkeep Hilda', position: 'The Weary Traveler', personality: 'Gruff but kind tavern owner who has heard rumors of goblin activity in the forest to the north', questRelevant: true },
      { name: 'Elder Maren', position: "Elder's House", personality: 'Wise village elder who asks you to investigate the old ruins in the forest', questRelevant: true },
    ],
    encounterZones: [],
    exits: [
      { edge: 'north', targetArea: 'area-forest', label: 'Forest Path' },
    ],
    lightSources: [
      { position: { x: 15, y: 12 }, type: 'fireplace' },
      { position: { x: 8, y: 8 }, type: 'torch' },
    ],
    playerStart: { x: 20, y: 20 },
  },
  'area-forest': {
    id: 'area-forest',
    name: 'Darkwood Forest',
    width: 100,
    height: 75,
    theme: 'forest',
    pois: [
      { type: 'clearing_grass', position: 'south-center', label: 'Forest Edge' },
      { type: 'clearing_grass', position: 'center', label: 'Ancient Clearing' },
      { type: 'clearing_grass', position: 'north-east', label: 'Goblin Camp' },
    ],
    connections: [
      { from: 'Forest Edge', to: 'Ancient Clearing' },
      { from: 'Ancient Clearing', to: 'Goblin Camp' },
    ],
    npcs: [
      { name: 'Wounded Scout', position: 'Forest Edge', personality: 'An injured ranger who warns of goblins deeper in the forest and mentions hearing chanting from old ruins', questRelevant: true },
    ],
    encounterZones: [
      {
        id: 'goblin_camp',
        triggerRadius: 5,
        difficulty: 'medium',
        enemyTemplates: [
          { name: 'Goblin', role: 'grunt', countPerPlayer: 0.75 },
        ],
        narratorPrompt: 'Three goblins leap from behind the trees, brandishing crude weapons!',
        storyFlag: 'warned_about_goblins',
      },
    ],
    exits: [
      { edge: 'south', targetArea: 'area-village', label: 'Back to Village' },
      { edge: 'north', targetArea: 'area-ruins', label: 'Ancient Ruins' },
    ],
    lightSources: [],
    playerStart: { x: 25, y: 35 },
  },
  'area-ruins': {
    id: 'area-ruins',
    name: 'Sunken Ruins',
    width: 40,
    height: 40,
    theme: 'dungeon',
    pois: [
      { type: 'dungeon_room_basic', position: 'south-center', label: 'Entrance Hall' },
      { type: 'dungeon_room_basic', position: 'center', label: 'Ritual Chamber' },
      { type: 'dungeon_room_basic', position: 'north-center', label: 'Vault' },
    ],
    connections: [
      { from: 'Entrance Hall', to: 'Ritual Chamber' },
      { from: 'Ritual Chamber', to: 'Vault' },
    ],
    npcs: [],
    encounterZones: [
      {
        id: 'skeleton_guard',
        triggerRadius: 5,
        difficulty: 'medium',
        enemyTemplates: [
          { name: 'Skeleton', role: 'grunt', countPerPlayer: 0.5 },
        ],
        narratorPrompt: 'Ancient skeletons animate and rise from the dusty floor, eyes glowing with unholy light!',
      },
      {
        id: 'boss_fight',
        triggerRadius: 4,
        difficulty: 'deadly',
        enemyTemplates: [
          { name: 'Goblin Boss', role: 'boss', fixedCount: 1 },
          { name: 'Skeleton', role: 'minion', countPerPlayer: 0.5 },
        ],
        narratorPrompt: 'The Goblin Boss stands before a locked chest, surrounded by stolen village treasures. "You dare challenge me?!"',
      },
    ],
    exits: [
      { edge: 'south', targetArea: 'area-forest', label: 'Back to Forest' },
    ],
    lightSources: [
      { position: { x: 20, y: 30 }, type: 'torch' },
      { position: { x: 20, y: 20 }, type: 'torch' },
    ],
  },
}

export function buildDemoArea() {
  const startArea = buildAreaFromBrief(DEMO_BRIEFS['area-village'], 42)
  return startArea
}

export function getDemoBriefs() {
  return { ...DEMO_BRIEFS }
}
```

- [ ] **Step 2: Update handleTryDemo in CreateCampaign.jsx**

Add `chapter`, `chapterMilestone`, and `tone`/`setting` to the demo campaign data:

```javascript
    const demoCampaignData = {
      title: 'Whispers in Millhaven',
      description: 'A demo chapter: a quiet village, a goblin-infested forest, and sunken ruins hiding a boss fight.',
      chapter: 1,
      tone: 'Heroic Fantasy',
      setting: 'Medieval Kingdom',
      startArea: 'area-village',
      chapterMilestone: {
        trigger: 'defeat_boss',
        targetId: 'boss_fight',
        description: 'Defeat the Goblin Boss in the Sunken Ruins',
      },
      factions: [
        { id: 'millhaven-guard', name: 'Millhaven Guard', description: 'Village militia protecting the locals from goblin raids', alignment: 'Lawful Good' },
        { id: 'goblin-tribe', name: 'Goblin Tribe', description: 'Scattered goblin forces seeking treasure and revenge', alignment: 'Chaotic Evil' },
      ],
      areaBriefs,
      questObjectives: [
        { id: 'investigate', text: 'Investigate the goblin activity in Darkwood Forest', completed: false, status: 'active' },
        { id: 'ruins', text: 'Explore the Sunken Ruins and defeat the Goblin Boss', completed: false, status: 'active' },
      ],
    };
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/data/demoArea.js src/components/CreateCampaign.jsx
git commit -m "Update demo campaign to chapter format with encounter templates and milestone"
```

---

### Task 12: Host Rename in Campaign Creation UI

**Files:**
- Modify: `src/components/CreateCampaign.jsx` (any remaining "DM" user-facing strings)

- [ ] **Step 1: Search and replace user-facing DM references**

In CreateCampaign.jsx, after all previous changes, search for any remaining user-facing "DM" or "Dungeon Master" strings. The main ones are:
- The `role: 'dm'` in Supabase inserts stays (technical)
- Any UI labels or tooltips that say "DM" → "Host"

After the rewrite in Task 2, there should be minimal user-facing DM text left in CreateCampaign.jsx since the old step labels and dropdown labels are gone. Check for any remaining:

```bash
grep -n -i "DM\|dungeon master" src/components/CreateCampaign.jsx
```

If any user-facing strings remain (labels, placeholder text, tooltips), change them to "Host."

- [ ] **Step 2: Verify build passes**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/CreateCampaign.jsx
git commit -m "Rename user-facing DM references to Host in campaign creation"
```

---

### Task 13: Final Build Verification and Integration Check

**Files:**
- All modified files from tasks 1-12

- [ ] **Step 1: Full build verification**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Check for import errors**

Verify all new imports resolve:
- `src/lib/encounterTemplateResolver.js` imported in `useGameEffects.js`
- `ChapterCompleteModal.jsx` lazy-imported in `GameModalsRenderer.jsx`
- `useChapterContinuation.js` imported in `GameV2.jsx`
- `autoLevelCharacter`, `stripToLevel` importable from `charBuilder.js`
- `buildStorySoFarPrompt`, `generateContinuationPrompt` importable from `campaignGenerator.js`

- [ ] **Step 3: Check for broken references**

Grep for references to removed fields that may break:
```bash
grep -rn "fields\.length\|fields\.players\|fields\.level\|fields\.villain" src/
```
Fix any remaining references to removed fields.

- [ ] **Step 4: Verify the demo still works**

Check that `getDemoBriefs()` returns valid briefs without `enemies` arrays (now using encounterZones with templates).

- [ ] **Step 5: Update tasks/status.md**

Add a new section for this work:

```markdown
### Campaign Creation Overhaul ✅ COMPLETE
- [x] 2-step wizard (Concept+Forge → Success), removed length/players/level/villain
- [x] 8 original tones + 8 original settings (no WotC IP)
- [x] Chapter-based generation (~4 hours per chapter) with milestone endpoint
- [x] Encounter templates (countPerPlayer, fixedCount, role) instead of fixed enemy arrays
- [x] Dynamic encounter scaling at combat trigger time (party size + level)
- [x] Character level snapshots on every level-up
- [x] Character scaling on campaign join (auto-level up, snapshot/strip down)
- [x] Chapter continuation: story summary + next chapter generation
- [x] ChapterCompleteModal with Continue/End Session
- [x] Demo campaign updated to chapter format
- [x] Host rename in campaign creation UI (DM → Host)
- [x] Backward compat: existing campaigns with enemies arrays still work
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "Campaign creation overhaul: 2-step wizard, chapter system, dynamic scaling, level snapshots"
```
