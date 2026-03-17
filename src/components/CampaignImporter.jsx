import { useState } from 'react';
import useStore from '../store/useStore';

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

  const [jsonText, setJsonText] = useState('');
  const [errors, setErrors] = useState([]);
  const [validData, setValidData] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'valid' | 'invalid' | 'loaded'
  const [showExample, setShowExample] = useState(false);

  function cleanJsonText(text) {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < cleaned.length - 1) cleaned = cleaned.slice(0, lastBrace + 1);
    cleaned = cleaned.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    return cleaned;
  }

  function handleValidate() {
    setValidData(null);
    setStatus('idle');

    if (!jsonText.trim()) {
      setErrors(['Please paste JSON campaign data above.']);
      setStatus('invalid');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanJsonText(jsonText));
    } catch (e) {
      setErrors([
        'Could not parse JSON. The AI may have included extra text or markdown formatting.',
        'Make sure you copy only the JSON — it must start with { and end with }.',
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
    onSuccess?.();
  }

  function handleLoadSample() {
    let parsed;
    try { parsed = JSON.parse(EXAMPLE_JSON); } catch { return; }
    loadCampaign(parsed);
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

  return (
    <div style={styles.container}>
      <h2>Campaign Importer</h2>

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
          <h3 style={styles.inputLabel}>Paste Campaign JSON</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-gold btn-sm" onClick={handleLoadSample}>
              Load Sample Campaign
            </button>
            <button
              className="btn-dark btn-sm"
              onClick={() => setShowExample((v) => !v)}
            >
              {showExample ? 'Hide Example' : 'Show Format'}
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

      {/* Format reference */}
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
  textarea: {
    minHeight: 200,
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
