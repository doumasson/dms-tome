import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useStore from '../store/useStore';
import { broadcastDiceRoll } from '../lib/liveChannel';
import DiceAnimation from './DiceAnimation';

const DICE = [4, 6, 8, 10, 12, 20, 100];

// SVG die face paths for d4, d6, d8, d10, d12, d20, d100
const DIE_SHAPES = {
  4:   'M50,5 L95,90 L5,90 Z',
  6:   'M10,10 L90,10 L90,90 L10,90 Z',
  8:   'M50,5 L95,50 L50,95 L5,50 Z',
  10:  'M50,5 L95,40 L78,95 L22,95 L5,40 Z',
  12:  'M50,5 L93,25 L95,72 L55,95 L45,95 L5,72 L7,25 Z',
  20:  'M50,5 L95,35 L82,90 L18,90 L5,35 Z',
  100: 'M10,10 L90,10 L90,90 L10,90 Z',
};

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceTray({ open, onClose }) {
  const addRoll      = useStore(s => s.addRoll);
  const partyMembers = useStore(s => s.partyMembers);
  const user         = useStore(s => s.user);
  const isDM         = useStore(s => s.isDM);
  const dmMode       = useStore(s => s.dmMode);
  const myCharacter  = useStore(s => s.myCharacter);

  // DM in DM mode = elevated (can pick any character); otherwise locked to own character
  const isDMActive = isDM && dmMode;

  const [die, setDie]         = useState(20);
  const [count, setCount]     = useState(1);
  const [mod, setMod]         = useState(0);
  const [adv, setAdv]         = useState('normal');
  const [rolledBy, setRolledBy] = useState('');
  const [animation, setAnimation] = useState(null); // { result, die, rolledBy }

  // Set default rolling identity:
  // - DM with DM mode ON: can pick freely, defaults to first party member
  // - Everyone else: locked to their own character
  useEffect(() => {
    if (isDMActive) {
      setRolledBy(partyMembers[0]?.name || 'DM');
    } else if (myCharacter?.name) {
      setRolledBy(myCharacter.name);
    } else {
      setRolledBy(user?.name || 'Adventurer');
    }
  }, [isDMActive, myCharacter, partyMembers, user]);

  if (!open && !animation) return null;

  function handleRoll() {
    const rolls = [];
    for (let i = 0; i < Math.max(1, count); i++) rolls.push(rollDie(die));

    let total;
    let advantageRolls = null;

    if (adv !== 'normal' && die === 20 && count === 1) {
      const r2 = rollDie(20);
      advantageRolls = [rolls[0], r2];
      total = (adv === 'advantage' ? Math.max(rolls[0], r2) : Math.min(rolls[0], r2)) + mod;
    } else {
      total = rolls.reduce((a, b) => a + b, 0) + mod;
    }

    const entry = {
      id: uuidv4(),
      die,
      count,
      rolls,
      advantageRolls,
      advantage: adv,
      modifier: mod,
      total,
      timestamp: new Date().toLocaleTimeString(),
      rolledBy,
      userId: user?.id, // used to prevent double-counting broadcasts
    };

    addRoll(entry);
    broadcastDiceRoll(entry); // send to all other players in real-time
    setAnimation({ result: total, die, rolledBy });
    onClose(); // close the tray; animation still shows
  }

  function handleAdvChange(v) {
    setAdv(v);
    if (v !== 'normal') setCount(1);
  }

  const charOptions = partyMembers.length > 0
    ? ['DM', ...partyMembers.map(c => c.name)]
    : ['DM'];

  return (
    <>
      {/* Dice animation overlay */}
      {animation && (
        <DiceAnimation
          result={animation.result}
          die={animation.die}
          rolledBy={animation.rolledBy}
          onDone={() => setAnimation(null)}
        />
      )}

      {/* Pull-up tray */}
      {open && (
        <div style={tray.overlayWrap}>
          {/* Backdrop */}
          <div style={tray.backdrop} onClick={onClose} />

          <div style={tray.panel}>
            {/* Handle pill */}
            <div style={tray.handle}>
              <div style={tray.handlePill} />
            </div>

            <div style={tray.inner}>
              {/* Die type */}
              <div style={tray.diceRow}>
                {DICE.map(d => (
                  <button
                    key={d}
                    onClick={() => setDie(d)}
                    style={{
                      ...tray.dieBtn,
                      ...(die === d ? tray.dieBtnActive : {}),
                    }}
                  >
                    <svg viewBox="0 0 100 100" width={28} height={28}>
                      <path
                        d={DIE_SHAPES[d] || DIE_SHAPES[6]}
                        fill={die === d ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)'}
                        stroke={die === d ? '#d4af37' : 'rgba(255,255,255,0.15)'}
                        strokeWidth="4"
                      />
                    </svg>
                    <span style={{ ...tray.dieBtnLabel, color: die === d ? '#d4af37' : 'rgba(200,180,140,0.6)' }}>
                      d{d}
                    </span>
                  </button>
                ))}
              </div>

              {/* Controls row: count, mod, advantage */}
              <div style={tray.controlsRow}>
                {/* Count */}
                <div style={tray.controlGroup}>
                  <span style={tray.controlLabel}>Dice</span>
                  <div style={tray.spinnerRow}>
                    <button style={tray.spinBtn} onClick={() => setCount(c => Math.max(1, c - 1))}>−</button>
                    <span style={tray.spinVal}>{count}</span>
                    <button style={tray.spinBtn} onClick={() => setCount(c => Math.min(20, c + 1))}>+</button>
                  </div>
                </div>

                {/* Modifier */}
                <div style={tray.controlGroup}>
                  <span style={tray.controlLabel}>Mod</span>
                  <div style={tray.spinnerRow}>
                    <button style={tray.spinBtn} onClick={() => setMod(m => m - 1)}>−</button>
                    <span style={tray.spinVal}>{mod >= 0 ? `+${mod}` : mod}</span>
                    <button style={tray.spinBtn} onClick={() => setMod(m => m + 1)}>+</button>
                  </div>
                </div>

                {/* Advantage (only for d20 single) */}
                {die === 20 && count === 1 && (
                  <div style={tray.controlGroup}>
                    <span style={tray.controlLabel}>Type</span>
                    <div style={tray.spinnerRow}>
                      {[['normal','—'], ['advantage','Adv'], ['disadvantage','Dis']].map(([v, label]) => (
                        <button
                          key={v}
                          style={{ ...tray.advBtn, ...(adv === v ? tray.advBtnActive : {}) }}
                          onClick={() => handleAdvChange(v)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rolling as */}
              <div style={tray.rollingAsRow}>
                <span style={tray.controlLabel}>Rolling as</span>
                {isDMActive ? (
                  // DM with DM mode ON can pick any character
                  <div style={tray.charChips}>
                    {charOptions.map(name => (
                      <button
                        key={name}
                        style={{ ...tray.charChip, ...(rolledBy === name ? tray.charChipActive : {}) }}
                        onClick={() => setRolledBy(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                ) : (
                  // Everyone else is locked to their own character
                  <div style={{ ...tray.charChip, ...tray.charChipActive, cursor: 'default', opacity: 0.85 }}>
                    {rolledBy}
                  </div>
                )}
              </div>

              {/* Roll button */}
              <button style={tray.rollBtn} onClick={handleRoll}>
                Roll {count > 1 ? `${count}×` : ''}d{die}{mod !== 0 ? (mod > 0 ? ` +${mod}` : ` ${mod}`) : ''}
                {adv === 'advantage' ? ' (Adv)' : adv === 'disadvantage' ? ' (Dis)' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Tray styles ──────────────────────────────────────────────────────────────
const tray = {
  overlayWrap: {
    position: 'fixed',
    inset: 0,
    zIndex: 300,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    cursor: 'pointer',
  },
  panel: {
    background: 'linear-gradient(180deg, #1e1409 0%, #140e06 100%)',
    borderTop: '2px solid',
    borderImage: 'linear-gradient(90deg, transparent, #d4af37, #a8841f, #d4af37, transparent) 1',
    boxShadow: '0 -12px 60px rgba(0,0,0,0.8)',
    borderRadius: '16px 16px 0 0',
    animation: 'traySlideUp 0.3s cubic-bezier(0.34,1.1,0.64,1)',
  },
  handle: {
    display: 'flex',
    justifyContent: 'center',
    padding: '7px 0 2px',
  },
  handlePill: {
    width: 36,
    height: 3,
    borderRadius: 2,
    background: 'rgba(212,175,55,0.25)',
  },
  inner: {
    padding: '6px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  diceRow: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  dieBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    padding: '8px 6px',
    borderRadius: 10,
    transition: 'all 0.15s',
    minWidth: 48,
  },
  dieBtnActive: {
    transform: 'scale(1.12)',
    background: 'rgba(212,175,55,0.08)',
    border: '1px solid rgba(212,175,55,0.3)',
    boxShadow: '0 0 12px rgba(212,175,55,0.15)',
  },
  dieBtnLabel: {
    fontSize: '0.68rem',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  controlsRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
  },
  controlLabel: {
    color: 'rgba(200,180,140,0.5)',
    fontSize: '0.65rem',
    fontFamily: "'Cinzel', Georgia, serif",
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
  },
  spinnerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  spinBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(200,180,140,0.7)',
    borderRadius: 8,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  spinVal: {
    minWidth: 36,
    textAlign: 'center',
    color: '#d4af37',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '1rem',
  },
  advBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(200,180,140,0.55)',
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  advBtnActive: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.4)',
    color: '#d4af37',
  },
  rollingAsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  charChips: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  charChip: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(200,180,140,0.55)',
    borderRadius: 20,
    padding: '4px 14px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  charChipActive: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.45)',
    color: '#d4af37',
  },
  rollBtn: {
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    border: 'none',
    borderRadius: 10,
    color: '#1a0e00',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 900,
    fontSize: '1.05rem',
    letterSpacing: '0.06em',
    padding: '14px',
    cursor: 'pointer',
    width: '100%',
    marginTop: 4,
    boxShadow: '0 4px 18px rgba(212,175,55,0.3)',
    minHeight: 52,
  },
};
