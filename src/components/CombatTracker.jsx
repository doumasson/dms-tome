import { useState } from 'react';
import useStore from '../store/useStore';
import EncounterGenerator from './EncounterGenerator';

export default function CombatTracker() {
  const dmMode = useStore((s) => s.dmMode);
  const isDM = useStore((s) => s.isDM);
  const combat = useStore((s) => s.combat);
  const addCombatant = useStore((s) => s.addCombatant);
  const removeCombatant = useStore((s) => s.removeCombatant);
  const adjustHp = useStore((s) => s.adjustHp);
  const nextTurn = useStore((s) => s.nextTurn);
  const prevTurn = useStore((s) => s.prevTurn);
  const resetCombat = useStore((s) => s.resetCombat);

  const [form, setForm] = useState({ name: '', initiative: '', maxHp: '', ac: '', attackBonus: '', damage: '' });
  const [activeAdj, setActiveAdj] = useState(null); // { id, type: 'damage'|'heal' }
  const [adjValue, setAdjValue] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || form.initiative === '' || form.maxHp === '') return;
    addCombatant({
      name: form.name.trim(),
      initiative: form.initiative,
      maxHp: form.maxHp,
      ac: form.ac,
      attackBonus: form.attackBonus,
      damage: form.damage,
    });
    setForm({ name: '', initiative: '', maxHp: '', ac: '', attackBonus: '', damage: '' });
  }

  function openAdj(id, type) {
    if (activeAdj?.id === id && activeAdj?.type === type) {
      setActiveAdj(null);
      setAdjValue('');
    } else {
      setActiveAdj({ id, type });
      setAdjValue('');
    }
  }

  function applyAdj() {
    const val = parseInt(adjValue, 10);
    if (!val || val <= 0 || !activeAdj) return;
    adjustHp(activeAdj.id, activeAdj.type === 'heal' ? val : -val);
    setActiveAdj(null);
    setAdjValue('');
  }

  function handleAdjKeyDown(e) {
    if (e.key === 'Enter') applyAdj();
    if (e.key === 'Escape') { setActiveAdj(null); setAdjValue(''); }
  }

  function handleClearAll() {
    if (confirmClear) {
      resetCombat();
      setConfirmClear(false);
      setActiveAdj(null);
      setAdjValue('');
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  }

  const { combatants, currentTurn, round } = combat;

  return (
    <div style={styles.container}>
      {showGenerator && (
        <EncounterGenerator onClose={() => setShowGenerator(false)} />
      )}

      {/* Header with round counter */}
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Combat Tracker</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isDM && (
            <button
              className="btn-dark btn-sm"
              onClick={() => setShowGenerator(true)}
              style={{ borderColor: 'var(--border-gold)', color: 'var(--gold)' }}
            >
              Generate Encounter
            </button>
          )}
        <div style={styles.roundBadge}>
          <span style={styles.roundLabel}>ROUND</span>
          <span style={styles.roundNum}>{round}</span>
        </div>
        </div>
      </div>

      {/* Add Combatant Form — DM only */}
      {isDM && <div className="card" style={styles.formCard}>
        <h3 style={styles.subheading}>Add Combatant</h3>
        <form onSubmit={handleAdd} style={styles.form}>
          <div style={styles.formRow4}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Goblin"
              />
            </div>
            <div style={styles.formGroupSm}>
              <label style={styles.label}>Initiative</label>
              <input
                type="number"
                name="initiative"
                value={form.initiative}
                onChange={handleFormChange}
                placeholder="15"
              />
            </div>
            <div style={styles.formGroupSm}>
              <label style={styles.label}>Max HP</label>
              <input
                type="number"
                name="maxHp"
                value={form.maxHp}
                onChange={handleFormChange}
                placeholder="10"
              />
            </div>
            <div style={styles.formGroupSm}>
              <label style={styles.label}>AC</label>
              <input
                type="number"
                name="ac"
                value={form.ac}
                onChange={handleFormChange}
                placeholder="12"
              />
            </div>
          </div>
          <div style={styles.formRow2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Attack Bonus <span style={styles.optional}>(optional)</span>
              </label>
              <input
                type="text"
                name="attackBonus"
                value={form.attackBonus}
                onChange={handleFormChange}
                placeholder="+4"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Damage <span style={styles.optional}>(optional)</span>
              </label>
              <input
                type="text"
                name="damage"
                value={form.damage}
                onChange={handleFormChange}
                placeholder="1d6+2"
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-gold"
            disabled={!form.name.trim() || form.initiative === '' || form.maxHp === ''}
            style={{ alignSelf: 'flex-start' }}
          >
            + Add Combatant
          </button>
        </form>
      </div>}

      {/* Turn Controls — DM only */}
      {isDM && combatants.length > 0 && (
        <div style={styles.turnControls}>
          <button className="btn-dark" onClick={prevTurn}>← Prev</button>
          <button className="btn-gold" onClick={nextTurn}>Next Turn →</button>
          <button
            className="btn-danger btn-sm"
            onClick={handleClearAll}
            style={{ marginLeft: 'auto', minWidth: 100 }}
          >
            {confirmClear ? 'Confirm?' : 'Clear All'}
          </button>
        </div>
      )}

      {/* Combatant List */}
      {combatants.length === 0 ? (
        <div className="card" style={styles.empty}>
          <p>No combatants yet. Add creatures and heroes above to begin tracking combat.</p>
        </div>
      ) : (
        <div style={styles.combatantList}>
          {combatants.map((c, index) => {
            const isActive = index === currentTurn;
            const hpPercent = c.maxHp > 0 ? (c.currentHp / c.maxHp) * 100 : 0;
            const hpColor = hpPercent > 50 ? 'var(--success)' : hpPercent > 25 ? '#f39c12' : 'var(--danger)';
            const isDead = c.currentHp <= 0;
            const isAdjOpen = activeAdj?.id === c.id;

            return (
              <div
                key={c.id}
                className={isActive ? 'combat-active' : ''}
                style={{
                  ...styles.combatantCard,
                  ...(isDead ? styles.combatantCardDead : {}),
                }}
              >
                {/* Active turn banner */}
                {isActive && (
                  <div style={styles.activeBanner}>
                    <span style={styles.activeBannerText}>▶ ACTIVE TURN</span>
                  </div>
                )}

                <div style={styles.combatantTop}>
                  {/* Initiative badge */}
                  <div style={{ ...styles.initBadge, ...(isActive ? styles.initBadgeActive : {}) }}>
                    <span style={styles.initLabel}>INIT</span>
                    <span style={styles.initValue}>{c.initiative}</span>
                  </div>

                  {/* Name & HP */}
                  <div style={styles.combatantInfo}>
                    <div style={styles.combatantName}>
                      <span style={isDead ? { textDecoration: 'line-through', opacity: 0.45 } : {}}>
                        {c.name}
                      </span>
                      {isDead && <span style={styles.deadTag}>DEAD</span>}
                    </div>
                    <div style={styles.hpBarTrack}>
                      <div
                        style={{
                          ...styles.hpBarFill,
                          width: `${hpPercent}%`,
                          background: hpColor,
                        }}
                      />
                    </div>
                    <div style={styles.hpText}>
                      HP: <span style={{ color: hpColor, fontWeight: 'bold' }}>{c.currentHp}</span>
                      <span style={{ color: 'var(--text-muted)' }}> / {c.maxHp}</span>
                    </div>
                  </div>

                  {/* AC badge — DM only */}
                  {dmMode && c.ac != null && (
                    <div style={styles.acBadge}>
                      <span style={styles.acLabel}>AC</span>
                      <span style={styles.acValue}>{c.ac}</span>
                    </div>
                  )}

                  {/* Remove button — DM only */}
                  {isDM && (
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => {
                        if (activeAdj?.id === c.id) { setActiveAdj(null); setAdjValue(''); }
                        removeCombatant(c.id);
                      }}
                      style={styles.removeBtn}
                      title="Remove combatant"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* DM-only attack info */}
                {dmMode && (c.attackBonus || c.damage) && (
                  <div className="dm-only" style={styles.dmInfo}>
                    {c.attackBonus && (
                      <span style={styles.dmInfoItem}>
                        <span style={styles.dmInfoLabel}>ATK</span>
                        <strong>{c.attackBonus}</strong>
                      </span>
                    )}
                    {c.damage && (
                      <span style={styles.dmInfoItem}>
                        <span style={styles.dmInfoLabel}>DMG</span>
                        <strong>{c.damage}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div style={styles.hpActions}>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => openAdj(c.id, 'damage')}
                    style={isAdjOpen && activeAdj.type === 'damage' ? styles.btnPressed : {}}
                  >
                    ⚔ Damage
                  </button>
                  <button
                    className="btn-success btn-sm"
                    onClick={() => openAdj(c.id, 'heal')}
                    style={isAdjOpen && activeAdj.type === 'heal' ? styles.btnPressed : {}}
                  >
                    ❤ Heal
                  </button>

                  {/* Inline amount input */}
                  {isAdjOpen && (
                    <div style={styles.adjRow} className="fade-in">
                      <input
                        type="number"
                        autoFocus
                        placeholder="Amount"
                        value={adjValue}
                        onChange={(e) => setAdjValue(e.target.value)}
                        onKeyDown={handleAdjKeyDown}
                        style={styles.adjInput}
                        min={1}
                      />
                      <button
                        className={activeAdj.type === 'damage' ? 'btn-danger btn-sm' : 'btn-success btn-sm'}
                        onClick={applyAdj}
                        disabled={!adjValue || parseInt(adjValue, 10) <= 0}
                      >
                        Apply
                      </button>
                      <button
                        className="btn-dark btn-sm"
                        onClick={() => { setActiveAdj(null); setAdjValue(''); }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 720,
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
    gap: 12,
  },
  roundBadge: {
    background: 'linear-gradient(135deg, #1e1308, #231509)',
    border: '2px solid var(--gold-dark)',
    color: 'var(--gold)',
    padding: '6px 22px',
    borderRadius: 20,
    fontFamily: "'Cinzel', 'Georgia', serif",
    boxShadow: '0 0 14px var(--gold-glow)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1.1,
  },
  roundLabel: {
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    color: 'var(--gold-dark)',
    fontWeight: 700,
  },
  roundNum: {
    fontSize: '1.4rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  formCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  subheading: {
    color: 'var(--parchment-dim)',
    fontSize: '0.78rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  formRow4: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: 10,
  },
  formRow2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formGroupSm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: "'Cinzel', 'Georgia', serif",
  },
  optional: {
    color: 'var(--border-light)',
    fontSize: '0.68rem',
    textTransform: 'none',
    letterSpacing: 0,
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
  },
  turnControls: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  combatantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  combatantCard: {
    background: 'linear-gradient(160deg, #221509, #1c1208, #191007)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition: 'border-color 0.22s, box-shadow 0.22s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  combatantCardDead: {
    opacity: 0.55,
    filter: 'grayscale(0.4)',
  },
  activeBanner: {
    margin: '-14px -16px 4px -16px',
    padding: '5px 16px',
    background: 'linear-gradient(90deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 100%)',
    borderBottom: '1px solid rgba(212,175,55,0.25)',
  },
  activeBannerText: {
    color: 'var(--gold)',
    fontSize: '0.7rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.12em',
    textShadow: '0 0 10px var(--gold-glow)',
  },
  combatantTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  initBadge: {
    background: 'linear-gradient(135deg, #2d1e0e, #1e1308)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    minWidth: 48,
    minHeight: 48,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    flexShrink: 0,
    fontFamily: "'Cinzel', 'Georgia', serif",
    lineHeight: 1.1,
  },
  initBadgeActive: {
    borderColor: 'var(--gold)',
    boxShadow: '0 0 10px var(--gold-glow)',
    background: 'linear-gradient(135deg, #3a2410, #261a0c)',
  },
  initLabel: {
    fontSize: '0.55rem',
    letterSpacing: '0.1em',
    color: 'var(--gold-dark)',
    fontWeight: 700,
  },
  initValue: {
    fontSize: '1.2rem',
    fontWeight: 700,
  },
  combatantInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  combatantName: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.03em',
  },
  deadTag: {
    fontSize: '0.6rem',
    background: 'var(--danger)',
    color: '#ffd0cc',
    padding: '1px 6px',
    borderRadius: 3,
    letterSpacing: '0.08em',
    fontFamily: "'Cinzel', serif",
  },
  hpBarTrack: {
    height: 8,
    background: 'rgba(0,0,0,0.4)',
    borderRadius: 4,
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.35s ease, background 0.35s ease',
    boxShadow: '0 0 6px currentColor',
  },
  hpText: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  acBadge: {
    background: 'linear-gradient(135deg, #1a0d1a, #120e1a)',
    border: '1px solid rgba(160,100,220,0.35)',
    color: '#c8a0e8',
    minWidth: 42,
    minHeight: 42,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    flexShrink: 0,
    fontFamily: "'Cinzel', 'Georgia', serif",
    lineHeight: 1.1,
  },
  acLabel: {
    fontSize: '0.55rem',
    letterSpacing: '0.1em',
    color: 'rgba(160,100,220,0.6)',
    fontWeight: 700,
  },
  acValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  removeBtn: {
    flexShrink: 0,
    minWidth: 36,
    minHeight: 36,
    padding: '4px 10px',
  },
  dmInfo: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
    fontSize: '0.88rem',
    padding: '8px 12px',
  },
  dmInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--text-secondary)',
  },
  dmInfoLabel: {
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    color: 'rgba(200,80,80,0.7)',
    fontFamily: "'Cinzel', serif",
    fontWeight: 700,
  },
  hpActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 4,
    borderTop: '1px solid var(--border-color)',
  },
  btnPressed: {
    opacity: 0.75,
    transform: 'scale(0.96)',
  },
  adjRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  adjInput: {
    width: 80,
    padding: '6px 10px',
    fontSize: '0.9rem',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
  },
};
