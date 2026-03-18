import { useState, useRef } from 'react';
import useStore from '../store/useStore';
import { getClaudeApiKey } from '../lib/claudeApi';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

async function generateCampaignJson({ title, tone, numScenes, apiKey }) {
  const prompt = `Generate a D&D 5e campaign JSON with the following parameters:
- Title: "${title}"
- Tone/Theme: ${tone}
- Number of scenes: ${numScenes}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "title": "string",
  "scenes": [
    {
      "id": "scene1",
      "title": "Scene Title",
      "text": "Narrative description shown to players (2-3 sentences, vivid and immersive).",
      "dmNotes": "Private DM context and secrets.",
      "fogOfWar": true,
      "isEncounter": false,
      "enemies": []
    }
  ],
  "characters": []
}

Rules:
- scenes array must have exactly ${numScenes} entries
- Each scene id must be unique (scene1, scene2, etc.)
- isEncounter: true for combat scenes; include 2-4 enemies with name, hp, ac, speed, stats (str/dex/con/int/wis/cha), attacks ([{name, bonus, damage}]), startPosition {x,y}
- fogOfWar: true for dungeons/indoors, false for towns/outdoors
- characters array should be empty (players create their own)
- text must be evocative, atmospheric, and advance the story
- dmNotes must include encounter triggers, hidden info, and DM guidance
Return only the JSON object.`;

  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

const EXAMPLE_JSON = `{
  "title": "The Lost Mines of Phandelver",
  "scenes": [
    {
      "id": "scene1",
      "title": "Goblin Ambush",
      "text": "The road to Phandalin winds through rolling hills and dense thickets. As the wagon crests a rise, the horses rear back—two dead horses block the path, bristling with black-feathered arrows.",
      "choices": [
        "Search the bodies",
        "Check the tree line for attackers",
        "Press on quickly to Phandalin"
      ],
      "dmNotes": "Four goblins are hiding in the underbrush (Perception DC 16 to spot). The dead horses belong to Gundren Rockseeker—he's been captured."
    }
  ],
  "characters": [
    {
      "id": "char1",
      "name": "Thalindra Swiftarrow",
      "stats": { "str": 10, "dex": 18, "con": 14, "int": 12, "wis": 16, "cha": 11 },
      "skills": ["Stealth", "Perception", "Survival", "Nature"],
      "weapons": [
        { "name": "Longbow", "damage": "1d8+4", "attackBonus": 6 },
        { "name": "Shortsword", "damage": "1d6+4", "attackBonus": 6 }
      ],
      "maxHp": 28,
      "currentHp": 28
    }
  ]
}`;

function validateCampaign(data) {
  const errors = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return ['Root must be a JSON object.'];
  }

  if (!data.title || typeof data.title !== 'string') {
    errors.push('"title" is required and must be a string.');
  }

  if (!Array.isArray(data.scenes)) {
    errors.push('"scenes" is required and must be an array.');
  } else {
    data.scenes.forEach((scene, i) => {
      if (!scene.id) errors.push(`scenes[${i}]: "id" is required.`);
      if (!scene.title) errors.push(`scenes[${i}]: "title" is required.`);
      if (!scene.text) errors.push(`scenes[${i}]: "text" is required.`);
      if (scene.choices !== undefined && !Array.isArray(scene.choices)) {
        errors.push(`scenes[${i}]: "choices" must be an array.`);
      }
    });
  }

  if (!Array.isArray(data.characters)) {
    errors.push('"characters" is required and must be an array.');
  } else {
    data.characters.forEach((char, i) => {
      if (!char.id) errors.push(`characters[${i}]: "id" is required.`);
      if (!char.name) errors.push(`characters[${i}]: "name" is required.`);
      if (typeof char.stats !== 'object' || char.stats === null) {
        errors.push(`characters[${i}]: "stats" must be an object.`);
      } else {
        const required = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        required.forEach((stat) => {
          if (typeof char.stats[stat] !== 'number') {
            errors.push(`characters[${i}].stats: "${stat}" must be a number.`);
          }
        });
      }
      if (typeof char.maxHp !== 'number') {
        errors.push(`characters[${i}]: "maxHp" must be a number.`);
      }
      if (typeof char.currentHp !== 'number') {
        errors.push(`characters[${i}]: "currentHp" must be a number.`);
      }
      if (char.weapons !== undefined) {
        if (!Array.isArray(char.weapons)) {
          errors.push(`characters[${i}]: "weapons" must be an array.`);
        } else {
          char.weapons.forEach((w, wi) => {
            if (!w.name) errors.push(`characters[${i}].weapons[${wi}]: "name" is required.`);
            if (!w.damage) errors.push(`characters[${i}].weapons[${wi}]: "damage" is required.`);
          });
        }
      }
    });
  }

  return errors;
}

export default function CampaignImporter({ onSuccess }) {
  const loadCampaign = useStore((s) => s.loadCampaign);
  const unloadCampaign = useStore((s) => s.unloadCampaign);
  const campaign = useStore((s) => s.campaign);
  const activeCampaign = useStore((s) => s.activeCampaign);
  const preGenerateSceneImages = useStore((s) => s.preGenerateSceneImages);
  const sessionApiKey = useStore((s) => s.sessionApiKey);
  const user = useStore((s) => s.user);

  const [tab, setTab] = useState('generate'); // 'generate' | 'import'
  const [jsonText, setJsonText] = useState('');
  const [errors, setErrors] = useState([]);
  const [validData, setValidData] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'valid' | 'invalid' | 'loaded'
  const [showExample, setShowExample] = useState(false);
  const fileInputRef = useRef(null);

  // Generate tab state
  const [genTitle, setGenTitle] = useState('');
  const [genTone, setGenTone] = useState('');
  const [genScenes, setGenScenes] = useState(3);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  async function handleGenerate() {
    const apiKey = (user?.id ? getClaudeApiKey(user.id) : null) || sessionApiKey;
    if (!apiKey) {
      setGenError('No Claude API key found. Add one in ⚙ Settings first.');
      return;
    }
    if (!genTitle.trim()) {
      setGenError('Enter a campaign title.');
      return;
    }
    setGenLoading(true);
    setGenError(null);
    try {
      const raw = await generateCampaignJson({
        title: genTitle.trim(),
        tone: genTone.trim() || 'classic high fantasy adventure',
        numScenes: genScenes,
        apiKey,
      });
      // Clean and parse
      let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
      const firstBrace = text.indexOf('{');
      if (firstBrace > 0) text = text.slice(firstBrace);
      const lastBrace = text.lastIndexOf('}');
      if (lastBrace !== -1) text = text.slice(0, lastBrace + 1);

      const parsed = JSON.parse(text);
      const errs = validateCampaign(parsed);
      if (errs.length > 0) {
        setGenError('Generated JSON had validation issues: ' + errs.join(', '));
        return;
      }
      // Auto-load
      loadCampaign(parsed);
      preGenerateSceneImages(activeCampaign?.id || 'local', parsed.scenes || []);
      onSuccess?.();
    } catch (e) {
      setGenError(`Generation failed: ${e.message}`);
    } finally {
      setGenLoading(false);
    }
  }

  function cleanJsonText(text) {
    let cleaned = text.trim();
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    // Strip any remaining inline backtick fences
    cleaned = cleaned.replace(/`{1,3}/g, '');
    // Unescape escaped brackets from some AI outputs
    cleaned = cleaned.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    // Trim to the outermost { ... }
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < cleaned.length - 1) cleaned = cleaned.slice(0, lastBrace + 1);
    return cleaned.trim();
  }

  function handleValidate() {
    setValidData(null);
    setStatus('idle');

    if (!jsonText.trim()) {
      setErrors(['Upload a .json file or paste JSON campaign data above.']);
      setStatus('invalid');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanJsonText(jsonText));
    } catch (e) {
      setErrors([
        'Could not parse JSON — the text may include extra formatting or markdown.',
        'Tip: use the "Upload JSON File" button if you have a file download — it skips copy/paste issues entirely.',
        `Parse error: ${e.message}`,
      ]);
      setStatus('invalid');
      return;
    }

    const validationErrors = validateCampaign(parsed);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setStatus('invalid');
    } else {
      setErrors([]);
      setValidData(parsed);
      setStatus('valid');
    }
  }

  function handleLoad() {
    if (!validData) return;
    loadCampaign(validData);
    setStatus('loaded');
    // Kick off background image pre-generation for all scenes
    preGenerateSceneImages(activeCampaign?.id || 'local', validData.scenes || []);
    onSuccess?.();
  }

  function handleLoadSample() {
    let parsed;
    try { parsed = JSON.parse(EXAMPLE_JSON); } catch { return; }
    loadCampaign(parsed);
    preGenerateSceneImages(activeCampaign?.id || 'local', parsed.scenes || []);
    setJsonText(EXAMPLE_JSON);
    setStatus('loaded');
    setValidData(parsed);
    setErrors([]);
    onSuccess?.();
  }

  function handleUnload() {
    unloadCampaign();
    setJsonText('');
    setErrors([]);
    setValidData(null);
    setStatus('idle');
  }

  function handleUseExample() {
    setJsonText(EXAMPLE_JSON);
    setErrors([]);
    setValidData(null);
    setStatus('idle');
    setShowExample(false);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setErrors(['Please select a .json file.']);
      setStatus('invalid');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setJsonText(text);
      setErrors([]);
      setValidData(null);
      setStatus('idle');

      // Auto-validate after file load
      let parsed;
      try {
        parsed = JSON.parse(cleanJsonText(text));
      } catch (err) {
        setErrors([
          'Could not parse the JSON file.',
          `Parse error: ${err.message}`,
        ]);
        setStatus('invalid');
        return;
      }
      const validationErrors = validateCampaign(parsed);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setStatus('invalid');
      } else {
        setErrors([]);
        setValidData(parsed);
        setStatus('valid');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={styles.container}>
      <h2>Campaign Setup</h2>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid rgba(212,175,55,0.15)', marginBottom: 4 }}>
        {[
          { id: 'generate', label: '✨ Generate with AI' },
          { id: 'import', label: '📂 Import JSON' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '10px 0', cursor: 'pointer', fontWeight: 700,
              fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.82rem', letterSpacing: '0.04em',
              background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid #d4af37' : '2px solid transparent',
              color: tab === t.id ? '#d4af37' : 'var(--text-muted)',
              marginBottom: -2, transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Generate tab */}
      {tab === 'generate' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.08em', marginBottom: 6 }}>CAMPAIGN TITLE</div>
            <input
              value={genTitle}
              onChange={e => setGenTitle(e.target.value)}
              placeholder="e.g. The Lost Mines of Phandelver"
              style={{ width: '100%', background: '#0f0804', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 6, padding: '9px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.08em', marginBottom: 6 }}>TONE & THEME <span style={{ opacity: 0.5 }}>(optional)</span></div>
            <input
              value={genTone}
              onChange={e => setGenTone(e.target.value)}
              placeholder="e.g. dark gothic horror, seafaring pirates, political intrigue"
              style={{ width: '100%', background: '#0f0804', border: '1px solid var(--border-light)', color: 'var(--text-primary)', borderRadius: 6, padding: '9px 12px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.08em', marginBottom: 6 }}>NUMBER OF SCENES</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setGenScenes(n)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
                    fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: '0.85rem',
                    background: genScenes === n ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${genScenes === n ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: genScenes === n ? '#d4af37' : 'var(--text-muted)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {genError && (
            <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 6, padding: '10px 14px', color: '#e74c3c', fontSize: '0.82rem' }}>
              {genError}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={genLoading || !genTitle.trim()}
            style={{
              padding: '14px 0', borderRadius: 8, cursor: genLoading || !genTitle.trim() ? 'not-allowed' : 'pointer',
              fontFamily: "'Cinzel', Georgia, serif", fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.04em',
              background: genLoading || !genTitle.trim() ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #d4af37, #a8841f)',
              border: 'none', color: genLoading || !genTitle.trim() ? 'var(--text-muted)' : '#1a0e00',
              boxShadow: genLoading ? 'none' : '0 4px 20px rgba(212,175,55,0.25)',
            }}
          >
            {genLoading ? '✦ Generating campaign…' : '✦ Generate Campaign'}
          </button>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
            Uses your Claude API key. Takes ~10-20 seconds. Scenes, enemies, and DM notes are auto-generated.
          </div>
        </div>
      )}

      {/* Import tab */}
      {tab === 'import' && <>

      {/* Currently loaded campaign */}
      {campaign.loaded && (
        <div style={styles.loadedBanner}>
          <div style={styles.loadedInfo}>
            <span style={styles.loadedIcon}>✓</span>
            <div>
              <div style={styles.loadedTitle}>Campaign Loaded</div>
              <div style={styles.loadedMeta}>
                <strong style={{ color: 'var(--gold)' }}>{campaign.title}</strong>
                {' — '}
                {campaign.scenes.length} scene{campaign.scenes.length !== 1 ? 's' : ''},
                {' '}
                {campaign.characters.length} character{campaign.characters.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <button className="btn-danger btn-sm" onClick={handleUnload}>
            Unload Campaign
          </button>
        </div>
      )}

      {/* JSON input */}
      <div className="card" style={styles.importCard}>
        <div style={styles.inputHeader}>
          <h3 style={styles.inputLabel}>Import Campaign</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-gold btn-sm" onClick={handleLoadSample}>
              Load Sample
            </button>
            <button
              className="btn-dark btn-sm"
              onClick={() => setShowExample((v) => !v)}
            >
              {showExample ? 'Hide Format' : 'Show Format'}
            </button>
          </div>
        </div>

        {showExample && (
          <div style={styles.exampleBox}>
            <div style={styles.exampleHeader}>
              <span style={styles.exampleTitle}>Example JSON structure:</span>
              <button className="btn-gold btn-sm" onClick={handleUseExample}>
                Use This Example
              </button>
            </div>
            <pre style={styles.exampleCode}>{EXAMPLE_JSON}</pre>
          </div>
        )}

        {/* Primary: File Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.uploadBtn}
        >
          <span style={styles.uploadIcon}>📂</span>
          Upload JSON File
        </button>

        {/* Divider */}
        <div style={styles.orDivider}>
          <div style={styles.orLine} />
          <span style={styles.orText}>or paste below</span>
          <div style={styles.orLine} />
        </div>

        {/* Secondary: Paste */}
        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setStatus('idle');
            setErrors([]);
            setValidData(null);
          }}
          placeholder='Paste your campaign JSON here...\n\n{\n  "title": "...",\n  "scenes": [...],\n  "characters": [...]\n}'
          style={styles.textarea}
          spellCheck={false}
        />

        {/* Status messages */}
        {status === 'valid' && (
          <div style={styles.successBox}>
            <span style={styles.successIcon}>✓</span>
            <div>
              <strong>Valid campaign JSON!</strong>
              <div style={styles.successMeta}>
                <strong style={{ color: 'var(--gold)' }}>{validData?.title}</strong>
                {' — '}
                {validData?.scenes?.length || 0} scene{(validData?.scenes?.length || 0) !== 1 ? 's' : ''},
                {' '}
                {validData?.characters?.length || 0} character{(validData?.characters?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {status === 'invalid' && errors.length > 0 && (
          <div style={styles.errorBox}>
            <div style={styles.errorTitle}>Validation Errors ({errors.length})</div>
            <ul style={styles.errorList}>
              {errors.map((err, i) => (
                <li key={i} style={styles.errorItem}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {status === 'loaded' && (
          <div style={styles.successBox}>
            <span style={styles.successIcon}>✓</span>
            <strong>Campaign loaded successfully! Navigate to Scenes or Characters tabs.</strong>
          </div>
        )}

        {/* Action buttons */}
        <div style={styles.actions}>
          <button
            className="btn-dark"
            onClick={handleValidate}
            disabled={!jsonText.trim()}
          >
            Validate JSON
          </button>
          <button
            className="btn-gold"
            onClick={handleLoad}
            disabled={!validData || status === 'loaded'}
          >
            Load Campaign
          </button>
          {jsonText && (
            <button
              className="btn-dark btn-sm"
              onClick={() => {
                setJsonText('');
                setErrors([]);
                setValidData(null);
                setStatus('idle');
              }}
              style={{ marginLeft: 'auto' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Format reference — import tab only */}
      <div className="card" style={styles.referenceCard}>
        <h3 style={styles.refTitle}>Expected JSON Format</h3>
        <div style={styles.refGrid}>
          <div style={styles.refItem}>
            <code style={styles.refCode}>title</code>
            <span style={styles.refDesc}>string — campaign name</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>scenes[]</code>
            <span style={styles.refDesc}>array of scene objects</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>scene.id</code>
            <span style={styles.refDesc}>string — unique identifier</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>scene.title</code>
            <span style={styles.refDesc}>string — scene heading</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>scene.text</code>
            <span style={styles.refDesc}>string — narrative text</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>scene.choices</code>
            <span style={styles.refDesc}>string[] — player options (optional)</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>scene.dmNotes</code>
            <span style={styles.refDesc}>string — hidden DM info (optional)</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>characters[]</code>
            <span style={styles.refDesc}>array of character objects</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>character.stats</code>
            <span style={styles.refDesc}>object with str/dex/con/int/wis/cha</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>character.maxHp / currentHp</code>
            <span style={styles.refDesc}>numbers</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>character.skills</code>
            <span style={styles.refDesc}>string[] — skill names (optional)</span>
          </div>
          <div style={styles.refItem}>
            <code style={styles.refCode}>character.weapons</code>
            <span style={styles.refDesc}>array with name/damage/attackBonus (optional)</span>
          </div>
        </div>
      </div>
      </> /* end import tab */}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  loadedBanner: {
    background: 'rgba(39, 174, 96, 0.08)',
    border: '1px solid rgba(39, 174, 96, 0.35)',
    borderRadius: 10,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    boxShadow: '0 0 12px rgba(39, 174, 96, 0.06)',
  },
  loadedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  loadedIcon: {
    color: 'var(--success-light)',
    fontSize: '1.4rem',
    fontWeight: 700,
    textShadow: '0 0 10px rgba(46, 204, 113, 0.5)',
  },
  loadedTitle: {
    color: 'var(--success-light)',
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  loadedMeta: {
    color: 'var(--text-secondary)',
    fontSize: '0.92rem',
    marginTop: 2,
  },
  importCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  inputHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  exampleBox: {
    background: '#0e0b07',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  exampleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-color)',
    background: 'rgba(212,175,55,0.04)',
  },
  exampleTitle: {
    color: 'var(--parchment-dim)',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.06em',
  },
  exampleCode: {
    padding: 16,
    color: 'var(--text-secondary)',
    fontSize: '0.78rem',
    lineHeight: 1.6,
    overflowX: 'auto',
    fontFamily: 'monospace',
    whiteSpace: 'pre',
    margin: 0,
    opacity: 0.85,
  },
  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00',
    border: 'none',
    borderRadius: 10,
    padding: '18px 28px',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    cursor: 'pointer',
    width: '100%',
    minHeight: 58,
    letterSpacing: '0.04em',
  },
  uploadIcon: {
    fontSize: '1.3rem',
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '4px 0',
  },
  orLine: {
    flex: 1,
    height: 1,
    background: 'var(--border-color)',
  },
  orText: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  },
  textarea: {
    minHeight: 160,
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    lineHeight: 1.6,
  },
  successBox: {
    background: 'rgba(39, 174, 96, 0.08)',
    border: '1px solid rgba(39, 174, 96, 0.35)',
    borderRadius: 6,
    padding: '12px 16px',
    color: 'var(--success-light)',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  successIcon: {
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  successMeta: {
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
    marginTop: 4,
  },
  errorBox: {
    background: 'rgba(192, 57, 43, 0.08)',
    border: '1px solid rgba(192, 57, 43, 0.4)',
    borderRadius: 6,
    padding: '12px 16px',
  },
  errorTitle: {
    color: 'var(--danger-light)',
    fontWeight: 700,
    marginBottom: 8,
    fontSize: '0.82rem',
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.04em',
  },
  errorList: {
    paddingLeft: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  errorItem: {
    color: 'var(--danger-light)',
    fontSize: '0.85rem',
    opacity: 0.9,
  },
  actions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  referenceCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  refTitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
  },
  refGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  refItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '6px 0',
    borderBottom: '1px solid var(--border-color)',
  },
  refCode: {
    background: 'linear-gradient(135deg, #2d1e0e, #1e1308)',
    color: 'var(--gold)',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    border: '1px solid var(--border-gold)',
  },
  refDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    paddingTop: 3,
    fontStyle: 'italic',
  },
};
