import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useStore from '../store/useStore';
import {
  MONSTERS,
  XP_THRESHOLDS,
  getMultiplier,
  crForLevel,
  LOOT_TABLES,
  MAGIC_ITEMS,
} from '../data/monsters';

// Roll a die: rollDie(8) → 1-8
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

// Roll NdS+mod as a string expression, returns the total
function rollDice(expr) {
  // supports "2d8+4", "1d6", "3d10+5", "7d6"
  const match = expr.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return parseInt(expr, 10) || 0;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const mod = parseInt(match[3] || '0', 10);
  let total = mod;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return Math.max(1, total);
}

// Roll initiative for a monster
function rollInitiative(dexMod = 0) {
  return rollDie(20) + dexMod;
}

// Estimate dex modifier from AC (rough heuristic)
function estimateDexMod(ac) {
  if (ac >= 16) return 3;
  if (ac >= 14) return 2;
  if (ac >= 12) return 1;
  return 0;
}

// Build encounter: pick monsters that fit the XP budget
function buildEncounter(partyLevel, numPlayers, difficulty, theme) {
  const level = Math.max(1, Math.min(20, partyLevel));
  const thresholds = XP_THRESHOLDS[level] || XP_THRESHOLDS[10];
  const budget = thresholds[difficulty] * numPlayers;

  // Filter monsters by CR range
  const [maxCr, minCr] = crForLevel(level);
  const pool = MONSTERS.filter((m) => {
    // Apply theme filter loosely
    if (theme) {
      const t = theme.toLowerCase();
      if (t.includes('undead') && !['undead'].includes(m.type)) return false;
      if (t.includes('goblin') && m.name !== 'Goblin' && m.name !== 'Goblin Boss' && m.name !== 'Hobgoblin' && m.name !== 'Bugbear') return false;
      if (t.includes('forest') || t.includes('wilderness')) {
        const outdoorTypes = ['beast', 'plant', 'humanoid', 'fey', 'monstrosity'];
        if (!outdoorTypes.includes(m.type)) return false;
      }
      if (t.includes('dungeon') || t.includes('underground')) {
        const dungeonTypes = ['undead', 'humanoid', 'monstrosity', 'aberration', 'construct', 'elemental'];
        if (!dungeonTypes.includes(m.type)) return false;
      }
      if (t.includes('bandit') || t.includes('road')) {
        const bandits = ['humanoid'];
        if (!bandits.includes(m.type)) return false;
      }
    }
    return m.cr >= minCr && m.cr <= maxCr * 1.5;
  });

  if (pool.length === 0) {
    // Fallback: use anything in range
    const fallback = MONSTERS.filter((m) => m.cr <= maxCr * 1.5 && m.cr >= 0);
    pool.push(...fallback);
  }

  // Sort by XP ascending
  pool.sort((a, b) => a.xp - b.xp);

  // Build encounter greedily
  const selected = [];
  let totalXp = 0;

  // Pick a "main" monster first (something mid-range)
  const midPool = pool.filter((m) => m.xp <= budget * 0.6 && m.xp > 0);
  if (midPool.length === 0) midPool.push(...pool);

  const anchor = midPool[Math.floor(Math.random() * midPool.length)];
  selected.push(anchor);
  totalXp += anchor.xp;

  // Fill in smaller monsters
  const fillPool = pool.filter((m) => m.xp <= anchor.xp);
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    const multiplied = totalXp * getMultiplier(selected.length + 1);
    if (multiplied >= budget * 0.85) break;

    const candidates = fillPool.filter((m) => {
      const newTotal = (totalXp + m.xp) * getMultiplier(selected.length + 1);
      return newTotal <= budget * 1.2;
    });
    if (candidates.length === 0) break;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    selected.push(pick);
    totalXp += pick.xp;
  }

  const adjustedXp = Math.round(totalXp * getMultiplier(selected.length));

  return { selected, rawXp: totalXp, adjustedXp, budget, thresholds, numPlayers };
}

// Generate loot suggestion
function generateLoot(adjustedXp, numPlayers) {
  const perPlayer = adjustedXp / numPlayers;
  let tier;
  if (perPlayer < 200) tier = 'low';
  else if (perPlayer < 600) tier = 'medium';
  else if (perPlayer < 1500) tier = 'high';
  else tier = 'deadly';

  const table = LOOT_TABLES[tier];
  const [minG, maxG] = table.goldRange;
  const gold = minG + Math.floor(Math.random() * (maxG - minG + 1));

  // Pick 1-3 mundane items
  const shuffled = [...table.mundane].sort(() => Math.random() - 0.5);
  const mundaneCount = 1 + Math.floor(Math.random() * 2);
  const mundane = shuffled.slice(0, mundaneCount);

  // Magic item chance
  const magic = [];
  if (Math.random() < table.magicChance) {
    const item = MAGIC_ITEMS[Math.floor(Math.random() * MAGIC_ITEMS.length)];
    magic.push(item);
  }

  return { gold, mundane, magic, tier };
}

export default function EncounterGenerator({ onClose }) {
  const addCombatant = useStore((s) => s.addCombatant);
  const resetCombat = useStore((s) => s.resetCombat);

  const [form, setForm] = useState({
    theme: '',
    partyLevel: '3',
    difficulty: 'medium',
    numPlayers: '4',
  });

  const [result, setResult] = useState(null); // { monsters, loot, adjustedXp, budget }
  const [tweaked, setTweaked] = useState([]); // editable copies of generated monsters

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleGenerate() {
    const partyLevel = Math.max(1, Math.min(20, parseInt(form.partyLevel, 10) || 3));
    const numPlayers = Math.max(1, Math.min(10, parseInt(form.numPlayers, 10) || 4));

    const encounter = buildEncounter(partyLevel, numPlayers, form.difficulty, form.theme);
    const loot = generateLoot(encounter.adjustedXp, numPlayers);

    // Build tweakable monster entries
    const monsters = encounter.selected.map((m) => ({
      _monsterId: uuidv4(),
      name: m.name,
      initiative: rollInitiative(estimateDexMod(m.ac)),
      hp: typeof m.hp === 'number' ? m.hp : rollDice(m.hp),
      maxHp: typeof m.hp === 'number' ? m.hp : m.hp,
      ac: m.ac,
      attackBonus: m.attacks[0] ? `+${m.attacks[0].bonus}` : '',
      damage: m.attacks[0] ? m.attacks[0].damage : '',
      xp: m.xp,
      special: m.special || [],
      cr: m.cr,
    }));

    setTweaked(monsters);
    setResult({ loot, adjustedXp: encounter.adjustedXp, budget: encounter.budget, partyLevel, numPlayers });
  }

  function updateTweaked(id, field, value) {
    setTweaked((prev) =>
      prev.map((m) => (m._monsterId === id ? { ...m, [field]: value } : m))
    );
  }

  function removeTweaked(id) {
    setTweaked((prev) => prev.filter((m) => m._monsterId !== id));
  }

  function addToTracker(replaceExisting) {
    if (tweaked.length === 0) return;
    if (replaceExisting) resetCombat();
    tweaked.forEach((m) => {
      addCombatant({
        name: m.name,
        initiative: m.initiative,
        maxHp: m.hp,
        ac: m.ac,
        attackBonus: m.attackBonus,
        damage: m.damage,
      });
    });
    onClose();
  }

  const crLabel = (cr) => {
    if (cr === 0) return '0';
    if (cr === 0.125) return '1/8';
    if (cr === 0.25) return '1/4';
    if (cr === 0.5) return '1/2';
    return String(cr);
  };

  const difficultyColor = {
    easy: '#27ae60',
    medium: '#f39c12',
    hard: '#e67e22',
    deadly: '#e74c3c',
  }[result ? form.difficulty : 'medium'] || 'var(--gold)';

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Encounter Generator</h3>
          <button className="btn-dark btn-sm" onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Config form */}
        <div style={styles.configRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Location / Theme</label>
            <input
              type="text"
              name="theme"
              value={form.theme}
              onChange={handleChange}
              placeholder="forest, dungeon, undead..."
            />
          </div>
          <div style={styles.formGroupSm}>
            <label style={styles.label}>Party Level</label>
            <input
              type="number"
              name="partyLevel"
              value={form.partyLevel}
              onChange={handleChange}
              min={1}
              max={20}
            />
          </div>
          <div style={styles.formGroupSm}>
            <label style={styles.label}>Players</label>
            <input
              type="number"
              name="numPlayers"
              value={form.numPlayers}
              onChange={handleChange}
              min={1}
              max={10}
            />
          </div>
          <div style={styles.formGroupSm}>
            <label style={styles.label}>Difficulty</label>
            <select name="difficulty" value={form.difficulty} onChange={handleChange}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="deadly">Deadly</option>
            </select>
          </div>
        </div>

        <button className="btn-gold" onClick={handleGenerate} style={{ alignSelf: 'flex-start' }}>
          Generate Encounter
        </button>

        {/* Results */}
        {result && tweaked.length > 0 && (
          <>
            <div style={styles.resultMeta}>
              <span style={{ ...styles.diffBadge, color: difficultyColor, borderColor: difficultyColor }}>
                {form.difficulty.toUpperCase()}
              </span>
              <span style={styles.metaText}>
                Adjusted XP: <strong style={{ color: difficultyColor }}>{result.adjustedXp.toLocaleString()}</strong>
                {' '}/ Budget: {result.budget.toLocaleString()}
              </span>
              <button
                className="btn-dark btn-sm"
                onClick={handleGenerate}
                style={{ marginLeft: 'auto' }}
                title="Reroll encounter"
              >
                Reroll
              </button>
            </div>

            {/* Monster list (tweakable) */}
            <div style={styles.monsterList}>
              <div style={styles.listHeader}>
                <span style={styles.colName}>Monster</span>
                <span style={styles.colSm}>Init</span>
                <span style={styles.colSm}>HP</span>
                <span style={styles.colSm}>AC</span>
                <span style={styles.colMd}>ATK / DMG</span>
                <span style={styles.colXp}>XP</span>
                <span style={styles.colDel} />
              </div>
              {tweaked.map((m) => (
                <div key={m._monsterId} style={styles.monsterRow}>
                  <div style={styles.colName}>
                    <span style={styles.monName}>{m.name}</span>
                    <span style={styles.crTag}>CR {crLabel(m.cr)}</span>
                    {m.special.length > 0 && (
                      <span style={styles.specialHint} title={m.special.join(', ')}>
                        ★ {m.special.length} abilit{m.special.length === 1 ? 'y' : 'ies'}
                      </span>
                    )}
                  </div>
                  <div style={styles.colSm}>
                    <input
                      type="number"
                      value={m.initiative}
                      onChange={(e) => updateTweaked(m._monsterId, 'initiative', e.target.value)}
                      style={styles.tinyInput}
                    />
                  </div>
                  <div style={styles.colSm}>
                    <input
                      type="number"
                      value={m.hp}
                      onChange={(e) => updateTweaked(m._monsterId, 'hp', e.target.value)}
                      style={styles.tinyInput}
                    />
                  </div>
                  <div style={styles.colSm}>
                    <input
                      type="number"
                      value={m.ac}
                      onChange={(e) => updateTweaked(m._monsterId, 'ac', e.target.value)}
                      style={styles.tinyInput}
                    />
                  </div>
                  <div style={styles.colMd}>
                    <input
                      type="text"
                      value={m.attackBonus}
                      onChange={(e) => updateTweaked(m._monsterId, 'attackBonus', e.target.value)}
                      placeholder="+4"
                      style={{ ...styles.tinyInput, width: 46 }}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/</span>
                    <input
                      type="text"
                      value={m.damage}
                      onChange={(e) => updateTweaked(m._monsterId, 'damage', e.target.value)}
                      placeholder="1d6+2"
                      style={{ ...styles.tinyInput, width: 68 }}
                    />
                  </div>
                  <div style={{ ...styles.colXp, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {m.xp}
                  </div>
                  <div style={styles.colDel}>
                    <button
                      className="btn-danger btn-sm"
                      style={{ padding: '2px 7px', minHeight: 28, fontSize: '0.8rem' }}
                      onClick={() => removeTweaked(m._monsterId)}
                    >×</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special abilities summary */}
            {tweaked.some((m) => m.special.length > 0) && (
              <div className="dm-only" style={styles.specialBlock}>
                <div style={styles.specialTitle}>Special Abilities</div>
                {tweaked.filter((m) => m.special.length > 0).map((m) => (
                  <div key={m._monsterId} style={styles.specialEntry}>
                    <span style={styles.specialMonName}>{m.name}: </span>
                    <span style={styles.specialList}>{m.special.join(' • ')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Loot */}
            <div style={styles.lootSection}>
              <div style={styles.lootHeader}>Suggested Loot</div>
              <div style={styles.lootRow}>
                <span style={styles.lootGold}>{result.loot.gold} gp</span>
                {result.loot.mundane.map((item, i) => (
                  <span key={i} style={styles.lootItem}>{item}</span>
                ))}
                {result.loot.magic.map((item, i) => (
                  <span key={i} style={styles.lootMagic}>{item}</span>
                ))}
              </div>
            </div>

            {/* Add to tracker */}
            <div style={styles.addRow}>
              <button className="btn-gold" onClick={() => addToTracker(false)}>
                Add to Tracker
              </button>
              <button className="btn-danger btn-sm" onClick={() => addToTracker(true)}>
                Replace Tracker
              </button>
              <span style={styles.addHint}>
                {tweaked.length} combatant{tweaked.length !== 1 ? 's' : ''} · initiative pre-rolled
              </span>
            </div>
          </>
        )}

        {result && tweaked.length === 0 && (
          <div style={styles.emptyResult}>
            <p>All monsters removed. <button className="btn-dark btn-sm" onClick={handleGenerate}>Regenerate</button></p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '24px 12px',
    overflowY: 'auto',
  },
  modal: {
    background: 'linear-gradient(160deg, #1e1308, #181007, #141005)',
    border: '1px solid var(--border-gold)',
    borderRadius: 'var(--radius-xl)',
    padding: '24px 24px 28px',
    width: '100%',
    maxWidth: 780,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.1)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: 'var(--gold)',
    fontFamily: "'Cinzel', 'Georgia', serif",
    fontSize: '1.15rem',
    letterSpacing: '0.06em',
  },
  closeBtn: {
    minWidth: 36,
    minHeight: 36,
    padding: '4px 10px',
  },
  configRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: 10,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  formGroupSm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    padding: '10px 14px',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    border: '1px solid var(--border-color)',
  },
  diffBadge: {
    fontSize: '0.72rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', serif",
    letterSpacing: '0.1em',
    border: '1px solid',
    padding: '2px 10px',
    borderRadius: 10,
  },
  metaText: {
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
  },
  monsterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 8px',
    borderBottom: '1px solid var(--border-gold)',
    color: 'var(--parchment-dim)',
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: "'Cinzel', serif",
  },
  monsterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    background: 'linear-gradient(160deg, #1e1308, #191007)',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
  },
  colName: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 },
  colSm: { width: 52, display: 'flex', alignItems: 'center' },
  colMd: { width: 126, display: 'flex', alignItems: 'center', gap: 4 },
  colXp: { width: 38, textAlign: 'right' },
  colDel: { width: 30 },
  monName: {
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '0.88rem',
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  crTag: {
    fontSize: '0.62rem',
    background: 'rgba(212,175,55,0.1)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold-dark)',
    padding: '1px 6px',
    borderRadius: 8,
    fontFamily: "'Cinzel', serif",
  },
  specialHint: {
    fontSize: '0.62rem',
    color: '#c8a0e8',
    cursor: 'help',
    fontStyle: 'italic',
  },
  tinyInput: {
    width: 52,
    padding: '4px 6px',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  specialBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px 14px',
    fontSize: '0.82rem',
  },
  specialTitle: {
    color: 'rgba(200,80,80,0.8)',
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'Cinzel', serif",
    marginBottom: 2,
  },
  specialEntry: {
    lineHeight: 1.5,
  },
  specialMonName: {
    color: 'var(--text-secondary)',
    fontWeight: 700,
    fontFamily: "'Cinzel', serif",
    fontSize: '0.82rem',
  },
  specialList: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
  lootSection: {
    background: 'linear-gradient(160deg, #1a1208, #141005)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 8,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  lootHeader: {
    color: 'var(--gold-dark)',
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'Cinzel', serif",
  },
  lootRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  lootGold: {
    color: 'var(--gold)',
    fontWeight: 700,
    fontSize: '0.9rem',
    fontFamily: "'Cinzel', serif",
    textShadow: '0 0 6px var(--gold-glow)',
  },
  lootItem: {
    background: 'linear-gradient(135deg, #2d1e0e, #221409)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-secondary)',
    borderRadius: 12,
    padding: '3px 12px',
    fontSize: '0.8rem',
    fontStyle: 'italic',
  },
  lootMagic: {
    background: 'linear-gradient(135deg, #1a0d1a, #120e1a)',
    border: '1px solid rgba(160,100,220,0.4)',
    color: '#c8a0e8',
    borderRadius: 12,
    padding: '3px 12px',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  addRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTop: '1px solid var(--border-color)',
    paddingTop: 16,
  },
  addHint: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontStyle: 'italic',
  },
  emptyResult: {
    textAlign: 'center',
    padding: 20,
    color: 'var(--text-muted)',
  },
};
