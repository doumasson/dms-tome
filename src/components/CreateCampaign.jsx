import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateCampaignJSON } from '../lib/claudeApi';
import { loadDefaultApiKey } from '../lib/defaultApiKey';
import { DEMO_CAMPAIGN } from '../data/demoCampaign';
import useStore from '../store/useStore';

const TONES = ['Heroic & Epic', 'Dark & Gritty', 'Swashbuckling', 'Horror', 'Political Intrigue', 'Whimsical'];
const SETTINGS = ['High Fantasy', 'Forgotten Realms', 'Dark Gothic', 'Steampunk', 'Ancient World', 'Urban Fantasy', 'Sci-Fi'];
const LENGTHS = ['One-shot (~4 hours)', 'Short campaign (3–5 sessions)', 'Full campaign (10+ sessions)'];
const LEVELS = ['1–4 (Tier 1)', '5–10 (Tier 2)', '11–16 (Tier 3)', '17–20 (Tier 4)'];
const VILLAINS = ['Ancient Dragon', 'Lich', 'Demon Lord', 'Corrupt Noble', 'Cosmic Horror', 'Cult Leader', 'Rival Adventurer'];

const DRAFT_KEY = 'dm-tome-wizard-draft';

// Clean up AI-generated JSON before parsing
function cleanJsonText(str) {
  let cleaned = str;

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json/gi, '');
  cleaned = cleaned.replace(/```/g, '');

  // Replace escaped brackets using split/join (more reliable than regex)
  cleaned = cleaned.split('\\[').join('[');
  cleaned = cleaned.split('\\]').join(']');
  cleaned = cleaned.split('\\{').join('{');
  cleaned = cleaned.split('\\}').join('}');

  cleaned = cleaned.trim();

  // Extract JSON object boundaries
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) cleaned = cleaned.slice(0, lastBrace + 1);

  console.log('Before cleanup:', str.substring(0, 200));
  console.log('After cleanup:', cleaned.substring(0, 200));

  return cleaned;
}

function generatePrompt(fields) {
  return `You are a D&D 5e campaign designer. Create a complete campaign as a set of interconnected area briefs with the following specifications:

Campaign Name: ${fields.name}
Tone: ${fields.tone}
Setting: ${fields.setting}
Length: ${fields.length}
Number of Players: ${fields.players}
Starting Level: ${fields.level}
Main Villain: ${fields.villain}
Key Themes & Notes: ${fields.themes || 'None specified'}

Generate a JSON object with this EXACT structure (no extra text before or after, just the JSON):

{
  "title": "${fields.name}",
  "startArea": "area-village",
  "questObjectives": [
    { "id": "q1", "name": "Main quest objective description", "status": "active" }
  ],
  "storyMilestones": ["Meet the hermit", "Enter the dungeon"],
  "areaBriefs": {
    "area-village": {
      "id": "area-village",
      "name": "Thornwood Village",
      "width": 40,
      "height": 30,
      "theme": "village",
      "pois": [
        { "type": "tavern_main", "position": "center-west", "label": "The Rusty Flagon" },
        { "type": "house_small", "position": "center-east", "label": "Elder's House" },
        { "type": "clearing_grass", "position": "south-center", "label": "Market Square" }
      ],
      "connections": [
        { "from": "The Rusty Flagon", "to": "Market Square" },
        { "from": "Market Square", "to": "Elder's House" }
      ],
      "npcs": [
        { "name": "Barkeep Hilda", "position": "The Rusty Flagon", "personality": "Gruff but kind tavern owner, knows local rumors", "questRelevant": true }
      ],
      "enemies": [],
      "encounterZones": [],
      "exits": [
        { "edge": "north", "targetArea": "area-forest", "label": "Forest Path" }
      ]
    },
    "area-forest": {
      "id": "area-forest",
      "name": "Darkwood Pass",
      "width": 40,
      "height": 30,
      "theme": "forest",
      "pois": [
        { "type": "clearing_grass", "position": "center", "label": "Clearing" },
        { "type": "house_small", "position": "north-west", "label": "Hermit's Hut" }
      ],
      "connections": [
        { "from": "Clearing", "to": "Hermit's Hut" }
      ],
      "npcs": [
        { "name": "Old Marren", "position": "Hermit's Hut", "personality": "Paranoid hermit who knows about the curse" }
      ],
      "enemies": [
        { "name": "Goblin Scout", "position": "Clearing", "count": 3, "stats": { "hp": 7, "ac": 15, "speed": 30, "cr": "1/4" }, "attacks": [{ "name": "Scimitar", "bonus": "+4", "damage": "1d6+2" }] }
      ],
      "encounterZones": [
        { "id": "goblin_ambush", "triggerRadius": 5, "enemies": ["Goblin Scout"], "dmPrompt": "Goblin scouts ambush the party as they cross the clearing" }
      ],
      "exits": [
        { "edge": "south", "targetArea": "area-village", "label": "Back to Village" },
        { "edge": "north", "targetArea": "area-dungeon", "label": "Dungeon Entrance" }
      ]
    }
  }
}

AVAILABLE POI TYPES (chunk IDs — you MUST use only these):
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

POSITION VALUES (where to place the POI on the map):
center, north, south, east, west, north-east, north-west, south-east, south-west, center-north, center-south, center-east, center-west

EXIT EDGES: north, south, east, west
EXIT TYPES (optional field): stairs_up, stairs_down, ladder
  - Stair/ladder exits are anchored to a POI position, not a map edge
  - Use "spawnAt" (POI label) to indicate which POI the stairs appear at
  - Example: { "type": "stairs_up", "spawnAt": "Tavern Common Room", "targetArea": "area-tavern-floor2", "label": "Upstairs" }

MULTI-FLOOR BUILDINGS:
When a building warrants multiple floors (taverns, inns, castles, dungeons, caves), generate separate area briefs for each floor linked by stair exits:
- Use exits with type "stairs_up" or "stairs_down" to connect floor briefs
- Add "parentArea" field linking interior floors to the outdoor area they belong to
- Add "floorLevel" field (1 = ground floor, 2+ = upper floors, -1 = basement/cellar)
- Dungeons should always have at least 2 levels
- Small buildings (shops, small houses) stay single-floor

Requirements:
- Create 3–6 areas forming a connected graph (every area reachable via exits)
- Exits MUST be bidirectional: if area A exits to area B, area B must exit back to area A
- Each area should have 2–5 POIs
- Include 3–6 NPCs across areas with distinct personalities
- The villain (${fields.villain}) should appear in a later area
- Set questRelevant: true on NPCs that advance the story
- Area dimensions: width 30–60, height 20–40
- NPC "position" must match a POI "label" in the same area
- Connection "from"/"to" must match POI "label" values in the same area
- Tone: ${fields.tone}

OUTPUT INSTRUCTIONS:
- Output ONLY valid JSON, no other text
- Use standard brackets [ ] not escaped \\[ \\]
- Do NOT wrap in markdown code blocks
- Start with { and end with }`;
}

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function validateCampaignJson(text) {
  const cleaned = cleanJsonText(text);
  try {
    const data = JSON.parse(cleaned);
    if (!data.title) throw new Error('Missing "title" field');
    // Accept V1 (scenes), V2 legacy (zones), or V2 area briefs
    const hasScenes = Array.isArray(data.scenes) && data.scenes.length > 0;
    const hasZones = (Array.isArray(data.zones) && data.zones.length > 0) || (data.zones && typeof data.zones === 'object' && Object.keys(data.zones).length > 0);
    const hasAreaBriefs = data.areaBriefs && typeof data.areaBriefs === 'object' && Object.keys(data.areaBriefs).length > 0;
    if (!hasScenes && !hasZones && !hasAreaBriefs) throw new Error('Missing "areaBriefs", "zones", or "scenes" — campaign has no content');
    return { ok: true, data };
  } catch (e) {
    const hint = e instanceof SyntaxError
      ? 'The AI included extra text or formatting. Copy only the JSON — it must start with { and end with }.'
      : e.message;
    return { ok: false, error: hint };
  }
}

const DEFAULT_FIELDS = {
  name: '',
  isAiDm: true,
  tone: TONES[0],
  setting: SETTINGS[0],
  length: LENGTHS[0],
  players: '4',
  level: LEVELS[0],
  villain: VILLAINS[0],
  themes: '',
};

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

  // Restore draft on mount — ONLY from explicit DB draft (user selected a draft from campaign list).
  // Fresh "Create New Campaign" clicks never restore anything — always start at step 1.
  useEffect(() => {
    if (draftCampaign?.campaign_data?.__draft) {
      const { fields: savedFields, __step } = draftCampaign.campaign_data;
      if (savedFields) setFields(f => ({ ...f, ...savedFields }));
      if (__step > 1) setStep(__step);
      setCampaignId(draftCampaign.id);
    }
    // Never read from localStorage on mount — avoids stale step/JSON pre-fill on fresh creates.
  }, []);

  function setField(key, val) {
    setFields(f => ({ ...f, [key]: val }));
  }

  function saveDraftLocally(currentStep, currentFields, currentCampaignId) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      userId: user.id,
      campaignId: currentCampaignId,
      step: currentStep,
      fields: currentFields,
    }));
  }

  function saveDraftToDb(currentStep, currentFields, id) {
    if (!id) return;
    // Fire-and-forget — don't block the UI
    supabase
      .from('campaigns')
      .update({ campaign_data: { __draft: true, __step: currentStep, fields: currentFields } })
      .eq('id', id)
      .then(() => {});
  }

  // Step 1 "Next" — create the campaign record in DB right away
  async function handleStep1Next() {
    if (!fields.name.trim()) return;
    setSaving(true);

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
        // Add user as DM member immediately
        await supabase.from('campaign_members').insert({
          campaign_id: id,
          user_id: user.id,
          role: 'dm',
        });
      }
      // If insert failed, continue anyway — we'll try again at the end
    } else {
      // Update the name in case it changed
      supabase
        .from('campaigns')
        .update({ name: fields.name.trim(), campaign_data: { __draft: true, __step: 1, fields } })
        .eq('id', id)
        .then(() => {});
    }

    setSaving(false);
    setStep(2);
    saveDraftLocally(2, fields, id);
  }

  function handleStartOver() {
    localStorage.removeItem(DRAFT_KEY);
    setFields(DEFAULT_FIELDS);
    setStep(1);
    setGenerateError('');
    setNeedsByok(false);
    setByokKey('');
    // Keep campaignId so we reuse the existing DB draft record instead of orphaning it
  }

  async function handleTryDemo() {
    setDemoLoading(true);
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        name: DEMO_CAMPAIGN.title,
        dm_user_id: user.id,
        invite_code: inviteCode,
        campaign_data: DEMO_CAMPAIGN,
        settings: { isAiDm: true },
      })
      .select()
      .single();

    if (error || !campaign) { setDemoLoading(false); return; }

    await supabase.from('campaign_members').insert({
      campaign_id: campaign.id,
      user_id: user.id,
      role: 'dm',
    });

    preGenerateSceneImages(campaign.id, DEMO_CAMPAIGN.scenes || []);
    setDemoLoading(false);
    onDone({ ...campaign, userRole: 'dm' });
  }

  async function doGenerate(apiKey) {
    const rawText = await generateCampaignJSON(generatePrompt(fields), apiKey);
    const cleaned = cleanJsonText(rawText);
    const validation = validateCampaignJson(cleaned);
    if (!validation.ok) throw new Error(validation.error);
    await handleCreate(validation.data, apiKey);
  }

  async function handleAutoGenerate() {
    setStep(3);
    setGenerateError('');
    setGenerating(true);
    setNeedsByok(false);
    try {
      let apiKey = await loadDefaultApiKey();
      if (!apiKey) {
        // No platform key - show BYOK input and stop
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

  async function handleByokSubmit() {
    if (!byokKey.trim()) return;
    setGenerating(true);
    setGenerateError('');
    setNeedsByok(false);
    try {
      await doGenerate(byokKey.trim());
    } catch (err) {
      setGenerateError(err.message || 'Generation failed');
      setGenerating(false);
    }
  }

  async function handleCreate(parsedData, apiKey) {
    setCreating(true);

    let campaign;
    const campaignData = parsedData;
    const settingsObj = { isAiDm: true };
    if (apiKey && apiKey !== (await loadDefaultApiKey())) {
      // User provided their own key — store it in campaign settings
      settingsObj.claudeApiKey = apiKey;
    }

    if (campaignId) {
      // Update the existing draft record with final campaign data
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          name: campaignData.title || fields.name,
          campaign_data: campaignData,
          settings: settingsObj,
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) {
        setGenerateError('Failed to save campaign: ' + error.message);
        setCreating(false);
        setGenerating(false);
        return;
      }
      campaign = data;
    } else {
      // Fallback: no draft record exists yet, create from scratch
      const inviteCode = generateInviteCode();
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name: campaignData.title || fields.name,
          dm_user_id: user.id,
          invite_code: inviteCode,
          campaign_data: campaignData,
          settings: settingsObj,
        })
        .select()
        .single();

      if (error) {
        setGenerateError('Failed to create campaign: ' + error.message);
        setCreating(false);
        setGenerating(false);
        return;
      }
      campaign = data;

      await supabase.from('campaign_members').insert({
        campaign_id: campaign.id,
        user_id: user.id,
        role: 'dm',
      });
    }

    localStorage.removeItem(DRAFT_KEY);
    setCreatedCampaign(campaign);
    setCreating(false);
    setGenerating(false);
    setStep(4);
  }

  const inviteLink = createdCampaign
    ? `${window.location.origin}?invite=${createdCampaign.invite_code}`
    : '';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Back button */}
        <button onClick={step > 1 && step < 4 ? () => setStep(s => s - 1) : onBack} style={styles.backBtn}>
          ← {step > 1 && step < 4 ? 'Back' : 'All Campaigns'}
        </button>

        {/* Progress — 3 dots (steps 1, 2, 3 don't show generating/success) */}
        {step <= 2 && (
          <div style={styles.progress}>
            {[1,2,3].map(s => (
              <div key={s} style={{ ...styles.dot, background: s <= step ? 'var(--gold)' : 'var(--border-color)' }} />
            ))}
          </div>
        )}

        {/* Step 1: Name + Tone + Setting */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>New Campaign</h2>

            {/* Quick-start demo card */}
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              style={styles.demoCard}
            >
              <div style={styles.demoLeft}>
                <span style={styles.demoIcon}>🗡</span>
                <div>
                  <div style={styles.demoTitle}>Whispers in the Dark</div>
                  <div style={styles.demoSubtitle}>Ready-to-play 4-hour one-shot · No setup · 3–5 players · AI Dungeon Master</div>
                </div>
              </div>
              <div style={styles.demoRight}>
                <span style={styles.demoBadge}>DEMO</span>
                <span style={styles.demoArrow}>{demoLoading ? '...' : '→'}</span>
              </div>
            </button>

            <div style={styles.orDivider}>
              <span style={styles.orLine} /><span style={styles.orText}>or create your own</span><span style={styles.orLine} />
            </div>

            <label style={{ ...styles.label, marginTop: 4 }}>Campaign Name</label>
            <input
              autoFocus
              value={fields.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. The Curse of Strahd's Shadow"
              style={styles.input}
              onKeyDown={e => e.key === 'Enter' && fields.name.trim() && handleStep1Next()}
            />

            <label style={{ ...styles.label, marginTop: 16 }}>Campaign Tone</label>
            <div style={styles.optionGrid}>
              {TONES.map(t => (
                <button key={t} onClick={() => setField('tone', t)}
                  style={{ ...styles.optionBtn, ...(fields.tone === t ? styles.optionBtnActive : {}) }}>
                  {t}
                </button>
              ))}
            </div>

            <label style={{ ...styles.label, marginTop: 16 }}>Setting</label>
            <div style={styles.optionGrid}>
              {SETTINGS.map(s => (
                <button key={s} onClick={() => setField('setting', s)}
                  style={{ ...styles.optionBtn, ...(fields.setting === s ? styles.optionBtnActive : {}) }}>
                  {s}
                </button>
              ))}
            </div>

            <button
              disabled={!fields.name.trim() || saving}
              onClick={handleStep1Next}
              style={styles.nextBtn}
            >
              {saving ? 'Saving...' : 'Next →'}
            </button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Campaign Details</h2>
            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>Campaign Length</label>
                <select value={fields.length} onChange={e => setField('length', e.target.value)} style={styles.select}>
                  {LENGTHS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={styles.col}>
                <label style={styles.label}>Number of Players</label>
                <select value={fields.players} onChange={e => setField('players', e.target.value)} style={styles.select}>
                  {['2','3','4','5','6'].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>Starting Level</label>
                <select value={fields.level} onChange={e => setField('level', e.target.value)} style={styles.select}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={styles.col}>
                <label style={styles.label}>Main Villain</label>
                <select value={fields.villain} onChange={e => setField('villain', e.target.value)} style={styles.select}>
                  {VILLAINS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <label style={styles.label}>Key Themes &amp; Notes (optional)</label>
            <textarea
              value={fields.themes}
              onChange={e => setField('themes', e.target.value)}
              placeholder="e.g. Themes of redemption, a cursed artifact, rival adventuring party..."
              style={styles.textarea}
              rows={3}
            />
            <button onClick={handleAutoGenerate} style={styles.createBtn}>
              Create Campaign →
            </button>
          </div>
        )}

        {/* Step 3: Generating... */}
        {step === 3 && (
          <div style={styles.stepContent}>
            {generating && (
              <div style={styles.generatingWrap}>
                <div style={styles.spinner} />
                <h2 style={styles.stepTitle}>Forging your world...</h2>
                <p style={styles.hint}>This usually takes about 30 seconds. The AI Dungeon Master is crafting areas, NPCs, and encounters.</p>
              </div>
            )}

            {!generating && needsByok && !generateError && (
              <div style={styles.stepContent}>
                <h2 style={styles.stepTitle}>API Key Required</h2>
                <p style={styles.hint}>No platform key configured. Enter your Claude API key to generate the campaign:</p>
                <input
                  value={byokKey}
                  onChange={e => setByokKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{ ...styles.input, fontFamily: 'monospace', fontSize: '0.85rem' }}
                  onKeyDown={e => e.key === 'Enter' && byokKey.trim() && handleByokSubmit()}
                  type="password"
                />
                <button
                  onClick={handleByokSubmit}
                  disabled={!byokKey.trim()}
                  style={styles.createBtn}
                >
                  Generate Campaign →
                </button>
                <button onClick={handleStartOver} style={styles.startOverBtn}>
                  ↺ Start Over
                </button>
              </div>
            )}

            {!generating && generateError && (
              <div style={styles.stepContent}>
                <h2 style={styles.stepTitle}>Generation Failed</h2>
                <p style={styles.errorMsg}>{generateError}</p>
                <button onClick={handleAutoGenerate} style={styles.nextBtn}>
                  Retry →
                </button>
                <button onClick={handleStartOver} style={styles.startOverBtn}>
                  ↺ Start Over
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && createdCampaign && (
          <div style={styles.stepContent}>
            <div style={styles.successIcon}>⚔</div>
            <h2 style={styles.stepTitle}>Campaign Created!</h2>
            <p style={styles.hint}>Share this invite link with your players:</p>
            <div style={styles.inviteBox}>
              <span style={styles.inviteLink}>{inviteLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={styles.copyLinkBtn}
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <p style={styles.inviteCodeLabel}>Invite Code: <strong style={{ color: 'var(--gold)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{createdCampaign.invite_code}</strong></p>
            <button onClick={() => onDone(createdCampaign)} style={styles.createBtn}>
              Enter Campaign →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 24px',
    boxSizing: 'border-box',
  },
  card: {
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
    border: '1px solid var(--border-gold)',
    borderRadius: 16,
    padding: '36px 40px',
    maxWidth: 620,
    width: '100%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: "'Cinzel', Georgia, serif",
    padding: '0 0 16px',
    display: 'block',
  },
  progress: {
    display: 'flex',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'background 0.2s',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  stepTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    color: 'var(--gold)',
    fontSize: '1.3rem',
    fontWeight: 700,
    margin: '0 0 4px',
    letterSpacing: '0.03em',
  },
  hint: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    lineHeight: 1.6,
    margin: 0,
  },
  label: {
    color: 'var(--text-secondary)',
    fontSize: '0.82rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    fontFamily: "'Cinzel', Georgia, serif",
    marginBottom: 4,
    display: 'block',
  },
  input: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '14px 16px',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Cinzel', Georgia, serif",
    outline: 'none',
  },
  optionGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: "'Cinzel', Georgia, serif",
    transition: 'all 0.15s',
  },
  optionBtnActive: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
  },
  select: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  textarea: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.6,
  },
  nextBtn: {
    background: 'linear-gradient(160deg, #3a2412, #2e1e0e)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    borderRadius: 8,
    padding: '14px 20px',
    cursor: 'pointer',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.92rem',
    minHeight: 48,
    marginTop: 4,
    letterSpacing: '0.03em',
  },
  createBtn: {
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00',
    border: 'none',
    borderRadius: 10,
    padding: '16px 28px',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    cursor: 'pointer',
    width: '100%',
    minHeight: 54,
    marginTop: 8,
    letterSpacing: '0.04em',
  },
  errorMsg: {
    color: 'var(--danger-light)',
    fontSize: '0.85rem',
    margin: '4px 0 0',
  },
  successIcon: {
    fontSize: '3rem',
    textAlign: 'center',
    marginBottom: 8,
  },
  inviteBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-gold)',
    borderRadius: 8,
    padding: '12px 16px',
  },
  inviteLink: {
    color: 'var(--parchment)',
    fontSize: '0.82rem',
    fontFamily: 'monospace',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyLinkBtn: {
    background: 'transparent',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: "'Cinzel', Georgia, serif",
    flexShrink: 0,
  },
  inviteCodeLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    margin: 0,
    textAlign: 'center',
  },
  startOverBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: "'Cinzel', Georgia, serif",
    padding: '4px 0',
    textAlign: 'center',
    letterSpacing: '0.04em',
    textDecoration: 'underline',
    marginTop: 4,
  },
  demoCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginBottom: 0,
    padding: '14px 18px',
    background: 'linear-gradient(135deg, rgba(60,30,0,0.9) 0%, rgba(40,20,0,0.9) 100%)',
    border: '1px solid rgba(212,175,55,0.4)',
    borderRadius: 10,
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: '0 0 20px rgba(212,175,55,0.1)',
    transition: 'border-color 0.15s',
  },
  demoLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  demoIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
    filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))',
  },
  demoTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#d4af37',
    letterSpacing: '0.04em',
    marginBottom: 2,
  },
  demoSubtitle: {
    fontSize: '0.72rem',
    color: 'rgba(200,180,140,0.6)',
    lineHeight: 1.4,
  },
  demoRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  demoBadge: {
    background: 'rgba(212,175,55,0.15)',
    border: '1px solid rgba(212,175,55,0.4)',
    color: '#d4af37',
    fontSize: '0.6rem',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 4,
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.1em',
  },
  demoArrow: {
    color: '#d4af37',
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '16px 0 12px',
  },
  orLine: {
    flex: 1,
    height: 1,
    background: 'rgba(212,175,55,0.12)',
  },
  orText: {
    fontSize: '0.68rem',
    color: 'rgba(200,180,140,0.35)',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  generatingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '40px 0',
    textAlign: 'center',
  },
  spinner: {
    width: 48,
    height: 48,
    border: '3px solid rgba(212,175,55,0.2)',
    borderTop: '3px solid #d4af37',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Inject spinner keyframes
if (typeof document !== 'undefined' && !document.getElementById('create-campaign-spinner')) {
  const style = document.createElement('style');
  style.id = 'create-campaign-spinner';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
