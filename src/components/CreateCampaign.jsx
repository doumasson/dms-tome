import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getClaudeApiKey, generateCampaignJSON } from '../lib/claudeApi';
import ApiKeySettings from './ApiKeySettings';

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
  return `You are a D&D 5e campaign designer. Create a complete campaign outline with the following specifications:

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
  "scenes": [
    {
      "id": "scene-01",
      "title": "Scene title",
      "text": "Narrative description shown to players. Set the scene vividly.",
      "dmNotes": "Secret DM information — NPC motivations, hidden clues, what happens if players do X.",
      "choices": ["Option A players can pursue", "Option B players can pursue"],
      "isEncounter": false,
      "enemies": []
    },
    {
      "id": "scene-02",
      "title": "Combat Scene title",
      "text": "Narrative description of the encounter location.",
      "dmNotes": "Tactical notes for the DM — terrain, monster tactics, escape routes.",
      "choices": ["Fight", "Flee", "Negotiate"],
      "isEncounter": true,
      "enemies": [
        {
          "name": "Enemy Name",
          "count": 2,
          "hp": 15,
          "ac": 13,
          "speed": 30,
          "stats": { "str": 12, "dex": 12, "con": 12, "int": 8, "wis": 10, "cha": 8 },
          "attacks": [
            { "name": "Weapon Name", "bonus": "+4", "damage": "1d8+2" }
          ],
          "cr": "1/2"
        }
      ]
    }
  ],
  "characters": [
    {
      "id": "char-01",
      "name": "NPC Name",
      "stats": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
      "skills": ["Perception", "Stealth"],
      "weapons": [
        { "name": "Longsword", "attackBonus": "+5", "damage": "1d8+3" }
      ],
      "ac": 14,
      "maxHp": 20,
      "currentHp": 20,
      "speed": 30,
      "spellSlots": null
    }
  ]
}

Requirements:
- Include 6–10 scenes total; at least 3 should be isEncounter: true with real enemies
- Non-combat scenes have isEncounter: false and enemies: []
- Each combat scene should have 1–3 enemy groups appropriate for ${fields.level}
- Enemy stats (hp, ac, attack bonus, damage) must match the challenge rating
- Include 2–4 notable NPCs in the characters array (allies, villains, merchants)
- For spellcasters, set spellSlots to: {"1st": 4, "2nd": 2} etc.
- The villain (${fields.villain}) should appear in at least one combat encounter
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
    if (!Array.isArray(data.scenes)) throw new Error('Missing "scenes" array');
    if (data.scenes.length === 0) throw new Error('"scenes" array is empty');
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
  isAiDm: false,      // false = Human DM, true = AI DM (everyone plays)
  tone: TONES[0],
  setting: SETTINGS[0],
  length: LENGTHS[0],
  players: '4',
  level: LEVELS[0],
  villain: VILLAINS[0],
  themes: '',
};

export default function CreateCampaign({ user, onDone, onBack, draftCampaign }) {
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [campaignId, setCampaignId] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [showApiSettings, setShowApiSettings] = useState(false);

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

  function saveDraftLocally(currentStep, currentFields, currentCampaignId, currentJsonText = '') {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      userId: user.id,
      campaignId: currentCampaignId,
      step: currentStep,
      fields: currentFields,
      jsonText: currentJsonText,
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
          settings: { isAiDm: fields.isAiDm },
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

  // Steps 2–4: advance step and async-save progress
  function handleStepNext(nextStep) {
    setStep(nextStep);
    saveDraftLocally(nextStep, fields, campaignId, jsonText);
    saveDraftToDb(nextStep, fields, campaignId);
  }

  function handleStartOver() {
    localStorage.removeItem(DRAFT_KEY);
    setFields(DEFAULT_FIELDS);
    setStep(1);
    setJsonText('');
    setJsonError('');
    // Keep campaignId so we reuse the existing DB draft record instead of orphaning it
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(cleanJsonText(ev.target.result || ''));
      setJsonError('');
    };
    reader.readAsText(file);
    // Reset the input so the same file can be re-uploaded if needed
    e.target.value = '';
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(generatePrompt(fields));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleGenerateWithClaude() {
    const apiKey = getClaudeApiKey(user.id);
    if (!apiKey) {
      setShowApiSettings(true);
      return;
    }
    setGenerating(true);
    setGenerateError('');
    try {
      const rawText = await generateCampaignJSON(generatePrompt(fields), apiKey);
      setJsonText(cleanJsonText(rawText));
      handleStepNext(5);
    } catch (err) {
      setGenerateError(err.message || 'Generation failed. Check your API key and try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate() {
    const validation = validateCampaignJson(jsonText);
    if (!validation.ok) {
      setJsonError('Invalid JSON: ' + validation.error);
      return;
    }

    setCreating(true);
    setJsonError('');

    let campaign;

    if (campaignId) {
      // Update the existing draft record with final campaign data
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          name: validation.data.title || fields.name,
          campaign_data: validation.data,
          settings: { isAiDm: fields.isAiDm },
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) {
        setJsonError('Failed to save campaign: ' + error.message);
        setCreating(false);
        return;
      }
      campaign = data;
    } else {
      // Fallback: no draft record exists yet, create from scratch
      const inviteCode = generateInviteCode();
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name: validation.data.title || fields.name,
          dm_user_id: user.id,
          invite_code: inviteCode,
          campaign_data: validation.data,
          settings: { isAiDm: fields.isAiDm },
        })
        .select()
        .single();

      if (error) {
        setJsonError('Failed to create campaign: ' + error.message);
        setCreating(false);
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
    setStep(6);
  }

  const inviteLink = createdCampaign
    ? `${window.location.origin}?invite=${createdCampaign.invite_code}`
    : '';

  return (
    <>
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Back button */}
        <button onClick={step > 1 && step < 6 ? () => setStep(s => s - 1) : onBack} style={styles.backBtn}>
          ← {step > 1 && step < 6 ? 'Back' : 'All Campaigns'}
        </button>

        {/* Progress */}
        {step < 6 && (
          <div style={styles.progress}>
            {[1,2,3,4,5].map(s => (
              <div key={s} style={{ ...styles.dot, background: s <= step ? 'var(--gold)' : 'var(--border-color)' }} />
            ))}
          </div>
        )}

        {/* Step 1: Name + DM Type */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>New Campaign</h2>

            {/* DM type choice */}
            <p style={styles.dmTypeHeading}>Who runs the game?</p>
            <div style={styles.dmTypeRow}>
              <button
                onClick={() => setField('isAiDm', false)}
                style={{ ...styles.dmTypeBtn, ...(fields.isAiDm === false ? styles.dmTypeBtnActive : {}) }}
              >
                <span style={styles.dmTypeIcon}>👤</span>
                <span style={styles.dmTypeName}>I'm the DM</span>
                <span style={styles.dmTypeDesc}>You run the game. Players join and take actions — you don't need a character.</span>
              </button>
              <button
                onClick={() => setField('isAiDm', true)}
                style={{ ...styles.dmTypeBtn, ...(fields.isAiDm === true ? styles.dmTypeBtnActive : {}) }}
              >
                <span style={styles.dmTypeIcon}>🤖</span>
                <span style={styles.dmTypeName}>AI DM</span>
                <span style={styles.dmTypeDesc}>AI narrates the story. Everyone — including you — creates a character and plays.</span>
              </button>
            </div>

            <label style={{ ...styles.label, marginTop: 20 }}>Campaign Name</label>
            <input
              autoFocus
              value={fields.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. The Curse of Strahd's Shadow"
              style={styles.input}
              onKeyDown={e => e.key === 'Enter' && fields.name.trim() && handleStep1Next()}
            />
            <button
              disabled={!fields.name.trim() || saving}
              onClick={handleStep1Next}
              style={styles.nextBtn}
            >
              {saving ? 'Saving...' : 'Next →'}
            </button>
          </div>
        )}

        {/* Step 2: Tone & Setting */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Tone &amp; Setting</h2>
            <label style={styles.label}>Campaign Tone</label>
            <div style={styles.optionGrid}>
              {TONES.map(t => (
                <button key={t} onClick={() => setField('tone', t)}
                  style={{ ...styles.optionBtn, ...(fields.tone === t ? styles.optionBtnActive : {}) }}>
                  {t}
                </button>
              ))}
            </div>
            <label style={{ ...styles.label, marginTop: 20 }}>Setting</label>
            <div style={styles.optionGrid}>
              {SETTINGS.map(s => (
                <button key={s} onClick={() => setField('setting', s)}
                  style={{ ...styles.optionBtn, ...(fields.setting === s ? styles.optionBtnActive : {}) }}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => handleStepNext(3)} style={styles.nextBtn}>Next →</button>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
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
            <button onClick={() => handleStepNext(4)} style={styles.nextBtn}>Generate Prompt →</button>
          </div>
        )}

        {/* Step 4: Generate */}
        {step === 4 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Generate Campaign</h2>
            {getClaudeApiKey(user.id) ? (
              <>
                <p style={styles.hint}>Click below to generate your campaign with Claude. This takes about 30 seconds.</p>
                <button
                  onClick={handleGenerateWithClaude}
                  disabled={generating}
                  style={styles.generateBtn}
                >
                  {generating ? '✦ Generating Campaign...' : '✦ Generate with Claude'}
                </button>
                {generateError && <p style={styles.errorMsg}>{generateError}</p>}
                <div style={styles.orDivider}><span style={styles.orText}>or use manually</span></div>
              </>
            ) : (
              <>
                <p style={styles.hint}>
                  Add your Claude API key to generate campaigns automatically, or copy the prompt and paste it into any AI.
                </p>
                <button onClick={() => setShowApiSettings(true)} style={styles.addKeyBtn}>
                  ⚙ Add Claude API Key
                </button>
                <div style={styles.orDivider}><span style={styles.orText}>or copy prompt manually</span></div>
              </>
            )}
            <div style={styles.promptBox}>
              <pre style={styles.promptText}>{generatePrompt(fields)}</pre>
            </div>
            <button onClick={handleCopyPrompt} style={styles.copyBtn}>
              {copied ? '✓ Copied!' : 'Copy Prompt'}
            </button>
            <button onClick={() => handleStepNext(5)} style={styles.nextBtn}>I've Got My JSON →</button>
          </div>
        )}

        {/* Step 5: Import JSON */}
        {step === 5 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Import Campaign JSON</h2>
            <p style={styles.hint}>Upload the .json file your AI generated, or paste the JSON text below.</p>

            {/* File upload */}
            <label style={styles.uploadLabel}>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <span style={styles.uploadBtn}>📁 Upload JSON File</span>
            </label>

            <div style={styles.orDivider}><span style={styles.orText}>or paste below</span></div>

            <textarea
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setJsonError(''); }}
              placeholder='{ "title": "...", "scenes": [...], "characters": [...] }'
              style={{ ...styles.textarea, fontFamily: 'monospace', fontSize: '0.8rem', minHeight: 200 }}
              rows={10}
            />
            {jsonError && <p style={styles.errorMsg}>{jsonError}</p>}
            <button
              onClick={handleCreate}
              disabled={creating || !jsonText.trim()}
              style={styles.createBtn}
            >
              {creating ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
            <button onClick={handleStartOver} style={styles.startOverBtn}>
              ↺ Start Over
            </button>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 6 && createdCampaign && (
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
    {showApiSettings && (
      <ApiKeySettings userId={user.id} onClose={() => setShowApiSettings(false)} />
    )}
    </>
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
  dmTypeHeading: {
    color: 'rgba(200,180,140,0.55)',
    fontSize: '0.72rem',
    fontFamily: "'Cinzel', Georgia, serif",
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 600,
    margin: '4px 0 0',
  },
  dmTypeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  dmTypeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    background: 'rgba(255,255,255,0.02)',
    border: '2px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '14px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s, background 0.2s',
    color: '#f0e6d0',
  },
  dmTypeBtnActive: {
    background: 'rgba(212,175,55,0.08)',
    borderColor: '#d4af37',
  },
  dmTypeIcon: {
    fontSize: '1.6rem',
    lineHeight: 1,
  },
  dmTypeName: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#d4af37',
  },
  dmTypeDesc: {
    color: 'rgba(200,180,140,0.55)',
    fontSize: '0.72rem',
    lineHeight: 1.4,
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
  promptBox: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '14px 16px',
    maxHeight: 280,
    overflowY: 'auto',
  },
  promptText: {
    color: 'var(--text-secondary)',
    fontSize: '0.78rem',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.6,
    fontFamily: 'monospace',
  },
  generateBtn: {
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
    letterSpacing: '0.04em',
  },
  addKeyBtn: {
    background: 'linear-gradient(160deg, #3a2412, #2e1e0e)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    borderRadius: 8,
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.88rem',
    width: '100%',
    minHeight: 48,
  },
  copyBtn: {
    background: 'linear-gradient(160deg, #3a2412, #2e1e0e)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    borderRadius: 8,
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.88rem',
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
  uploadLabel: {
    cursor: 'pointer',
    display: 'block',
  },
  uploadBtn: {
    display: 'block',
    background: 'var(--bg-card)',
    border: '2px dashed var(--border-gold)',
    color: 'var(--gold)',
    borderRadius: 8,
    padding: '14px 20px',
    textAlign: 'center',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.9rem',
    fontWeight: 600,
    letterSpacing: '0.03em',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '4px 0',
  },
  orText: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.06em',
    margin: '0 auto',
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
};
