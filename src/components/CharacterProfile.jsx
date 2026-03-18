import { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';

const CLASS_COLORS = {
  Barbarian: '#e74c3c', Bard: '#9b59b6', Cleric: '#f1c40f',
  Druid: '#27ae60', Fighter: '#e67e22', Monk: '#1abc9c',
  Paladin: '#f39c12', Ranger: '#2ecc71', Rogue: '#95a5a6',
  Sorcerer: '#8e44ad', Warlock: '#6c3483', Wizard: '#2980b9',
};

export default function CharacterProfile({ onClose, campaignId, onCreateNew }) {
  const myCharacters     = useStore(s => s.myCharacters);
  const loadMyCharacters = useStore(s => s.loadMyCharacters);
  const user             = useStore(s => s.user);
  const setMyCharacter   = useStore(s => s.setMyCharacter);
  const setPartyMembers  = useStore(s => s.setPartyMembers);
  const partyMembers     = useStore(s => s.partyMembers);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => { loadMyCharacters(); }, []);

  async function handlePlay(char) {
    if (!campaignId || !user?.id) return;
    setPlayingId(char._characterId);
    try {
      // Update campaign_members to link this character
      await supabase
        .from('campaign_members')
        .update({ character_id: char._characterId })
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);

      // Update partyMembers: replace current user's entry
      const updated = partyMembers.map(m =>
        (m.userId === user.id || m.user_id === user.id) ? { ...char, userId: user.id } : m
      );
      // If not found, append
      if (!updated.some(m => m.userId === user.id || m.user_id === user.id)) {
        updated.push({ ...char, userId: user.id });
      }
      setMyCharacter(char);
      setPartyMembers(updated);
      onClose();
    } catch {
      setPlayingId(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={onClose} style={styles.backBtn}>← Back</button>
        <h1 style={styles.title}>My Characters</h1>
        {onCreateNew && (
          <button onClick={onCreateNew} style={styles.createBtn}>
            ✦ New Character
          </button>
        )}
      </div>

      {myCharacters.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>⚔</div>
          <p style={styles.emptyText}>No characters yet.</p>
          <p style={styles.emptyHint}>Create a character when joining a campaign.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {myCharacters.map(char => {
            const cls = char.class || 'Fighter';
            const accentColor = CLASS_COLORS[cls] || '#d4af37';
            const hp = char.currentHp ?? char.hp ?? char.maxHp ?? '—';
            const maxHp = char.maxHp ?? '—';
            const level = char.level || 1;
            const initials = (char.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

            return (
              <div key={char._characterId || char.name} style={{ ...styles.card, borderColor: accentColor + '55' }}>
                {/* Portrait / initials */}
                <div style={{ ...styles.portrait, borderColor: accentColor, background: accentColor + '22' }}>
                  {char.portrait ? (
                    <img
                      src={char.portrait}
                      alt={char.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    <span style={{ color: accentColor, fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: '1.1rem' }}>
                      {initials}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={styles.info}>
                  <div style={styles.charName}>{char.name || 'Unnamed'}</div>
                  <div style={{ ...styles.classBadge, color: accentColor }}>
                    Lv {level} {char.race || ''} {cls}
                  </div>
                  {char.background && (
                    <div style={styles.background}>{char.background}</div>
                  )}
                </div>

                {/* Stats row */}
                <div style={styles.statsRow}>
                  <StatPill label="HP" value={`${hp}/${maxHp}`} />
                  <StatPill label="AC" value={char.ac || '—'} />
                  {char.proficiencyBonus && <StatPill label="Prof" value={`+${char.proficiencyBonus}`} />}
                </div>

                {/* Ability scores */}
                {char.abilityScores && (
                  <div style={styles.abilitiesRow}>
                    {Object.entries(char.abilityScores).map(([key, val]) => (
                      <div key={key} style={styles.abilityCell}>
                        <span style={styles.abilityLabel}>{key.slice(0, 3).toUpperCase()}</span>
                        <span style={styles.abilityVal}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Play button — only shown when in a campaign */}
                {campaignId && (
                  <button
                    onClick={() => handlePlay(char)}
                    disabled={playingId === char._characterId}
                    style={{ ...styles.playBtn, borderColor: accentColor + '88', color: accentColor, opacity: playingId === char._characterId ? 0.6 : 1 }}
                  >
                    {playingId === char._characterId ? 'Joining…' : '▶ Play in Campaign'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={styles.pill}>
      <span style={styles.pillLabel}>{label}</span>
      <span style={styles.pillValue}>{value}</span>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary, #0d0905)',
    padding: '24px 20px',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(212,175,55,0.3)',
    color: 'rgba(212,175,55,0.8)',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  createBtn: {
    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))',
    border: '1px solid rgba(212,175,55,0.5)',
    color: '#d4af37',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.03em',
    marginLeft: 'auto',
  },
  title: {
    fontFamily: "'Cinzel', Georgia, serif",
    color: '#d4af37',
    fontSize: '1.4rem',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '0.05em',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '3rem', opacity: 0.15 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: '1rem', margin: 0 },
  emptyHint: { color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: 0 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'linear-gradient(160deg, #1a1008, #120c06)',
    border: '1px solid',
    borderRadius: 10,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  portrait: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    textAlign: 'center',
  },
  charName: {
    fontFamily: "'Cinzel', Georgia, serif",
    color: 'rgba(255,255,255,0.92)',
    fontSize: '1rem',
    fontWeight: 700,
  },
  classBadge: {
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
  background: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.72rem',
    fontStyle: 'italic',
  },
  statsRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  pill: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '3px 9px',
    display: 'flex',
    gap: 5,
    alignItems: 'center',
  },
  pillLabel: { color: 'rgba(212,175,55,0.7)', fontSize: '0.68rem', fontWeight: 600 },
  pillValue: { color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', fontWeight: 700 },
  abilitiesRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 4,
    marginTop: 2,
  },
  abilityCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 4,
    padding: '3px 2px',
  },
  abilityLabel: { color: 'rgba(212,175,55,0.6)', fontSize: '0.55rem', fontWeight: 700 },
  abilityVal: { color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 700 },
  playBtn: {
    background: 'transparent',
    border: '1px solid',
    borderRadius: 6,
    padding: '6px 0',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    width: '100%',
    marginTop: 4,
  },
};
