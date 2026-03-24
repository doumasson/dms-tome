import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * Bestiary — Leather-bound monster manual.
 * Logs encountered monsters with stats, CR, abilities, and portraits.
 * Split view: creature index on left, detail page on right.
 */

export default function Bestiary({ onClose }) {
  const bestiary = useStore(s => s.bestiary) || [];
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return bestiary;
    const q = search.toLowerCase();
    return bestiary.filter(m => m.name?.toLowerCase().includes(q) || m.type?.toLowerCase().includes(q));
  }, [bestiary, search]);

  const selectedMonster = selected ? bestiary.find(m => m.id === selected || m.name === selected) : null;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.book} onClick={e => e.stopPropagation()}>
        {/* Book spine accent */}
        <div style={S.spine} />

        {/* Corner studs */}
        <BookStud pos="top-left" />
        <BookStud pos="top-right" />
        <BookStud pos="bottom-left" />
        <BookStud pos="bottom-right" />

        {/* Header — book title embossed */}
        <div style={S.header}>
          <div style={S.titleRow}>
            <span style={S.titleIcon}>📕</span>
            <div>
              <div style={S.title}>Bestiary</div>
              <div style={S.subtitle}>{bestiary.length} creature{bestiary.length !== 1 ? 's' : ''} catalogued</div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.color = '#d4af37'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6a5a40'; e.currentTarget.style.borderColor = 'rgba(100,80,50,0.3)'; }}
          >✕</button>
        </div>

        <div style={S.divider}>
          <div style={S.dividerLine} />
          <div style={S.dividerGem}>◆</div>
          <div style={S.dividerLine} />
        </div>

        {bestiary.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📖</div>
            No creatures encountered yet. Defeat enemies to fill your bestiary.
          </div>
        ) : (
          <div style={S.content}>
            {/* Search bar */}
            <input type="text" placeholder="Search creatures..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={S.search}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'}
            />

            <div style={S.splitView}>
              {/* Index — left page */}
              <div style={S.indexPage}>
                {filtered.map(monster => {
                  const isSelected = (monster.id || monster.name) === selected;
                  return (
                    <div key={monster.id || monster.name}
                      onClick={() => setSelected(monster.id || monster.name)}
                      style={{
                        ...S.indexEntry,
                        background: isSelected ? 'rgba(212,175,55,0.1)' : 'transparent',
                        borderColor: isSelected ? 'rgba(212,175,55,0.35)' : 'rgba(60,45,20,0.2)',
                      }}
                    >
                      <div style={S.entryPortrait}>
                        {monster.portrait ? (
                          <img src={monster.portrait} alt="" style={S.portraitImg} />
                        ) : (
                          <span style={S.portraitFallback}>{(monster.name || '?')[0]}</span>
                        )}
                      </div>
                      <div style={S.entryInfo}>
                        <div style={S.entryName}>{monster.name}</div>
                        <div style={S.entrySub}>CR {monster.cr ?? '?'} · {monster.type || 'Unknown'}</div>
                      </div>
                      <div style={S.entryCount}>×{monster.timesEncountered || 1}</div>
                    </div>
                  );
                })}
              </div>

              {/* Detail — right page */}
              <div style={S.detailPage}>
                {selectedMonster ? (
                  <MonsterDetail monster={selectedMonster} />
                ) : (
                  <div style={S.detailEmpty}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 6, opacity: 0.4 }}>🔍</div>
                    Select a creature to view its entry
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bestiaryOpen {
          0% { transform: scale(0.92) rotateY(-3deg); opacity: 0; }
          100% { transform: scale(1) rotateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function MonsterDetail({ monster }) {
  const m = monster;
  const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const stats = m.stats || {};

  return (
    <div style={S.detailContent}>
      {/* Header with portrait */}
      <div style={S.detailHeader}>
        {m.portrait && (
          <div style={S.detailPortraitFrame}>
            <img src={m.portrait} alt="" style={S.detailPortraitImg} />
          </div>
        )}
        <div>
          <div style={S.detailName}>{m.name}</div>
          <div style={S.detailType}>{m.size || ''} {m.type || 'creature'}, {m.alignment || 'unaligned'}</div>
        </div>
      </div>

      {/* Core stat badges */}
      <div style={S.coreStats}>
        <CoreStat label="CR" value={m.cr ?? '?'} color="#f39c12" />
        <CoreStat label="AC" value={m.ac ?? '?'} color="#3498db" />
        <CoreStat label="HP" value={m.hp ?? m.maxHp ?? '?'} color="#2ecc71" />
        <CoreStat label="SPD" value={m.speed ? `${m.speed}` : '?'} color="#9b59b6" />
      </div>

      {/* Ability scores */}
      {Object.keys(stats).length > 0 && (
        <div style={S.abilities}>
          {statNames.map(s => {
            const val = stats[s];
            if (val == null) return null;
            const mod = Math.floor((val - 10) / 2);
            return (
              <div key={s} style={S.abilityBox}>
                <div style={S.abilityLabel}>{s.toUpperCase()}</div>
                <div style={S.abilityVal}>{val}</div>
                <div style={S.abilityMod}>{mod >= 0 ? `+${mod}` : mod}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attacks */}
      {m.attacks?.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionLabel}>⚔ Attacks</div>
          {m.attacks.map((atk, i) => (
            <div key={i} style={S.attackRow}>
              <span style={S.attackName}>{atk.name}</span>
              <span style={S.attackBonus}>{atk.bonus || atk.toHit || ''}</span>
              <span style={S.attackDmg}>{atk.damage || ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Resistances / Immunities */}
      {m.resistances && <div style={S.tagRow}><span style={S.tagLabel}>Resist:</span> {m.resistances}</div>}
      {m.immunities && <div style={S.tagRow}><span style={S.tagLabel}>Immune:</span> {m.immunities}</div>}
      {m.vulnerabilities && <div style={S.tagRow}><span style={S.tagLabel}>Vulnerable:</span> {m.vulnerabilities}</div>}

      {/* Encounter history */}
      <div style={S.encounterInfo}>
        Encountered {m.timesEncountered || 1} time{(m.timesEncountered || 1) > 1 ? 's' : ''}
        {m.firstEncountered && ` · First seen: ${new Date(m.firstEncountered).toLocaleDateString()}`}
      </div>
    </div>
  );
}

function CoreStat({ label, value, color }) {
  return (
    <div style={S.coreStat}>
      <div style={{ fontSize: '0.45rem', color: `${color}88`, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color, textShadow: `0 0 4px ${color}33` }}>{value}</div>
    </div>
  );
}

function BookStud({ pos }) {
  const isTop = pos.includes('top');
  const isLeft = pos.includes('left');
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{
      position: 'absolute',
      [isTop ? 'top' : 'bottom']: 6,
      [isLeft ? 'left' : 'right']: 6,
      pointerEvents: 'none',
    }}>
      <circle cx="7" cy="7" r="5" fill="rgba(160,128,48,0.15)" stroke="#d4af37" strokeWidth="0.8" opacity="0.4" />
      <circle cx="7" cy="7" r="2" fill="#d4af37" opacity="0.25" />
    </svg>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(2px)',
  },
  book: {
    position: 'relative',
    /* Leather texture via layered gradients */
    background: `
      radial-gradient(ellipse at 20% 20%, rgba(60,40,15,0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(50,32,10,0.2) 0%, transparent 50%),
      linear-gradient(170deg, #221a0c 0%, #1a1208 30%, #16100a 60%, #120e06 100%)
    `,
    border: '2px solid rgba(212,175,55,0.35)',
    borderRadius: 10,
    padding: '20px 22px 16px',
    maxWidth: 680, width: '96vw', maxHeight: '86vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: `
      0 12px 48px rgba(0,0,0,0.9),
      0 0 30px rgba(212,175,55,0.04),
      inset 0 0 40px rgba(0,0,0,0.3),
      inset 0 1px 0 rgba(212,175,55,0.1),
      0 0 0 5px rgba(0,0,0,0.3),
      0 0 0 6px rgba(212,175,55,0.1)
    `,
    animation: 'bestiaryOpen 0.25s ease-out',
  },
  spine: {
    position: 'absolute', left: 0, top: 10, bottom: 10, width: 4,
    background: 'linear-gradient(180deg, rgba(212,175,55,0.2), rgba(160,120,40,0.1), rgba(212,175,55,0.2))',
    borderRadius: '4px 0 0 4px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10 },
  titleIcon: { fontSize: '1.4rem', filter: 'drop-shadow(0 0 5px rgba(192,57,43,0.3))' },
  title: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '1.05rem', color: '#d4af37',
    fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    textShadow: '0 0 8px rgba(212,175,55,0.25)',
  },
  subtitle: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.58rem', color: 'rgba(180,150,100,0.45)',
    fontStyle: 'italic', marginTop: 1,
  },
  closeBtn: {
    background: 'none', border: '1px solid rgba(100,80,50,0.3)',
    borderRadius: 6, color: '#6a5a40', cursor: 'pointer',
    fontSize: 14, width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  dividerLine: { flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)' },
  dividerGem: { color: '#d4af37', fontSize: '0.45rem', opacity: 0.4 },
  empty: {
    textAlign: 'center', padding: '40px 0',
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.78rem', color: '#6a5a40', fontStyle: 'italic',
  },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  search: {
    width: '100%', padding: '8px 12px', marginBottom: 10,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 6, color: '#d4c090',
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.72rem', outline: 'none',
    transition: 'border-color 0.2s',
  },
  splitView: { display: 'flex', gap: 12, flex: 1, overflow: 'hidden', minHeight: 0 },

  /* Index page — left */
  indexPage: {
    width: 200, flexShrink: 0, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 3,
    borderRight: '1px solid rgba(212,175,55,0.1)',
    paddingRight: 10,
  },
  indexEntry: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 8px', borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  entryPortrait: {
    width: 30, height: 30, borderRadius: 6, flexShrink: 0,
    background: 'rgba(192,57,43,0.1)',
    border: '1px solid rgba(192,57,43,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  portraitImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5 },
  portraitFallback: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.75rem', color: '#e74c3c', fontWeight: 700,
  },
  entryInfo: { flex: 1, minWidth: 0 },
  entryName: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.62rem', fontWeight: 700, color: '#d08080',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  entrySub: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.48rem', color: 'rgba(180,150,100,0.4)',
  },
  entryCount: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.48rem', color: 'rgba(212,175,55,0.5)', fontWeight: 700, flexShrink: 0,
  },

  /* Detail page — right */
  detailPage: { flex: 1, overflowY: 'auto', minWidth: 0 },
  detailEmpty: {
    textAlign: 'center', padding: '40px 0',
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.72rem', color: '#4a3a28', fontStyle: 'italic',
  },
  detailContent: { display: 'flex', flexDirection: 'column', gap: 10 },
  detailHeader: { display: 'flex', gap: 14, alignItems: 'center' },
  detailPortraitFrame: {
    width: 54, height: 54, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
    border: '2px solid rgba(192,57,43,0.3)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 0 8px rgba(0,0,0,0.3)',
  },
  detailPortraitImg: { width: '100%', height: '100%', objectFit: 'cover' },
  detailName: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '0.9rem', fontWeight: 700, color: '#e06050',
    textShadow: '0 0 6px rgba(231,76,60,0.2)',
  },
  detailType: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.6rem', color: '#8a7a60', fontStyle: 'italic', marginTop: 2,
  },
  coreStats: {
    display: 'flex', gap: 10, justifyContent: 'center',
    padding: '8px 0',
    borderTop: '1px solid rgba(212,175,55,0.12)',
    borderBottom: '1px solid rgba(212,175,55,0.12)',
  },
  coreStat: {
    textAlign: 'center', minWidth: 44,
    background: 'rgba(0,0,0,0.2)', borderRadius: 5, padding: '4px 8px',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  abilities: {
    display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap',
  },
  abilityBox: {
    textAlign: 'center',
    background: 'linear-gradient(180deg, rgba(30,22,10,0.6), rgba(16,12,6,0.8))',
    border: '1px solid rgba(212,175,55,0.15)',
    borderRadius: 5, padding: '5px 8px', minWidth: 42,
  },
  abilityLabel: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.45rem', color: '#d4af37', fontWeight: 700, letterSpacing: '0.08em',
  },
  abilityVal: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.8rem', fontWeight: 700, color: '#e8d5a3',
  },
  abilityMod: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.52rem', color: 'rgba(180,150,100,0.5)',
  },
  section: { marginTop: 2 },
  sectionLabel: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.52rem', color: 'rgba(212,175,55,0.55)',
    textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4,
  },
  attackRow: {
    display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0',
    fontFamily: '"Crimson Text", Georgia, serif', fontSize: '0.62rem',
  },
  attackName: { color: '#d4c090', fontWeight: 600, flex: 1 },
  attackBonus: { color: '#3498db', fontWeight: 700, minWidth: 30 },
  attackDmg: { color: '#e06050', fontWeight: 600 },
  tagRow: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.58rem', color: '#8a7a60',
  },
  tagLabel: { color: '#d4af37', fontWeight: 700 },
  encounterInfo: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.5rem', color: '#4a3a28', fontStyle: 'italic',
    borderTop: '1px solid rgba(212,175,55,0.1)', paddingTop: 6,
  },
};
