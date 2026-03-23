import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function CharacterSelect({ user, campaignId, onSelectExisting, onCreateNew }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      if (!user?.id) { setLoading(false); return; }
      // Fetch all campaign_members rows for this user that have character_data
      // (across all campaigns, excluding the current one)
      const { data, error: err } = await supabase
        .from('campaign_members')
        .select('character_data, campaign_id')
        .eq('user_id', user.id)
        .not('character_data', 'is', null)
        .neq('campaign_id', campaignId);

      if (err) { setError('Failed to load characters.'); setLoading(false); return; }

      // Deduplicate by character name
      const seen = new Set();
      const unique = (data || []).filter(m => {
        if (!m.character_data?.name) return false;
        if (seen.has(m.character_data.name)) return false;
        seen.add(m.character_data.name);
        return true;
      });

      let chars = unique.map(m => m.character_data);

      // In dev/test mode with no characters, auto-seed test character for Playwright
      if (chars.length === 0 && import.meta.env.VITE_DEV_AUTO_LOGIN === 'true') {
        const testChar = {
          id: 'test-aric-shadowblade',
          name: 'Aric Shadowblade',
          class: 'Rogue',
          race: 'Human',
          background: 'Criminal',
          level: 1,
          xp: 0,
          hp: 8, maxHp: 8, currentHp: 8,
          ac: 14,
          speed: 30,
          stats: { str: 10, dex: 16, con: 10, int: 12, wis: 12, cha: 14 },
          skills: ['Acrobatics', 'Sleight of Hand'],
          attacks: [{ name: 'Dagger', bonus: '+5', damage: '1d4+3' }],
          features: [],
          spellSlots: {},
          spells: [],
          equipment: [],
          inventory: [],
          equippedItems: {},
          gold: 15,
          proficiencyBonus: 2,
          portrait: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23d4af37" width="200" height="200"/%3E%3C/svg%3E',
          userId: user.id,
          userName: user.name,
        };
        chars = [testChar];
      }

      setCharacters(chars);
      setLoading(false);
    }
    load();
  }, [user?.id, campaignId]);

  async function handleBring(char) {
    setSaving(true);
    try {
      // Save to current campaign's campaign_members row
      const { error: dbErr } = await supabase
        .from('campaign_members')
        .update({ character_data: char })
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id);
      if (dbErr) {
        setError('Failed to bring character. Please try again.');
        setSaving(false);
        return;
      }
      setSaving(false);
      onSelectExisting(char);
    } catch (err) {
      console.error('Error bringing character:', err);
      setError('An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif" }}>
        Loading characters…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚔</div>
        <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", color: 'var(--gold)', fontSize: '1.4rem', margin: '0 0 6px' }}>
          Choose Your Champion
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
          Bring an existing character into this campaign, or forge a new one.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: '#e74c3c', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {characters.length > 0 && (
        <>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 10 }}>
            YOUR CHARACTERS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {characters.map((char) => {
              const hpPct = char.maxHp > 0 ? Math.max(0, char.currentHp / char.maxHp) : 1;
              const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
              return (
                <div
                  key={char.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8,
                    padding: '10px 14px', cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; e.currentTarget.style.background = '#1f1508'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a1a0a'; e.currentTarget.style.background = '#1a1006'; }}
                  onClick={() => !saving && handleBring(char)}
                >
                  {/* Portrait / initials */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: '2px solid rgba(212,175,55,0.4)',
                    background: char.portrait ? 'transparent' : 'rgba(212,175,55,0.1)',
                    overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 700, color: 'var(--gold)',
                  }}>
                    {char.portrait
                      ? <img src={char.portrait} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : char.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Cinzel', Georgia, serif" }}>
                      {char.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {char.race} {char.class} · Level {char.level ?? 1}
                    </div>
                    {char.maxHp > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <div style={{ width: 64, height: 3, background: '#2a1a0a', borderRadius: 2 }}>
                          <div style={{ width: `${hpPct * 100}%`, height: '100%', background: hpColor, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: hpColor }}>{char.currentHp}/{char.maxHp} HP</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontFamily: "'Cinzel', Georgia, serif", flexShrink: 0 }}>
                    {saving ? '…' : 'Bring →'}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create new */}
      <button
        onClick={onCreateNew}
        style={{
          width: '100%', padding: '14px 20px',
          background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.4)',
          borderRadius: 8, cursor: 'pointer',
          color: 'var(--gold)', fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.7)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
      >
        ✦ Create New Character
      </button>
    </div>
  );
}
