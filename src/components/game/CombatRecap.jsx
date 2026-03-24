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

const S = {
  container: {
    background: 'rgba(10,8,6,0.95)',
    border: '1px solid rgba(212,175,55,0.4)',
    borderRadius: 8,
    padding: '12px 14px',
    maxWidth: 380,
    width: '100%',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
    borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: 8,
  },
  title: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.85rem', color: '#d4af37',
    fontWeight: 700, letterSpacing: '1px',
    flex: 1,
  },
  roundInfo: {
    fontSize: '0.65rem', color: 'rgba(212,175,55,0.5)',
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#6a5a40',
    cursor: 'pointer', fontSize: 14, padding: 2,
  },
  summaryRow: {
    display: 'flex', gap: 12, justifyContent: 'center',
    marginBottom: 12, paddingBottom: 10,
    borderBottom: '1px solid rgba(212,175,55,0.1)',
  },
  summaryItem: { textAlign: 'center' },
  summaryValue: {
    fontSize: '1rem', fontWeight: 700, color: '#d4af37',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  summaryLabel: {
    fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  sectionLabel: {
    fontSize: '0.6rem', color: 'rgba(212,175,55,0.5)',
    textTransform: 'uppercase', letterSpacing: '1px',
    marginBottom: 6, fontWeight: 700,
  },
  statsList: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  playerRow: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 5, padding: '8px 10px',
  },
  playerName: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginBottom: 5,
    fontSize: '0.72rem', fontWeight: 700,
  },
  playerClass: {
    fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase',
  },
  statsGrid: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
  },
  stat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    minWidth: 36,
  },
  statValue: { fontSize: '0.8rem', fontWeight: 700 },
  statLabel: { fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' },
};
