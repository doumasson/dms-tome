import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';

/**
 * Bestiary — Log of encountered monsters with stats, CR, abilities, and portraits.
 * Monsters are auto-logged when encountered in combat.
 * Accessible via tool handler.
 */

export default function Bestiary({ onClose }) {
  const bestiary = useStore(s => s.bestiary) || [];
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return bestiary;
    const q = search.toLowerCase();
    return bestiary.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.type?.toLowerCase().includes(q)
    );
  }, [bestiary, search]);

  const selectedMonster = selected ? bestiary.find(m => m.id === selected || m.name === selected) : null;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <span style={S.title}>Bestiary</span>
          <span style={S.count}>{bestiary.length} creature{bestiary.length !== 1 ? 's' : ''}</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {bestiary.length === 0 ? (
          <div style={S.empty}>
            No creatures encountered yet. Defeat enemies to add them to your bestiary.
          </div>
        ) : (
          <div style={S.content}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search creatures..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={S.search}
            />

            <div style={S.splitView}>
              {/* Monster list */}
              <div style={S.list}>
                {filtered.map(monster => (
                  <div
                    key={monster.id || monster.name}
                    onClick={() => setSelected(monster.id || monster.name)}
                    style={{
                      ...S.listItem,
                      background: (monster.id || monster.name) === selected ? 'rgba(212,175,55,0.12)' : 'transparent',
                      borderColor: (monster.id || monster.name) === selected ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <div style={S.listPortrait}>
                      {monster.portrait ? (
                        <img src={monster.portrait} alt="" style={S.portraitImg} />
                      ) : (
                        <span style={S.portraitFallback}>{(monster.name || '?')[0]}</span>
                      )}
                    </div>
                    <div style={S.listInfo}>
                      <div style={S.listName}>{monster.name}</div>
                      <div style={S.listSub}>CR {monster.cr ?? '?'} · {monster.type || 'Unknown'}</div>
                    </div>
                    <div style={S.listBadge}>×{monster.timesEncountered || 1}</div>
                  </div>
                ))}
              </div>

              {/* Detail pane */}
              <div style={S.detail}>
                {selectedMonster ? (
                  <MonsterDetail monster={selectedMonster} />
                ) : (
                  <div style={S.detailEmpty}>Select a creature to view details</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MonsterDetail({ monster }) {
  const m = monster;
  const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const stats = m.stats || {};

  return (
    <div style={S.detailContent}>
      {/* Portrait + header */}
      <div style={S.detailHeader}>
        {m.portrait && <img src={m.portrait} alt="" style={S.detailPortrait} />}
        <div>
          <div style={S.detailName}>{m.name}</div>
          <div style={S.detailType}>{m.size || ''} {m.type || 'creature'}, {m.alignment || 'unaligned'}</div>
        </div>
      </div>

      {/* Core stats */}
      <div style={S.statRow}>
        <StatBadge label="CR" value={m.cr ?? '?'} color="#f39c12" />
        <StatBadge label="AC" value={m.ac ?? '?'} color="#3498db" />
        <StatBadge label="HP" value={m.hp ?? m.maxHp ?? '?'} color="#2ecc71" />
        <StatBadge label="Speed" value={m.speed ? `${m.speed}ft` : '?'} color="#9b59b6" />
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
          <div style={S.sectionLabel}>Attacks</div>
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

      {/* Encounter info */}
      <div style={S.encounterInfo}>
        Encountered {m.timesEncountered || 1} time{(m.timesEncountered || 1) > 1 ? 's' : ''}
        {m.firstEncountered && ` · First seen: ${new Date(m.firstEncountered).toLocaleDateString()}`}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 45 }}>
      <div style={{ fontSize: '0.5rem', color: `${color}88`, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel: { background: 'linear-gradient(180deg, #1a1208 0%, #120e06 100%)', border: '2px solid rgba(212,175,55,0.5)', borderRadius: 10, padding: '18px 20px', maxWidth: 640, width: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.8)' },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(212,175,55,0.3)' },
  title: { fontFamily: "'Cinzel', serif", fontSize: '1rem', color: '#d4af37', fontWeight: 700, letterSpacing: '2px' },
  count: { fontSize: '0.6rem', color: 'rgba(212,175,55,0.4)', flex: 1 },
  closeBtn: { background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 16 },
  empty: { textAlign: 'center', color: '#6a5a40', fontSize: '0.8rem', padding: '40px 0', fontStyle: 'italic' },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  search: { width: '100%', padding: '6px 10px', marginBottom: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 4, color: '#d4c090', fontSize: '0.72rem', outline: 'none' },
  splitView: { display: 'flex', gap: 10, flex: 1, overflow: 'hidden', minHeight: 0 },
  list: { width: 200, flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 },
  listItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 5, border: '1px solid', cursor: 'pointer', transition: 'background 0.15s' },
  listPortrait: { width: 28, height: 28, borderRadius: '50%', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  portraitImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
  portraitFallback: { fontSize: '0.7rem', color: '#e74c3c', fontWeight: 700 },
  listInfo: { flex: 1, minWidth: 0 },
  listName: { fontSize: '0.65rem', fontWeight: 700, color: '#e88', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  listSub: { fontSize: '0.5rem', color: '#666' },
  listBadge: { fontSize: '0.5rem', color: '#d4af37', flexShrink: 0 },
  detail: { flex: 1, overflowY: 'auto', minWidth: 0 },
  detailEmpty: { textAlign: 'center', color: '#4a3a28', fontSize: '0.72rem', padding: '40px 0', fontStyle: 'italic' },
  detailContent: { display: 'flex', flexDirection: 'column', gap: 10 },
  detailHeader: { display: 'flex', gap: 12, alignItems: 'center' },
  detailPortrait: { width: 50, height: 50, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(192,57,43,0.3)' },
  detailName: { fontSize: '0.9rem', fontWeight: 700, color: '#e74c3c', fontFamily: "'Cinzel', serif" },
  detailType: { fontSize: '0.6rem', color: '#8a7a60', fontStyle: 'italic' },
  statRow: { display: 'flex', gap: 12, justifyContent: 'center', padding: '8px 0', borderTop: '1px solid rgba(212,175,55,0.1)', borderBottom: '1px solid rgba(212,175,55,0.1)' },
  abilities: { display: 'flex', gap: 6, justifyContent: 'center' },
  abilityBox: { textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '4px 8px', minWidth: 40 },
  abilityLabel: { fontSize: '0.5rem', color: '#d4af37', fontWeight: 700 },
  abilityVal: { fontSize: '0.8rem', fontWeight: 700, color: '#d4c090' },
  abilityMod: { fontSize: '0.55rem', color: '#8a7a60' },
  section: { },
  sectionLabel: { fontSize: '0.55rem', color: 'rgba(212,175,55,0.5)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 },
  attackRow: { display: 'flex', gap: 8, alignItems: 'center', padding: '2px 0', fontSize: '0.62rem' },
  attackName: { color: '#d4c090', fontWeight: 600, flex: 1 },
  attackBonus: { color: '#3498db', fontWeight: 700, minWidth: 30 },
  attackDmg: { color: '#e74c3c', fontWeight: 600 },
  tagRow: { fontSize: '0.58rem', color: '#8a7a60' },
  tagLabel: { color: '#d4af37', fontWeight: 700 },
  encounterInfo: { fontSize: '0.5rem', color: '#4a3a28', fontStyle: 'italic', borderTop: '1px solid rgba(212,175,55,0.1)', paddingTop: 6 },
};
