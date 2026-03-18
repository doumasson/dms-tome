import { useState } from 'react';
import { supabase } from '../lib/supabase';

function avatarUrl(name, race, cls) {
  const seed = encodeURIComponent(`${name} ${race} ${cls}`.trim());
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;
}

const PRESETS = [
  {
    id: 'fighter',
    emoji: '⚔',
    name: 'Thorin Stoneback',
    class: 'Fighter',
    race: 'Dwarf',
    background: 'Soldier',
    level: 1,
    hp: 12, maxHp: 12, ac: 16, speed: 25,
    stats: { str: 16, dex: 10, con: 15, int: 8, wis: 12, cha: 10 },
    attacks: [{ name: 'Handaxe', bonus: '+5', damage: '1d6+3' }],
    equipment: ['Chain Mail', 'Shield', 'Handaxe ×2'],
    features: ['Second Wind', 'Action Surge'],
    description: 'Sturdy dwarven warrior. Highest HP and AC — absorb hits for your party.',
    color: '#e74c3c',
  },
  {
    id: 'rogue',
    emoji: '🗡',
    name: 'Lyra Swiftblade',
    class: 'Rogue',
    race: 'Half-Elf',
    background: 'Criminal',
    level: 1,
    hp: 8, maxHp: 8, ac: 14, speed: 30,
    stats: { str: 10, dex: 18, con: 12, int: 14, wis: 10, cha: 14 },
    attacks: [{ name: 'Shortsword', bonus: '+6', damage: '1d6+4' }],
    equipment: ['Leather Armor', 'Shortsword', "Thieves' Tools"],
    features: ['Sneak Attack 1d6', "Thieves' Cant", 'Expertise'],
    description: 'Nimble half-elf rogue. Deadly burst damage and unmatched skill checks.',
    color: '#9b59b6',
  },
  {
    id: 'wizard',
    emoji: '✦',
    name: 'Aldric Flamecaller',
    class: 'Wizard',
    race: 'High Elf',
    background: 'Sage',
    level: 1,
    hp: 6, maxHp: 6, ac: 12, speed: 30,
    stats: { str: 8, dex: 14, con: 12, int: 18, wis: 14, cha: 10 },
    attacks: [{ name: 'Fire Bolt', bonus: '+6', damage: '1d10 fire' }],
    equipment: ['Arcane Focus', 'Spellbook', 'Scholar\'s Robes'],
    features: ['Spellcasting', 'Arcane Recovery'],
    spells: ['Magic Missile', 'Shield', 'Burning Hands', 'Fire Bolt', 'Mage Hand'],
    spellSlots: { 1: { total: 2, used: 0 } },
    description: 'Powerful elven wizard. Low HP but devastating ranged spells.',
    color: '#3498db',
  },
];

const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

function statMod(val) {
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

export default function CharacterCreate({ user, campaignId, onDone }) {
  const [selected, setSelected] = useState(null);
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const preset = PRESETS.find(p => p.id === selected);
  const finalName = customName.trim() || preset?.name || '';

  async function handleConfirm() {
    if (!preset) return;
    setSaving(true);
    setError('');

    const character = {
      id: crypto.randomUUID(),
      name: finalName,
      class: preset.class,
      race: preset.race,
      background: preset.background,
      level: preset.level,
      hp: preset.hp,
      maxHp: preset.maxHp,
      ac: preset.ac,
      speed: preset.speed,
      stats: preset.stats,
      attacks: preset.attacks,
      equipment: preset.equipment,
      features: preset.features,
      spells: preset.spells || [],
      spellSlots: preset.spellSlots || {},
      portrait: avatarUrl(finalName, preset.race, preset.class),
      userId: user.id,
      userName: user.name,
    };

    const { error: dbErr } = await supabase
      .from('campaign_members')
      .update({ character_data: character })
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id);

    setSaving(false);
    if (dbErr) {
      setError('Failed to save character. Please try again.');
      return;
    }

    onDone(character);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.headerGlyph}>⚔</div>
          <h1 style={s.title}>Choose Your Character</h1>
          <p style={s.subtitle}>Pick a hero to play. You can rename them below.</p>
        </div>

        <div style={s.presetGrid}>
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelected(p.id); setCustomName(''); }}
              style={{
                ...s.presetCard,
                ...(selected === p.id ? { ...s.presetCardActive, borderColor: p.color } : {}),
              }}
            >
              <div style={{ ...s.presetEmoji, color: p.color }}>{p.emoji}</div>
              <div style={s.presetName}>{p.name}</div>
              <div style={s.presetSub}>{p.race} {p.class}</div>

              {/* Stat pills */}
              <div style={s.statRow}>
                {Object.entries(p.stats).map(([k, v]) => (
                  <div key={k} style={s.statPill}>
                    <span style={s.statLabel}>{STAT_LABELS[k]}</span>
                    <span style={s.statVal}>{statMod(v)}</span>
                  </div>
                ))}
              </div>

              <div style={s.presetHp}>
                <span style={{ color: '#e74c3c' }}>♥ {p.maxHp} HP</span>
                <span style={{ color: '#c8b48c', marginLeft: 8 }}>🛡 AC {p.ac}</span>
              </div>

              <p style={s.presetDesc}>{p.description}</p>

              {/* Features */}
              <div style={s.featureRow}>
                {p.features.map(f => (
                  <span key={f} style={s.featureBadge}>{f}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Custom name */}
        {selected && (
          <div style={s.nameSection}>
            <label style={s.nameLabel}>Character Name</label>
            <input
              autoFocus
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={preset?.name}
              style={s.nameInput}
              onKeyDown={e => e.key === 'Enter' && finalName && handleConfirm()}
            />
            <p style={s.nameHint}>Leave blank to keep the default name.</p>
          </div>
        )}

        {error && <p style={s.error}>{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{
            ...s.confirmBtn,
            ...(selected ? {} : s.confirmBtnDisabled),
          }}
        >
          {saving
            ? 'Saving…'
            : selected
              ? `Enter the Campaign as ${finalName}`
              : 'Select a character above'}
        </button>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 20px 60px',
  },
  card: {
    width: '100%',
    maxWidth: 780,
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  headerGlyph: {
    fontSize: '2.5rem',
    filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.5))',
  },
  title: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#d4af37',
    margin: 0,
  },
  subtitle: {
    color: 'rgba(200,180,140,0.6)',
    fontSize: '0.9rem',
    margin: 0,
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  presetCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '2px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '20px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
    color: '#f0e6d0',
  },
  presetCardActive: {
    background: 'rgba(212,175,55,0.06)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
  },
  presetEmoji: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  presetName: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '1rem',
    color: '#f0e6d0',
  },
  presetSub: {
    color: 'rgba(200,180,140,0.55)',
    fontSize: '0.78rem',
    fontStyle: 'italic',
  },
  statRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    padding: '3px 6px',
    minWidth: 34,
  },
  statLabel: {
    fontSize: '0.55rem',
    color: 'rgba(200,180,140,0.5)',
    fontWeight: 700,
    letterSpacing: '0.05em',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  statVal: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#d4af37',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  presetHp: {
    fontSize: '0.8rem',
    display: 'flex',
    gap: 4,
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
  },
  presetDesc: {
    color: 'rgba(200,180,140,0.65)',
    fontSize: '0.78rem',
    lineHeight: 1.5,
    margin: 0,
  },
  featureRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  featureBadge: {
    background: 'rgba(212,175,55,0.08)',
    border: '1px solid rgba(212,175,55,0.2)',
    color: 'rgba(212,175,55,0.7)',
    fontSize: '0.65rem',
    padding: '2px 8px',
    borderRadius: 10,
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 600,
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  nameLabel: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.75rem',
    color: 'rgba(200,180,140,0.55)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
  },
  nameInput: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#f0e6d0',
    fontSize: '1rem',
    fontFamily: "'Cinzel', Georgia, serif",
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  nameHint: {
    color: 'rgba(200,180,140,0.35)',
    fontSize: '0.72rem',
    margin: 0,
  },
  error: {
    color: '#e74c3c',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  confirmBtn: {
    background: 'linear-gradient(135deg, #d4af37, #a8841f)',
    border: 'none',
    borderRadius: 10,
    color: '#1a0e00',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 900,
    fontSize: '1rem',
    letterSpacing: '0.04em',
    padding: '16px 24px',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 20px rgba(212,175,55,0.25)',
    minHeight: 54,
  },
  confirmBtnDisabled: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(200,180,140,0.3)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};
