import { useState } from 'react';

// Simplified SRD treasure tables by CR tier
// [cpDice, cpMult, spDice, spMult, gpDice, gpMult, ppDice, ppMult]
const COIN_TABLES = [
  { min: 0,  max: 4,  cp: [6,100], sp: [3,10],  gp: [2,1],    pp: [0,0]    },
  { min: 5,  max: 10, cp: [0,0],   sp: [4,100], gp: [3,10],   pp: [0,0]    },
  { min: 11, max: 16, cp: [0,0],   sp: [0,0],   gp: [4,100],  pp: [0,0]    },
  { min: 17, max: 99, cp: [0,0],   sp: [0,0],   gp: [2,1000], pp: [3,100]  },
];

const MAGIC_ITEMS = {
  common: [
    'Potion of Healing', 'Potion of Climbing', 'Cantrip Scroll', '1st-Level Spell Scroll',
    'Bag of Tricks (Grey)', 'Rope of Mending', 'Hat of Disguise',
  ],
  uncommon: [
    'Potion of Greater Healing', '+1 Weapon', '+1 Shield', 'Bag of Holding',
    'Cloak of Elvenkind', 'Eyes of Charming', 'Wand of Magic Missiles',
    'Boots of Elvenkind', 'Gauntlets of Ogre Power', 'Periapt of Wound Closure',
  ],
  rare: [
    'Potion of Superior Healing', '+2 Weapon', 'Ring of Protection',
    'Necklace of Fireballs', 'Staff of the Python', 'Amulet of Health',
    'Belt of Dwarvenkind', 'Carpet of Flying', 'Cube of Force',
  ],
  veryRare: [
    'Potion of Supreme Healing', '+3 Weapon', 'Ring of Regeneration',
    'Manual of Bodily Health', 'Tome of Clear Thought', 'Cloak of Invisibility',
    'Ring of Spell Storing', 'Staff of Power',
  ],
  legendary: [
    'Vorpal Sword', 'Hammer of Thunderbolts', 'Sphere of Annihilation',
    'Staff of the Magi', 'Talisman of Pure Good', 'Holy Avenger',
  ],
};

function d(sides) { return Math.floor(Math.random() * sides) + 1; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function rollCoins(dice, mult) {
  if (!dice) return 0;
  let total = 0;
  for (let i = 0; i < dice; i++) total += d(6);
  return total * mult;
}

function getMagicItem(cr) {
  const roll = Math.random();
  if (cr >= 17) {
    if (roll < 0.05) return { rarity: 'Legendary', name: pick(MAGIC_ITEMS.legendary) };
    if (roll < 0.35) return { rarity: 'Very Rare', name: pick(MAGIC_ITEMS.veryRare) };
    if (roll < 0.70) return { rarity: 'Rare',      name: pick(MAGIC_ITEMS.rare) };
    if (roll < 0.90) return { rarity: 'Uncommon',  name: pick(MAGIC_ITEMS.uncommon) };
  } else if (cr >= 11) {
    if (roll < 0.10) return { rarity: 'Very Rare', name: pick(MAGIC_ITEMS.veryRare) };
    if (roll < 0.40) return { rarity: 'Rare',      name: pick(MAGIC_ITEMS.rare) };
    if (roll < 0.75) return { rarity: 'Uncommon',  name: pick(MAGIC_ITEMS.uncommon) };
  } else if (cr >= 5) {
    if (roll < 0.05) return { rarity: 'Rare',      name: pick(MAGIC_ITEMS.rare) };
    if (roll < 0.35) return { rarity: 'Uncommon',  name: pick(MAGIC_ITEMS.uncommon) };
    if (roll < 0.65) return { rarity: 'Common',    name: pick(MAGIC_ITEMS.common) };
  } else if (cr >= 1) {
    if (roll < 0.25) return { rarity: 'Common',    name: pick(MAGIC_ITEMS.common) };
  }
  return null;
}

function rollLoot(cr) {
  const crNum = parseFloat(cr) || 0;
  const tier = COIN_TABLES.find(t => crNum >= t.min && crNum <= t.max) || COIN_TABLES[0];
  return {
    cp: rollCoins(...tier.cp),
    sp: rollCoins(...tier.sp),
    gp: rollCoins(...tier.gp),
    pp: rollCoins(...tier.pp),
    magicItem: getMagicItem(crNum),
  };
}

function gpValue({ cp, sp, gp, pp }) {
  return (cp / 100 + sp / 10 + gp + pp * 10).toFixed(1);
}

const RARITY_COLORS = {
  Common:    '#aaa',
  Uncommon:  '#2ecc71',
  Rare:      '#3498db',
  'Very Rare': '#9b59b6',
  Legendary: '#f1c40f',
};

export default function LootGenerator({ defaultCr = 1, onClose }) {
  const [cr, setCr] = useState(String(defaultCr));
  const [loot, setLoot] = useState(null);
  const [copied, setCopied] = useState(false);

  function roll() { setLoot(rollLoot(cr)); setCopied(false); }

  function copyText() {
    if (!loot) return;
    const lines = [];
    if (loot.cp) lines.push(`${loot.cp} cp`);
    if (loot.sp) lines.push(`${loot.sp} sp`);
    if (loot.gp) lines.push(`${loot.gp} gp`);
    if (loot.pp) lines.push(`${loot.pp} pp`);
    if (loot.magicItem) lines.push(`${loot.magicItem.rarity}: ${loot.magicItem.name}`);
    navigator.clipboard.writeText(lines.join(', ') || 'No loot').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const hasCoins = loot && (loot.cp || loot.sp || loot.gp || loot.pp);

  return (
    <div style={s.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={s.title}>🎁 Loot Generator</span>
        {onClose && <button onClick={onClose} style={s.close}>✕</button>}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <label style={s.label}>CR</label>
        <input
          type="number"
          value={cr}
          onChange={e => setCr(e.target.value)}
          min={0}
          step={0.125}
          style={s.input}
        />
        <button onClick={roll} style={s.rollBtn}>🎲 Roll</button>
        {loot && <button onClick={() => roll()} style={s.rerollBtn}>↺ Reroll</button>}
      </div>

      {loot && (
        <div style={s.results}>
          {/* Coins */}
          <div style={s.coinsRow}>
            {[
              { label: 'CP', value: loot.cp, color: '#c87941' },
              { label: 'SP', value: loot.sp, color: '#aaa' },
              { label: 'GP', value: loot.gp, color: '#d4af37' },
              { label: 'PP', value: loot.pp, color: '#b0c4de' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...s.coin, opacity: value ? 1 : 0.25 }}>
                <div style={{ ...s.coinValue, color }}>{value || 0}</div>
                <div style={s.coinLabel}>{label}</div>
              </div>
            ))}
          </div>

          {!hasCoins && !loot.magicItem && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
              No treasure found.
            </div>
          )}

          {hasCoins && (
            <div style={s.gpTotal}>≈ {gpValue(loot)} gp total</div>
          )}

          {/* Magic item */}
          {loot.magicItem ? (
            <div style={{ ...s.magicItem, borderColor: RARITY_COLORS[loot.magicItem.rarity] }}>
              <span style={{ ...s.rarityBadge, color: RARITY_COLORS[loot.magicItem.rarity] }}>
                ✦ {loot.magicItem.rarity}
              </span>
              <span style={s.itemName}>{loot.magicItem.name}</span>
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No magic item this time.
            </div>
          )}

          <button onClick={copyText} style={s.copyBtn}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  panel: {
    background: '#1a1006',
    border: '1px solid var(--border-gold)',
    borderRadius: 8,
    padding: '14px 16px',
  },
  title: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.9rem',
    color: 'var(--gold)',
    fontWeight: 700,
  },
  close: {
    background: 'transparent', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', fontSize: '1rem', padding: '0 4px',
  },
  label: { fontSize: '0.82rem', color: 'var(--text-secondary)' },
  input: {
    width: 72, background: '#0f0a04', border: '1px solid var(--border-light)',
    color: 'var(--text-primary)', borderRadius: 4, padding: '5px 8px', fontSize: '0.88rem',
  },
  rollBtn: {
    minHeight: 34, padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00', fontWeight: 700, fontSize: '0.85rem', border: 'none',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  rerollBtn: {
    minHeight: 30, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
    background: 'transparent', border: '1px solid var(--border-light)',
    color: 'var(--text-muted)', fontSize: '0.78rem',
  },
  results: {
    borderTop: '1px solid #2a1a0a', paddingTop: 12,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  coinsRow: {
    display: 'flex', justifyContent: 'space-around', gap: 8,
  },
  coin: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1,
    background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 4px',
    border: '1px solid #2a1a0a',
  },
  coinValue: {
    fontSize: '1.2rem', fontWeight: 700, lineHeight: 1,
  },
  coinLabel: {
    fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em',
  },
  gpTotal: {
    textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: -4,
  },
  magicItem: {
    display: 'flex', flexDirection: 'column', gap: 4,
    background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px',
    border: '1px solid',
  },
  rarityBadge: {
    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  itemName: {
    fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600,
  },
  copyBtn: {
    alignSelf: 'flex-end', minHeight: 28, padding: '4px 12px', borderRadius: 5, cursor: 'pointer',
    background: 'transparent', border: '1px solid var(--border-light)',
    color: 'var(--text-muted)', fontSize: '0.75rem',
  },
};
