import { useState } from 'react';
import useStore from '../store/useStore';

export default function CombatTracker() {
  const combat = useStore((s) => s.combat);
  const addCombatant = useStore((s) => s.addCombatant);
  const removeCombatant = useStore((s) => s.removeCombatant);
  const adjustHp = useStore((s) => s.adjustHp);
  const setHp = useStore((s) => s.setHp);
  const nextTurn = useStore((s) => s.nextTurn);
  const prevTurn = useStore((s) => s.prevTurn);
  const resetCombat = useStore((s) => s.resetCombat);

  const [form, setForm] = useState({ name: '', initiative: '', maxHp: '' });
  const [hpInputs, setHpInputs] = useState({});
  const [hpAdjInputs, setHpAdjInputs] = useState({});

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || form.initiative === '' || form.maxHp === '') return;
    addCombatant({ name: form.name.trim(), initiative: form.initiative, maxHp: form.maxHp });
    setForm({ name: '', initiative: '', maxHp: '' });
  }

  function handleHpAdjust(id, delta) {
    const adj = Number(hpAdjInputs[id] || 1);
    adjustHp(id, delta > 0 ? adj : -adj);
  }

  function handleSetHp(id) {
    if (hpInputs[id] !== undefined && hpInputs[id] !== '') {
      setHp(id, hpInputs[id]);
      setHpInputs((prev) => ({ ...prev, [id]: '' }));
    }
  }

  const { combatants, currentTurn, round } = combat;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Combat Tracker</h2>
        <div style={styles.roundBadge}>Round {round}</div>
      </div>

      {/* Add Combatant Form */}
      <div className="card" style={styles.formCard}>
        <h3 style={styles.subheading}>Add Combatant</h3>
        <form onSubmit={handleAdd} style={styles.form}>
          <div style={styles.formRow}>
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
          </div>
          <button
            type="submit"
            className="btn-gold"
            disabled={!form.name.trim() || form.initiative === '' || form.maxHp === ''}
            style={{ alignSelf: 'flex-start' }}
          >
            + Add
          </button>
        </form>
      </div>

      {/* Turn Controls */}
      {combatants.length > 0 && (
        <div style={styles.turnControls}>
          <button className="btn-dark" onClick={prevTurn}>← Prev Turn</button>
          <button className="btn-gold" onClick={nextTurn}>Next Turn →</button>
          <button className="btn-danger btn-sm" onClick={resetCombat} style={{ marginLeft: 'auto' }}>
            Reset Combat
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

            return (
              <div
                key={c.id}
                style={{
                  ...styles.combatantCard,
                  ...(isActive ? styles.combatantCardActive : {}),
                }}
              >
                <div style={styles.combatantTop}>
                  {/* Initiative badge */}
                  <div style={styles.initBadge}>{c.initiative}</div>

                  {/* Name & active indicator */}
                  <div style={styles.combatantInfo}>
                    <div style={styles.combatantName}>
                      {isActive && <span style={styles.activeDot}>▶</span>}
                      {c.name}
                    </div>
                    {/* HP Bar */}
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
                      HP: <span style={{ color: hpColor, fontWeight: 'bold' }}>{c.currentHp}</span> / {c.maxHp}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => removeCombatant(c.id)}
                    style={styles.removeBtn}
                    title="Remove combatant"
                  >
                    ✕
                  </button>
                </div>

                {/* HP Controls */}
                <div style={styles.hpControls}>
                  <div style={styles.hpAdjRow}>
                    <span style={styles.labelSm}>Adjust:</span>
                    <input
                      type="number"
                      placeholder="1"
                      value={hpAdjInputs[c.id] || ''}
                      onChange={(e) =>
                        setHpAdjInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      style={{ ...styles.smallInput }}
                    />
                    <button className="btn-success btn-sm" onClick={() => handleHpAdjust(c.id, 1)}>
                      + Heal
                    </button>
                    <button className="btn-danger btn-sm" onClick={() => handleHpAdjust(c.id, -1)}>
                      − Damage
                    </button>
                  </div>
                  <div style={styles.hpSetRow}>
                    <span style={styles.labelSm}>Set HP:</span>
                    <input
                      type="number"
                      placeholder={c.currentHp}
                      value={hpInputs[c.id] || ''}
                      onChange={(e) =>
                        setHpInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      style={{ ...styles.smallInput }}
                    />
                    <button className="btn-dark btn-sm" onClick={() => handleSetHp(c.id)}>
                      Set
                    </button>
                  </div>
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
    gap: 12,
  },
  roundBadge: {
    background: 'linear-gradient(135deg, #1e1308, #231509)',
    border: '2px solid var(--gold-dark)',
    color: 'var(--gold)',
    fontWeight: 700,
    fontSize: '1rem',
    padding: '6px 20px',
    borderRadius: 20,
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.06em',
    boxShadow: '0 0 10px var(--gold-glow)',
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
  formRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: 12,
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
  labelSm: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    whiteSpace: 'nowrap',
    fontFamily: "'Cinzel', 'Georgia', serif",
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
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'border-color 0.22s, box-shadow 0.22s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  combatantCardActive: {
    borderColor: 'var(--gold-dark)',
    boxShadow: '0 0 0 2px var(--gold-glow), 0 4px 20px rgba(0,0,0,0.6), inset 0 0 20px rgba(212,175,55,0.04)',
    background: 'linear-gradient(160deg, #2a1b09, #1e1308, #1a1005)',
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
    fontWeight: 700,
    fontSize: '1.1rem',
    minWidth: 46,
    minHeight: 46,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    flexShrink: 0,
    fontFamily: "'Cinzel', 'Georgia', serif",
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  combatantInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
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
  activeDot: {
    color: 'var(--gold)',
    fontSize: '0.75rem',
    textShadow: '0 0 8px var(--gold-glow)',
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
  removeBtn: {
    flexShrink: 0,
    minWidth: 36,
    minHeight: 36,
    padding: '4px 10px',
  },
  hpControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingLeft: 58,
    borderTop: '1px solid var(--border-color)',
    paddingTop: 12,
  },
  hpAdjRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  hpSetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  smallInput: {
    width: 70,
    padding: '6px 10px',
    fontSize: '0.9rem',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
  },
};
