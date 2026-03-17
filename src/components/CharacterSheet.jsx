import { useState } from 'react';
import useStore from '../store/useStore';
import { getPortraitUrl } from '../lib/dice';

const STAT_NAMES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const SPELL_LEVEL_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function modifier(score) { return Math.floor((score - 10) / 2); }
function formatMod(mod) { return mod >= 0 ? `+${mod}` : `${mod}`; }

function HpBar({ current, max }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const color = pct > 50 ? '#2ecc71' : pct > 25 ? '#f39c12' : '#e74c3c';
  return (
    <div style={styles.hpSection}>
      <div style={styles.hpLabel}>
        HP: <span style={{ color, fontWeight: 'bold' }}>{current}</span> / {max}
      </div>
      <div style={styles.hpTrack}>
        <div style={{ ...styles.hpFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function CharacterCard({ character }) {
  const dmMode = useStore((s) => s.dmMode);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const deleteCharacter = useStore((s) => s.deleteCharacter);

  const [open, setOpen] = useState(false);
  const [editingStat, setEditingStat] = useState(null); // stat key being edited
  const [statDraft, setStatDraft] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newWeapon, setNewWeapon] = useState({ name: '', damage: '', attackBonus: '' });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(character.name);
  const [editingHp, setEditingHp] = useState(null); // 'max' | 'current'
  const [hpDraft, setHpDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingSpellLevel, setAddingSpellLevel] = useState(false);
  const [newSpellLevel, setNewSpellLevel] = useState('1');
  const [newSpellTotal, setNewSpellTotal] = useState('');
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [raceDraft, setRaceDraft] = useState(character.race || '');
  const [classDraft, setClassDraft] = useState(character.class || '');

  const portraitUrl = getPortraitUrl(character.name, character.race, character.class);

  function saveIdentity() {
    updateCharacter(character.id, { race: raceDraft.trim(), class: classDraft.trim() });
    setEditingIdentity(false);
  }

  function saveStat(statKey, value) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 30) return;
    updateCharacter(character.id, {
      stats: { ...character.stats, [statKey]: num },
    });
    setEditingStat(null);
  }

  function startEditStat(statKey) {
    setEditingStat(statKey);
    setStatDraft(String(character.stats[statKey] ?? 10));
  }

  function handleStatKeyDown(e, statKey) {
    if (e.key === 'Enter') saveStat(statKey, statDraft);
    if (e.key === 'Escape') setEditingStat(null);
  }

  function saveName() {
    const name = nameDraft.trim();
    if (name) updateCharacter(character.id, { name });
    setEditingName(false);
  }

  function saveHp() {
    const val = parseInt(hpDraft, 10);
    if (isNaN(val) || val < 0) { setEditingHp(null); return; }
    if (editingHp === 'max') {
      updateCharacter(character.id, {
        maxHp: val,
        currentHp: Math.min(character.currentHp, val),
      });
    } else {
      updateCharacter(character.id, { currentHp: Math.max(0, Math.min(val, character.maxHp)) });
    }
    setEditingHp(null);
  }

  function removeSkill(idx) {
    updateCharacter(character.id, {
      skills: character.skills.filter((_, i) => i !== idx),
    });
  }

  function addSkill() {
    const s = newSkill.trim();
    if (!s) return;
    updateCharacter(character.id, { skills: [...(character.skills || []), s] });
    setNewSkill('');
  }

  function removeWeapon(idx) {
    updateCharacter(character.id, {
      weapons: character.weapons.filter((_, i) => i !== idx),
    });
  }

  function addWeapon() {
    if (!newWeapon.name.trim()) return;
    const w = {
      name: newWeapon.name.trim(),
      damage: newWeapon.damage.trim() || '—',
      attackBonus: newWeapon.attackBonus !== '' ? Number(newWeapon.attackBonus) : undefined,
    };
    updateCharacter(character.id, { weapons: [...(character.weapons || []), w] });
    setNewWeapon({ name: '', damage: '', attackBonus: '' });
  }

  function toggleSpellSlot(level, slotIndex) {
    const slots = { ...(character.spellSlots || {}) };
    const lvl = { ...slots[level] };
    lvl.used = slotIndex < lvl.used ? slotIndex : slotIndex + 1;
    slots[level] = lvl;
    updateCharacter(character.id, { spellSlots: slots });
  }

  function addSpellLevel() {
    const lvl = parseInt(newSpellLevel, 10);
    const total = parseInt(newSpellTotal, 10);
    if (!lvl || lvl < 1 || lvl > 9 || !total || total < 1) return;
    const slots = { ...(character.spellSlots || {}) };
    slots[lvl] = { total, used: 0 };
    updateCharacter(character.id, { spellSlots: slots });
    setAddingSpellLevel(false);
    setNewSpellTotal('');
  }

  function removeSpellLevel(level) {
    const slots = { ...(character.spellSlots || {}) };
    delete slots[level];
    updateCharacter(character.id, {
      spellSlots: Object.keys(slots).length > 0 ? slots : null,
    });
  }

  function handleDelete() {
    if (confirmDelete) {
      deleteCharacter(character.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  const spellLevelKeys = character.spellSlots
    ? Object.keys(character.spellSlots).map(Number).sort((a, b) => a - b)
    : [];

  return (
    <div className="card" style={styles.charCard}>
      {/* Header */}
      <div style={styles.charHeader}>
        {/* Portrait */}
        <img
          src={portraitUrl}
          alt=""
          style={styles.portrait}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />

        {/* Name + identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {dmMode && editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              style={{ ...styles.nameInput, fontSize: '1.1rem' }}
            />
          ) : dmMode ? (
            <button
              style={styles.charNameBtn}
              onClick={() => { setEditingName(true); setNameDraft(character.name); }}
              title="Click to edit name"
            >
              {character.name}
              <span style={styles.editHint}>✎</span>
            </button>
          ) : (
            <span style={styles.charNameStatic}>{character.name}</span>
          )}

          {/* Race / Class row */}
          {editingIdentity ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
              <input
                autoFocus
                value={raceDraft}
                onChange={e => setRaceDraft(e.target.value)}
                placeholder="Race"
                style={{ ...styles.nameInput, fontSize: '0.78rem', width: 90 }}
              />
              <input
                value={classDraft}
                onChange={e => setClassDraft(e.target.value)}
                placeholder="Class"
                onKeyDown={e => { if (e.key === 'Enter') saveIdentity(); if (e.key === 'Escape') setEditingIdentity(false); }}
                style={{ ...styles.nameInput, fontSize: '0.78rem', width: 90 }}
              />
              <button onClick={saveIdentity} style={styles.editHintBtn}>✓</button>
            </div>
          ) : (
            <div
              onClick={dmMode ? () => { setRaceDraft(character.race || ''); setClassDraft(character.class || ''); setEditingIdentity(true); } : undefined}
              title={dmMode ? 'Click to edit race & class' : undefined}
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, cursor: dmMode ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {character.race || character.class
                ? <span>{[character.race, character.class].filter(Boolean).join(' · ')}</span>
                : dmMode ? <span style={{ fontStyle: 'italic' }}>+ Add race & class</span>
                : null}
              {dmMode && (character.race || character.class) && <span style={styles.editHint}>✎</span>}
            </div>
          )}
        </div>

        <div style={styles.headerRight}>
          {/* HP editors — DM can click to edit, players see static numbers */}
          <div style={styles.hpEditorRow}>
            {dmMode && editingHp === 'current' ? (
              <input
                autoFocus
                type="number"
                value={hpDraft}
                onChange={(e) => setHpDraft(e.target.value)}
                onBlur={saveHp}
                onKeyDown={(e) => { if (e.key === 'Enter') saveHp(); if (e.key === 'Escape') setEditingHp(null); }}
                style={styles.hpNumInput}
              />
            ) : (
              <button
                style={styles.hpNumBtn}
                onClick={dmMode ? () => { setEditingHp('current'); setHpDraft(String(character.currentHp)); } : undefined}
                title={dmMode ? 'Click to edit current HP' : undefined}
                disabled={!dmMode}
              >
                {character.currentHp}
              </button>
            )}
            <span style={styles.hpSep}>/</span>
            {dmMode && editingHp === 'max' ? (
              <input
                autoFocus
                type="number"
                value={hpDraft}
                onChange={(e) => setHpDraft(e.target.value)}
                onBlur={saveHp}
                onKeyDown={(e) => { if (e.key === 'Enter') saveHp(); if (e.key === 'Escape') setEditingHp(null); }}
                style={styles.hpNumInput}
              />
            ) : (
              <button
                style={styles.hpNumBtn}
                onClick={dmMode ? () => { setEditingHp('max'); setHpDraft(String(character.maxHp)); } : undefined}
                title={dmMode ? 'Click to edit max HP' : undefined}
                disabled={!dmMode}
              >
                {character.maxHp}
              </button>
            )}
            <span style={styles.hpHint}>HP</span>
          </div>

          <button
            style={styles.expandBtn}
            className="btn-dark btn-sm"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '▲ Collapse' : '▼ Details'}
          </button>
        </div>
      </div>

      {/* HP bar */}
      <div style={styles.hpBarOuter}>
        <div style={styles.hpBarTrack}>
          <div
            style={{
              ...styles.hpBarFill,
              width: `${character.maxHp > 0 ? (character.currentHp / character.maxHp) * 100 : 0}%`,
              background: (character.currentHp / character.maxHp) > 0.5
                ? '#27ae60' : (character.currentHp / character.maxHp) > 0.25 ? '#f39c12' : '#e74c3c',
            }}
          />
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={styles.charBody} className="fade-in">
          {/* Ability Scores */}
          {/* Ability Scores */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              Ability Scores{' '}
              {dmMode && <span style={styles.editNote}>(click to edit)</span>}
            </h4>
            <div style={styles.statsGrid}>
              {STAT_NAMES.map((stat) => {
                const score = character.stats?.[stat] ?? 10;
                const mod = modifier(score);
                const isEditing = dmMode && editingStat === stat;
                return (
                  <div
                    key={stat}
                    style={{
                      ...styles.statBox,
                      ...(isEditing ? styles.statBoxEditing : {}),
                      cursor: dmMode ? 'pointer' : 'default',
                    }}
                    onClick={() => dmMode && !isEditing && startEditStat(stat)}
                    title={dmMode ? 'Click to edit' : undefined}
                  >
                    <div style={styles.statLabel}>{STAT_LABELS[stat]}</div>
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number"
                        value={statDraft}
                        onChange={(e) => setStatDraft(e.target.value)}
                        onBlur={() => saveStat(stat, statDraft)}
                        onKeyDown={(e) => handleStatKeyDown(e, stat)}
                        style={styles.statInput}
                        min={1}
                        max={30}
                      />
                    ) : (
                      <>
                        <div style={styles.statScore}>{score}</div>
                        <div style={styles.statMod}>{formatMod(mod)}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Skills</h4>
            <div style={styles.tagList}>
              {(character.skills || []).map((skill, i) => (
                <span key={i} style={styles.tag}>
                  {skill}
                  {dmMode && (
                    <button
                      style={styles.tagRemoveBtn}
                      onClick={() => removeSkill(i)}
                      title="Remove skill"
                    >×</button>
                  )}
                </span>
              ))}
              {(character.skills || []).length === 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                  No skills listed.
                </span>
              )}
            </div>
            {dmMode && (
              <div style={styles.addRow}>
                <input
                  type="text"
                  placeholder="Add skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addSkill(); }}
                  style={styles.addInput}
                />
                <button className="btn-dark btn-sm" onClick={addSkill} disabled={!newSkill.trim()}>
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* Weapons */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Weapons</h4>
            <div style={styles.weaponList}>
              {(character.weapons || []).map((w, i) => (
                <div key={i} style={styles.weaponRow}>
                  <span style={styles.weaponName}>{w.name}</span>
                  <span style={styles.weaponDamage}>{w.damage}</span>
                  {w.attackBonus !== undefined && (
                    <span style={styles.weaponBonus}>Hit: {formatMod(w.attackBonus)}</span>
                  )}
                  {dmMode && (
                    <button
                      className="btn-danger btn-sm"
                      style={styles.weaponRemoveBtn}
                      onClick={() => removeWeapon(i)}
                      title="Remove weapon"
                    >×</button>
                  )}
                </div>
              ))}
              {(character.weapons || []).length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                  No weapons listed.
                </p>
              )}
            </div>
            {dmMode && (
              <div style={styles.addWeaponRow}>
                <input
                  type="text"
                  placeholder="Name"
                  value={newWeapon.name}
                  onChange={(e) => setNewWeapon({ ...newWeapon, name: e.target.value })}
                  style={styles.weaponInput}
                />
                <input
                  type="text"
                  placeholder="Damage (1d8+3)"
                  value={newWeapon.damage}
                  onChange={(e) => setNewWeapon({ ...newWeapon, damage: e.target.value })}
                  style={styles.weaponInput}
                />
                <input
                  type="number"
                  placeholder="ATK (+4)"
                  value={newWeapon.attackBonus}
                  onChange={(e) => setNewWeapon({ ...newWeapon, attackBonus: e.target.value })}
                  style={{ ...styles.weaponInput, maxWidth: 90 }}
                />
                <button className="btn-dark btn-sm" onClick={addWeapon} disabled={!newWeapon.name.trim()}>
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* Spell Slots */}
          <div style={styles.section}>
            <div style={styles.spellHeader}>
              <h4 style={styles.sectionTitle}>Spell Slots</h4>
              {dmMode && (
                <button
                  className="btn-dark btn-sm"
                  onClick={() => setAddingSpellLevel((a) => !a)}
                >
                  {addingSpellLevel ? 'Cancel' : '+ Add Level'}
                </button>
              )}
            </div>

            {spellLevelKeys.length === 0 && (
              <p style={styles.noSpells}>
                {dmMode ? 'No spell slots. Add a level above if this is a caster.' : 'Not a caster.'}
              </p>
            )}

            {spellLevelKeys.map((level) => {
              const { total, used } = character.spellSlots[level];
              return (
                <div key={level} style={styles.spellLevelRow}>
                  <span style={styles.spellLevelLabel}>{SPELL_LEVEL_LABELS[level - 1]}</span>
                  <div style={styles.spellSlots}>
                    {Array.from({ length: total }, (_, i) => (
                      <button
                        key={i}
                        style={{
                          ...styles.slotCircle,
                          ...(i < used ? styles.slotUsed : styles.slotAvail),
                        }}
                        onClick={() => dmMode && toggleSpellSlot(level, i)}
                        title={dmMode
                          ? (i < used ? 'Used — click to restore' : 'Available — click to use')
                          : undefined}
                        disabled={!dmMode}
                      />
                    ))}
                  </div>
                  <span style={styles.spellCount}>{total - used}/{total}</span>
                  {dmMode && (
                    <button
                      className="btn-danger btn-sm"
                      style={{ padding: '2px 8px', minHeight: 28 }}
                      onClick={() => removeSpellLevel(level)}
                      title="Remove this spell level"
                    >×</button>
                  )}
                </div>
              );
            })}

            {dmMode && addingSpellLevel && (
              <div style={styles.addRow} className="fade-in">
                <select
                  value={newSpellLevel}
                  onChange={(e) => setNewSpellLevel(e.target.value)}
                  style={{ width: 100 }}
                >
                  {SPELL_LEVEL_LABELS.map((lbl, i) => (
                    <option key={i + 1} value={i + 1}>{lbl} Level</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Slots"
                  value={newSpellTotal}
                  onChange={(e) => setNewSpellTotal(e.target.value)}
                  style={{ width: 80 }}
                  min={1}
                  max={9}
                />
                <button
                  className="btn-gold btn-sm"
                  onClick={addSpellLevel}
                  disabled={!newSpellTotal || parseInt(newSpellTotal, 10) < 1}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Delete Character — DM only */}
          {dmMode && (
            <div style={styles.deleteRow}>
              <button
                className="btn-danger btn-sm"
                onClick={handleDelete}
                style={{ marginLeft: 'auto' }}
              >
                {confirmDelete ? '⚠ Confirm Delete?' : 'Delete Character'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CharacterSheet() {
  const campaign = useStore((s) => s.campaign);
  const dmMode = useStore((s) => s.dmMode);
  const addCharacter = useStore((s) => s.addCharacter);

  const [newCharName, setNewCharName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  function handleNewCharacter(e) {
    e.preventDefault();
    const name = newCharName.trim() || 'New Character';
    addCharacter({ name });
    setNewCharName('');
    setShowNewForm(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Character Sheets</h2>
        <div style={styles.headerActions}>
          {campaign.loaded && (
            <span style={styles.campaignTitle}>{campaign.title}</span>
          )}
          {dmMode && (
            <button
              className="btn-gold btn-sm"
              onClick={() => setShowNewForm((s) => !s)}
            >
              {showNewForm ? 'Cancel' : '+ New Character'}
            </button>
          )}
        </div>
      </div>

      {/* New Character Form */}
      {showNewForm && (
        <div className="card fade-in" style={styles.newCharForm}>
          <h3 style={styles.subheading}>New Character</h3>
          <form onSubmit={handleNewCharacter} style={styles.newCharRow}>
            <input
              autoFocus
              type="text"
              placeholder="Character name"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
            />
            <button type="submit" className="btn-gold">
              Create
            </button>
          </form>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Stats default to 10. Expand the character to edit everything.
          </p>
        </div>
      )}

      {/* Character list */}
      {campaign.characters.length === 0 && !showNewForm ? (
        <div className="card" style={styles.empty}>
          <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>No characters yet.</p>
          <p>
            Import a campaign via the <strong style={{ color: 'var(--gold)' }}>Import</strong> tab,
            or click <strong style={{ color: 'var(--gold)' }}>+ New Character</strong> above.
          </p>
        </div>
      ) : (
        <div style={styles.charList}>
          {campaign.characters.map((char) => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  campaignTitle: {
    color: 'var(--parchment-dim)',
    fontStyle: 'italic',
    fontSize: '0.9rem',
  },
  newCharForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  subheading: {
    color: 'var(--parchment-dim)',
    fontSize: '0.78rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  newCharRow: {
    display: 'flex',
    gap: 10,
  },
  empty: {
    padding: 40,
    textAlign: 'center',
  },
  charList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  charCard: {
    padding: 0,
    overflow: 'hidden',
  },
  charHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 18px',
    flexWrap: 'wrap',
    background: 'linear-gradient(160deg, #2a1b0e, #221409)',
    borderBottom: '1px solid var(--border-color)',
  },
  charNameBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '1.1rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.04em',
    cursor: 'pointer',
    padding: '2px 4px',
    minHeight: 'unset',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 4,
    transition: 'color 0.15s',
  },
  charNameStatic: {
    color: 'var(--text-primary)',
    fontSize: '1.1rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.04em',
  },
  portrait: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '2px solid var(--border-gold)',
    background: 'rgba(212,175,55,0.06)',
    flexShrink: 0,
    objectFit: 'cover',
  },
  editHint: {
    fontSize: '0.75rem',
    color: 'var(--parchment-dim)',
    opacity: 0.6,
  },
  editHintBtn: {
    background: 'transparent',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    borderRadius: 4,
    padding: '2px 8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  editNote: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    textTransform: 'none',
    letterSpacing: 0,
    fontFamily: 'Georgia, serif',
    fontWeight: 400,
  },
  nameInput: {
    flex: 1,
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
    flexWrap: 'wrap',
  },
  hpEditorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  hpNumBtn: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '1rem',
    padding: '2px 8px',
    minHeight: 'unset',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: "'Cinzel', serif",
  },
  hpNumInput: {
    width: 60,
    padding: '2px 6px',
    fontSize: '1rem',
    textAlign: 'center',
  },
  hpSep: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
  hpHint: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontFamily: "'Cinzel', serif",
    letterSpacing: '0.08em',
  },
  expandBtn: {
    flexShrink: 0,
  },
  hpBarOuter: {
    padding: '0 18px',
  },
  hpBarTrack: {
    height: 6,
    background: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    margin: '0 0 2px',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.35s ease',
    boxShadow: '0 0 4px currentColor',
  },
  charBody: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    color: 'var(--parchment-dim)',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'Cinzel', 'Georgia', serif",
    fontWeight: 600,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
  },
  statBox: {
    background: 'linear-gradient(180deg, #2d1e0e 0%, #1e1308 100%)',
    border: '1px solid var(--border-gold)',
    borderRadius: 8,
    padding: '12px 6px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    userSelect: 'none',
  },
  statBoxEditing: {
    borderColor: 'var(--gold)',
    boxShadow: '0 0 8px var(--gold-glow)',
  },
  statLabel: {
    fontSize: '0.65rem',
    color: 'var(--parchment-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: "'Cinzel', 'Georgia', serif",
    fontWeight: 600,
  },
  statScore: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1,
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  statMod: {
    fontSize: '0.88rem',
    color: 'var(--gold)',
    fontWeight: 700,
    fontFamily: "'Cinzel', 'Georgia', serif",
    textShadow: '0 0 6px var(--gold-glow)',
  },
  statInput: {
    width: '100%',
    textAlign: 'center',
    padding: '4px 4px',
    fontSize: '1.2rem',
    fontFamily: "'Cinzel', serif",
    background: 'transparent',
    border: 'none',
    color: 'var(--gold)',
    outline: 'none',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    background: 'linear-gradient(135deg, #2d1e0e, #221409)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-secondary)',
    borderRadius: 14,
    padding: '4px 10px 4px 14px',
    fontSize: '0.82rem',
    fontStyle: 'italic',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  tagRemoveBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0 2px',
    minHeight: 'unset',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
  },
  addRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  addInput: {
    flex: 1,
    minWidth: 120,
  },
  weaponList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  weaponRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'linear-gradient(160deg, #231608, #1a1005)',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
    padding: '8px 14px',
  },
  weaponName: {
    flex: 1,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: "'Cinzel', 'Georgia', serif",
    fontSize: '0.9rem',
  },
  weaponDamage: {
    color: 'var(--gold)',
    fontWeight: 700,
    fontSize: '0.88rem',
    fontFamily: "'Cinzel', 'Georgia', serif",
    textShadow: '0 0 6px var(--gold-glow)',
  },
  weaponBonus: {
    color: 'var(--text-secondary)',
    fontSize: '0.82rem',
    fontStyle: 'italic',
  },
  weaponRemoveBtn: {
    minHeight: 28,
    padding: '2px 8px',
  },
  addWeaponRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  weaponInput: {
    flex: 1,
    minWidth: 90,
  },
  spellHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noSpells: {
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    fontStyle: 'italic',
  },
  spellLevelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    padding: '6px 0',
    borderBottom: '1px solid var(--border-color)',
  },
  spellLevelLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    fontFamily: "'Cinzel', serif",
    letterSpacing: '0.06em',
    minWidth: 40,
  },
  spellSlots: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  slotCircle: {
    width: 26,
    height: 26,
    minHeight: 'unset',
    borderRadius: '50%',
    border: '2px solid',
    padding: 0,
    cursor: 'pointer',
    transition: 'all 0.18s',
  },
  slotAvail: {
    background: 'linear-gradient(135deg, #1a3a4a, #0e2030)',
    borderColor: '#4a9ec8',
    boxShadow: '0 0 6px rgba(74,158,200,0.4)',
  },
  slotUsed: {
    background: 'linear-gradient(135deg, #1a1208, #0e0b07)',
    borderColor: '#3a2910',
    opacity: 0.45,
  },
  spellCount: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontFamily: "'Cinzel', serif",
  },
  deleteRow: {
    display: 'flex',
    borderTop: '1px solid var(--border-color)',
    paddingTop: 12,
  },
  hpSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    minWidth: 120,
  },
  hpLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
  },
  hpTrack: {
    height: 6,
    background: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
  },
  hpFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.35s ease',
  },
};
