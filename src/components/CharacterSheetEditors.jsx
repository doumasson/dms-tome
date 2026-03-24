// Extracted editor components for CharacterSheet to reduce main file size

export function HpEditor({
  character, dmMode, editingHp, hpDraft,
  setEditingHp, setHpDraft, saveHp,
  styles,
}) {
  return (
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
  );
}

export function IdentityEditor({
  character, dmMode, editingIdentity,
  raceDraft, setRaceDraft,
  classDraft, setClassDraft,
  levelDraft, setLevelDraft,
  saveIdentity, setEditingIdentity, styles,
}) {
  return (
    <>
      {editingIdentity ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            autoFocus
            value={raceDraft}
            onChange={e => setRaceDraft(e.target.value)}
            placeholder="Race"
            style={{ ...styles.nameInput, fontSize: '0.78rem', width: 80 }}
          />
          <input
            value={classDraft}
            onChange={e => setClassDraft(e.target.value)}
            placeholder="Class"
            style={{ ...styles.nameInput, fontSize: '0.78rem', width: 80 }}
          />
          <input
            type="number"
            value={levelDraft}
            onChange={e => setLevelDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveIdentity(); if (e.key === 'Escape') setEditingIdentity(false); }}
            placeholder="Lv"
            min={1} max={20}
            style={{ ...styles.nameInput, fontSize: '0.78rem', width: 46 }}
          />
          <button onClick={saveIdentity} style={styles.editHintBtn}>✓</button>
        </div>
      ) : (
        <div
          onClick={dmMode ? () => { setRaceDraft(character.race || ''); setClassDraft(character.class || ''); setLevelDraft(String(character.level || 1)); setEditingIdentity(true); } : undefined}
          title={dmMode ? 'Click to edit race, class & level' : undefined}
          style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, cursor: dmMode ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {character.race || character.class
            ? <span>{[character.race, character.class && `${character.class} Lv ${character.level || 1}`].filter(Boolean).join(' · ')}</span>
            : dmMode ? <span style={{ fontStyle: 'italic' }}>+ Add race, class & level</span>
            : null}
          {dmMode && (character.race || character.class) && <span style={styles.editHint}>✎</span>}
        </div>
      )}
    </>
  );
}

export function HpBar({ current, max, styles }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const color = pct > 0.5
    ? '#27ae60' : pct > 0.25 ? '#f39c12' : '#e74c3c';

  return (
    <div style={styles.hpBarOuter}>
      <div style={styles.hpBarTrack}>
        <div style={{ ...styles.hpBarFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function SkillsList({
  character, dmMode, newSkill, setNewSkill, removeSkill, addSkill, styles,
}) {
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Skills</h4>
      <div style={styles.tagList}>
        {(character.skills || []).map((skill, i) => (
          <span key={i} style={styles.tag}>
            {skill}
            {dmMode && (
              <button
                className="btn-sm"
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
  );
}

export function WeaponsList({
  character, dmMode, newWeapon, setNewWeapon, removeWeapon, addWeapon, styles,
}) {
  const formatMod = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;

  return (
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
  );
}
