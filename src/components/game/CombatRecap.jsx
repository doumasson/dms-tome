import { useMemo } from 'react';

/**
 * CombatRecap — Post-combat summary showing per-character stats.
 * Parses the encounter combat log to extract damage dealt, heals, kills.
 * Displayed after combat ends (victory or defeat).
 */

// Parse combat log entries to extract stats
function parseCombatLog(log = [], combatants = []) {
  const stats = {}; // { name: { damage, healing, kills, hits, misses, spellsCast, crits } }

  const initStats = (name) => {
    if (!stats[name]) {
      stats[name] = { damage: 0, healing: 0, kills: 0, hits: 0, misses: 0, spellsCast: 0, crits: 0, damageTaken: 0 };
    }
  };

  for (const entry of log) {
    if (typeof entry !== 'string') continue;
    const text = entry;

    // Match damage patterns: "X attacks Y ... dealing N damage"
    const dmgMatch = text.match(/^(.+?) (?:attacks?|hits?|strikes?|slashes?|blasts?) .+?(\d+) (?:damage|hp)/i);
    if (dmgMatch) {
      const attacker = dmgMatch[1].replace(/^[⚔🗡💥✨🎯🏹] ?/, '').trim();
      const dmg = parseInt(dmgMatch[2], 10);
      initStats(attacker);
      stats[attacker].damage += dmg;
      stats[attacker].hits += 1;
    }

    // Match miss patterns: "X misses" or "X attacks Y ... miss"
    const missMatch = text.match(/^(.+?) (?:attacks?|strikes?) .+?miss/i);
    if (missMatch && !dmgMatch) {
      const attacker = missMatch[1].replace(/^[⚔🗡] ?/, '').trim();
      initStats(attacker);
      stats[attacker].misses += 1;
    }

    // Match healing: "X heals Y for N hp" or "X restores N hp"
    const healMatch = text.match(/^(.+?) (?:heals?|restores?|cures?) .+?(\d+) (?:hp|hit points)/i);
    if (healMatch) {
      const healer = healMatch[1].replace(/^[✚💚🩹] ?/, '').trim();
      const amt = parseInt(healMatch[2], 10);
      initStats(healer);
      stats[healer].healing += amt;
    }

    // Match kills: "X defeats Y" or "X kills Y" or "Y is defeated"
    const killMatch = text.match(/^(.+?) (?:defeats?|kills?|slays?) (.+)/i);
    if (killMatch) {
      const killer = killMatch[1].replace(/^[💀☠] ?/, '').trim();
      initStats(killer);
      stats[killer].kills += 1;
    }

    // Match spell casting: "X casts Y"
    const spellMatch = text.match(/^(.+?) casts? (.+)/i);
    if (spellMatch) {
      const caster = spellMatch[1].replace(/^[✨🔮] ?/, '').trim();
      initStats(caster);
      stats[caster].spellsCast += 1;
    }

    // Match critical hits
    if (text.toLowerCase().includes('critical') || text.toLowerCase().includes('crit')) {
      // Try to find who critted
      const critMatch = text.match(/^(.+?) (?:scores?|lands?|gets?) .*crit/i);
      if (critMatch) {
        const critter = critMatch[1].replace(/^[⚔💥] ?/, '').trim();
        initStats(critter);
        stats[critter].crits += 1;
      }
    }

    // Match damage taken: "X takes N damage"
    const takenMatch = text.match(/(.+?) takes? (\d+) (?:damage|hp)/i);
    if (takenMatch) {
      const victim = takenMatch[1].replace(/^[💥] ?/, '').trim();
      initStats(victim);
      stats[victim].damageTaken += parseInt(takenMatch[2], 10);
    }
  }

  // Also initialize stats for known combatants
  for (const c of combatants) {
    initStats(c.name);
  }

  return stats;
}

export default function CombatRecap({ encounter = {}, rounds = 1, onClose }) {
  const { combatants = [], log = [] } = encounter;
  const stats = useMemo(() => parseCombatLog(log, combatants), [log, combatants]);

  const players = combatants.filter(c => c.type === 'player');
  const enemies = combatants.filter(c => c.type === 'enemy');
  const deadEnemies = enemies.filter(c => (c.currentHp ?? 0) <= 0);

  // Find MVP (highest damage dealer among players)
  let mvp = null;
  let mvpDmg = 0;
  for (const p of players) {
    const s = stats[p.name];
    if (s && s.damage > mvpDmg) {
      mvpDmg = s.damage;
      mvp = p.name;
    }
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span style={S.title}>Combat Recap</span>
        <span style={S.roundInfo}>Round{rounds > 1 ? 's' : ''}: {rounds}</span>
        {onClose && <button style={S.closeBtn} onClick={onClose}>✕</button>}
      </div>

      {/* Summary stats */}
      <div style={S.summaryRow}>
        <div style={S.summaryItem}>
          <div style={S.summaryValue}>{deadEnemies.length}/{enemies.length}</div>
          <div style={S.summaryLabel}>Enemies Slain</div>
        </div>
        <div style={S.summaryItem}>
          <div style={S.summaryValue}>{rounds}</div>
          <div style={S.summaryLabel}>Rounds</div>
        </div>
        {mvp && (
          <div style={S.summaryItem}>
            <div style={{ ...S.summaryValue, color: '#ffd700', fontSize: '0.7rem' }}>{mvp}</div>
            <div style={S.summaryLabel}>MVP ({mvpDmg} dmg)</div>
          </div>
        )}
      </div>

      {/* Per-player breakdown */}
      <div style={S.sectionLabel}>Party Performance</div>
      <div style={S.statsList}>
        {players.map(p => {
          const s = stats[p.name] || {};
          return (
            <div key={p.id || p.name} style={S.playerRow}>
              <div style={S.playerName}>
                <span style={{ color: p.name === mvp ? '#ffd700' : '#4dd0e1' }}>{p.name}</span>
                <span style={S.playerClass}>{p.class || ''}</span>
              </div>
              <div style={S.statsGrid}>
                {s.damage > 0 && <Stat label="Damage" value={s.damage} color="#e74c3c" />}
                {s.healing > 0 && <Stat label="Healing" value={s.healing} color="#2ecc71" />}
                {s.kills > 0 && <Stat label="Kills" value={s.kills} color="#f39c12" />}
                {s.hits > 0 && <Stat label="Hits" value={s.hits} color="#d4af37" />}
                {s.misses > 0 && <Stat label="Misses" value={s.misses} color="#95a5a6" />}
                {s.spellsCast > 0 && <Stat label="Spells" value={s.spellsCast} color="#9b59b6" />}
                {s.crits > 0 && <Stat label="Crits" value={s.crits} color="#ff6b6b" />}
                {s.damageTaken > 0 && <Stat label="Taken" value={s.damageTaken} color="#e67e22" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={S.stat}>
      <span style={{ ...S.statValue, color }}>{value}</span>
      <span style={S.statLabel}>{label}</span>
    </div>
  );
}

/* PLACEHOLDER ART: needs real dark fantasy assets for production */
const S = {
  container: {
    background: 'linear-gradient(180deg, #1a1208 0%, #0d0a04 50%, #1a1208 100%)',
    border: '2px solid #c9a84c',
    borderRadius: 8,
    padding: '16px 18px',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 0 30px rgba(201,168,76,0.12), inset 0 1px 0 rgba(201,168,76,0.15), 0 8px 32px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
    borderBottom: '2px solid rgba(201,168,76,0.25)', paddingBottom: 10,
  },
  title: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
    fontSize: '0.95rem', color: '#c9a84c',
    fontWeight: 700, letterSpacing: '2px',
    textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(201,168,76,0.3)',
    flex: 1,
  },
  roundInfo: {
    fontSize: '0.65rem', color: '#6a5a40',
    fontFamily: "'Cinzel', serif",
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#6a5a40',
    cursor: 'pointer', fontSize: 14, padding: 4,
    minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  summaryRow: {
    display: 'flex', gap: 16, justifyContent: 'center',
    marginBottom: 14, paddingBottom: 12,
    borderBottom: '2px solid rgba(201,168,76,0.15)',
  },
  summaryItem: {
    textAlign: 'center',
    padding: '6px 14px',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 6,
    border: '1px solid rgba(201,168,76,0.12)',
  },
  summaryValue: {
    fontSize: '1.1rem', fontWeight: 700, color: '#c9a84c',
    fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
    textShadow: '0 0 8px rgba(201,168,76,0.25)',
  },
  summaryLabel: {
    fontSize: '0.48rem', color: '#6a5a40',
    textTransform: 'uppercase', letterSpacing: '1px',
    fontFamily: "'Cinzel', serif", fontWeight: 600,
  },
  sectionLabel: {
    fontSize: '0.6rem', color: '#c9a84c',
    textTransform: 'uppercase', letterSpacing: '2px',
    marginBottom: 8, fontWeight: 700,
    fontFamily: "'Cinzel', serif",
    borderBottom: '1px solid rgba(201,168,76,0.15)',
    paddingBottom: 4,
  },
  statsList: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  playerRow: {
    background: 'linear-gradient(135deg, rgba(201,168,76,0.04) 0%, rgba(0,0,0,0.2) 100%)',
    border: '1px solid rgba(201,168,76,0.12)',
    borderRadius: 6, padding: '10px 12px',
    boxShadow: 'inset 0 1px 0 rgba(201,168,76,0.06)',
  },
  playerName: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginBottom: 6,
    fontSize: '0.75rem', fontWeight: 700,
    fontFamily: "'Cinzel', serif",
  },
  playerClass: {
    fontSize: '0.55rem', color: '#6a5a40',
    textTransform: 'uppercase', letterSpacing: '1px',
    fontWeight: 600,
  },
  statsGrid: {
    display: 'flex', flexWrap: 'wrap', gap: 10,
  },
  stat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    minWidth: 38, padding: '3px 6px',
    background: 'rgba(0,0,0,0.2)', borderRadius: 4,
    border: '1px solid rgba(201,168,76,0.06)',
  },
  statValue: {
    fontSize: '0.85rem', fontWeight: 700,
    fontFamily: "'Cinzel', serif",
  },
  statLabel: {
    fontSize: '0.45rem', color: '#6a5a40',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    fontWeight: 600,
  },
};
