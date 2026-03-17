import { useState } from 'react';
import useStore from '../store/useStore';

const STAT_NAMES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_LABELS = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

function modifier(score) {
  return Math.floor((score - 10) / 2);
}

function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

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

function StatBlock({ stats }) {
  return (
    <div style={styles.statsGrid}>
      {STAT_NAMES.map((stat) => {
        const score = stats[stat] ?? 10;
        const mod = modifier(score);
        return (
          <div key={stat} style={styles.statBox}>
            <div style={styles.statLabel}>{STAT_LABELS[stat]}</div>
            <div style={styles.statScore}>{score}</div>
            <div style={styles.statMod}>{formatMod(mod)}</div>
          </div>
        );
      })}
    </div>
  );
}

function CharacterCard({ character }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card" style={styles.charCard}>
      {/* Header */}
      <button
        style={styles.charHeader}
        onClick={() => setOpen((o) => !o)}
        className="btn-dark"
      >
        <span style={styles.charName}>{character.name}</span>
        <HpBar current={character.currentHp} max={character.maxHp} />
        <span style={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded details */}
      {open && (
        <div style={styles.charBody}>
          {/* Stats */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Ability Scores</h4>
            <StatBlock stats={character.stats || {}} />
          </div>

          {/* Skills */}
          {character.skills && character.skills.length > 0 && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Skills</h4>
              <div style={styles.tagList}>
                {character.skills.map((skill, i) => (
                  <span key={i} style={styles.tag}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Weapons */}
          {character.weapons && character.weapons.length > 0 && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Weapons</h4>
              <div style={styles.weaponList}>
                {character.weapons.map((w, i) => (
                  <div key={i} style={styles.weaponRow}>
                    <span style={styles.weaponName}>{w.name}</span>
                    <span style={styles.weaponDamage}>{w.damage}</span>
                    <span style={styles.weaponBonus}>
                      {w.attackBonus !== undefined
                        ? `Hit: ${formatMod(w.attackBonus)}`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CharacterSheet() {
  const campaign = useStore((s) => s.campaign);

  if (!campaign.loaded || campaign.characters.length === 0) {
    return (
      <div style={styles.container}>
        <h2>Character Sheets</h2>
        <div className="card" style={styles.empty}>
          <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>No campaign loaded.</p>
          <p>Import a campaign with characters using the <strong style={{ color: 'var(--gold)' }}>Import</strong> tab to view character sheets here.</p>
        </div>

        {/* Placeholder preview */}
        <div style={styles.placeholderSection}>
          <h3 style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Preview (example character)</h3>
          <CharacterCard
            character={{
              id: 'placeholder',
              name: 'Aldric the Bold',
              stats: { str: 18, dex: 12, con: 16, int: 10, wis: 13, cha: 14 },
              skills: ['Athletics', 'Perception', 'Intimidation'],
              weapons: [
                { name: 'Longsword', damage: '1d8+4', attackBonus: 6 },
                { name: 'Javelin', damage: '1d6+4', attackBonus: 6 },
              ],
              maxHp: 38,
              currentHp: 38,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Character Sheets</h2>
        <span style={styles.campaignTitle}>{campaign.title}</span>
      </div>
      <div style={styles.charList}>
        {campaign.characters.map((char) => (
          <CharacterCard key={char.id} character={char} />
        ))}
      </div>
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
  campaignTitle: {
    color: 'var(--parchment-dim)',
    fontStyle: 'italic',
    fontSize: '0.9rem',
  },
  empty: {
    padding: 40,
    textAlign: 'center',
  },
  placeholderSection: {
    opacity: 0.55,
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
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 18px',
    borderRadius: 0,
    minHeight: 64,
    textAlign: 'left',
    flexWrap: 'wrap',
    background: 'linear-gradient(160deg, #2a1b0e, #221409)',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
  },
  charName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    minWidth: 120,
    fontFamily: "'Cinzel', 'Georgia', serif",
    letterSpacing: '0.04em',
  },
  chevron: {
    color: 'var(--parchment-dim)',
    marginLeft: 'auto',
    fontSize: '0.75rem',
  },
  charBody: {
    padding: '18px 18px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
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
    boxShadow: 'inset 0 1px 0 rgba(212,175,55,0.06), 0 2px 6px rgba(0,0,0,0.4)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
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
    padding: '4px 14px',
    fontSize: '0.82rem',
    fontStyle: 'italic',
    letterSpacing: '0.02em',
  },
  weaponList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  weaponRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'linear-gradient(160deg, #231608, #1a1005)',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
    padding: '10px 16px',
    transition: 'border-color 0.15s',
  },
  weaponName: {
    flex: 1,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: "'Cinzel', 'Georgia', serif",
    fontSize: '0.9rem',
    letterSpacing: '0.02em',
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
    minWidth: 60,
    textAlign: 'right',
    fontStyle: 'italic',
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
