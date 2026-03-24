import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { crToXp } from '../lib/xpTable';
import { generateLoot, isEligibleForItem } from '../lib/lootGenerator';
import { rollDie, getPortraitUrl } from '../lib/dice';

const RARITY_COLOR = {
  common:    '#888888',
  uncommon:  '#2ecc71',
  rare:      '#3498db',
  very_rare: '#9b59b6',
  legendary: '#f39c12',
};

const RARITY_LABEL = {
  common:    'Common',
  uncommon:  'Uncommon',
  rare:      'Rare',
  very_rare: 'Very Rare',
  legendary: 'Legendary',
};

// ── Roll-off panel for a single magic item ───────────────────────────────────
function ItemRollOff({ item, partyMembers, onWinner }) {
  const addItemToInventory = useStore(s => s.addItemToInventory);
  const myCharacter        = useStore(s => s.myCharacter);

  // rolls: { [characterId]: number }
  const [rolls, setRolls] = useState({});
  const [winner, setWinner] = useState(null);
  const [tiedIds, setTiedIds] = useState(null); // null = no tie yet

  const eligible = useMemo(
    () => partyMembers.filter(c => isEligibleForItem(c, item)),
    [partyMembers, item],
  );

  function charKey(c) { return c.id || c.name; }

  function handleRoll(character) {
    const key = charKey(character);
    if (rolls[key] !== undefined) return; // already rolled
    // Only allow rolling for own character
    if (myCharacter && charKey(myCharacter) !== key) return;
    setRolls(prev => ({ ...prev, [key]: rollDie(20) }));
  }

  // Determine if all eligible players have rolled
  const allRolled = eligible.length > 0 && eligible.every(c => rolls[charKey(c)] !== undefined);

  // After all rolled, compute winner / tie
  useMemo(() => {
    if (!allRolled || winner) return;
    const activePlayers = tiedIds
      ? eligible.filter(c => tiedIds.includes(charKey(c)))
      : eligible;
    const allRolledForActive = activePlayers.every(c => rolls[charKey(c)] !== undefined);
    if (!allRolledForActive) return;

    const maxRoll = Math.max(...activePlayers.map(c => rolls[charKey(c)]));
    const tied = activePlayers.filter(c => rolls[charKey(c)] === maxRoll);
    if (tied.length === 1) {
      setWinner(tied[0]);
      // Only add item to inventory if the LOCAL player won the roll-off
      if (myCharacter && charKey(myCharacter) === charKey(tied[0])) {
        addItemToInventory(item);
      }
      onWinner?.(tied[0], item);
    } else {
      setTiedIds(tied.map(charKey));
    }
  }, [allRolled, rolls]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleReroll() {
    // Clear rolls for tied players only
    const newRolls = { ...rolls };
    tiedIds.forEach(id => delete newRolls[id]);
    setRolls(newRolls);
    setTiedIds(null);
  }

  const rarityColor = RARITY_COLOR[item.rarity] || '#888';
  const activeTied  = tiedIds ?? [];

  return (
    <div style={s.rollOffCard}>
      {/* Item header */}
      <div style={s.itemHeader}>
        <div style={s.itemName}>{item.name}</div>
        <span style={{ ...s.rarityBadge, background: rarityColor + '22', color: rarityColor, borderColor: rarityColor + '55' }}>
          {RARITY_LABEL[item.rarity] || item.rarity}
        </span>
      </div>
      {item.description && (
        <div style={s.itemDesc}>{item.description}</div>
      )}
      {item.requiresAttunement && (
        <div style={s.attunementNote}>Requires Attunement</div>
      )}

      {/* Winner banner */}
      {winner && (
        <div style={s.winnerBanner}>
          {winner.name} wins {item.name}!
        </div>
      )}

      {/* Tie banner */}
      {!winner && tiedIds && (
        <div style={s.tieBanner}>
          Tie! {tiedIds.map(id => partyMembers.find(c => charKey(c) === id)?.name).join(' & ')} must re-roll.
          {myCharacter && tiedIds.includes(charKey(myCharacter)) && (
            <button style={s.rerollBtn} onClick={handleReroll}>Re-roll</button>
          )}
        </div>
      )}

      {/* Character roll rows */}
      {!winner && (
        <div style={s.rollList}>
          {partyMembers.map(character => {
            const key      = charKey(character);
            const isElig   = isEligibleForItem(character, item);
            const rolled   = rolls[key];
            const isMe     = myCharacter && charKey(myCharacter) === key;
            const isTied   = activeTied.includes(key);
            const canRoll  = isElig && isMe && rolled === undefined && (!tiedIds || isTied);
            const dimmed   = !isElig || (tiedIds && !isTied);

            return (
              <div
                key={key}
                style={{ ...s.rollRow, opacity: dimmed ? 0.35 : 1 }}
                title={!isElig ? 'Not proficient' : undefined}
              >
                <img
                  src={getPortraitUrl(character.name, character.race, character.class)}
                  alt={character.name}
                  style={s.portrait}
                />
                <span style={s.charName}>{character.name}</span>
                <div style={s.rollResult}>
                  {rolled !== undefined ? (
                    <span style={{ ...s.dieValue, color: rolled === 20 ? '#f39c12' : rolled === 1 ? '#e74c3c' : '#e8dcc8' }}>
                      {rolled}
                    </span>
                  ) : canRoll ? (
                    <button style={s.rollBtn} onClick={() => handleRoll(character)}>
                      Roll d20
                    </button>
                  ) : (
                    <span style={s.waiting}>{isElig ? '—' : 'N/A'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main LootScreen ──────────────────────────────────────────────────────────
export default function LootScreen({ enemies, partySize, onDone }) {
  const myCharacter        = useStore(s => s.myCharacter);
  const partyMembers       = useStore(s => s.partyMembers);
  const claimCombatRewards = useStore(s => s.claimCombatRewards);

  const totalXp = useMemo(() => enemies.reduce((sum, e) => sum + crToXp(e.cr), 0), [enemies]);
  const xpEach  = Math.floor(totalXp / Math.max(partySize, 1));

  const { totalGold, goldPerPlayer, items } = useMemo(
    () => generateLoot(enemies, partySize),
    [enemies, partySize], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [rewardsClaimed, setRewardsClaimed] = useState(false);
  const [itemWinners, setItemWinners]       = useState({}); // instanceId → characterName

  // Use partyMembers from store; fall back to myCharacter alone if store empty
  const members = useMemo(() => {
    if (partyMembers && partyMembers.length > 0) return partyMembers;
    if (myCharacter) return [myCharacter];
    return [];
  }, [partyMembers, myCharacter]);

  function handleClaimRewards() {
    if (rewardsClaimed) return;
    claimCombatRewards(xpEach, goldPerPlayer);
    setRewardsClaimed(true);
  }

  function handleItemWinner(character, item) {
    setItemWinners(prev => ({ ...prev, [item.instanceId]: character.name }));
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.trophy}>⚔</div>
          <h2 style={s.title}>Victory!</h2>
          <p style={s.subtitle}>The enemies are defeated. Claim your rewards.</p>
        </div>

        {/* XP + Gold summary */}
        <div style={s.rewardRow}>
          <div style={s.rewardCard}>
            <div style={s.rewardIcon}>✦</div>
            <div style={s.rewardAmount}>{xpEach.toLocaleString()}</div>
            <div style={s.rewardLabel}>XP each</div>
            <div style={s.rewardTotal}>({totalXp.toLocaleString()} total ÷ {partySize})</div>
          </div>
          <div style={s.rewardCard}>
            <div style={s.rewardIcon}>🪙</div>
            <div style={s.rewardAmount}>{goldPerPlayer}</div>
            <div style={s.rewardLabel}>Gold each</div>
            <div style={s.rewardTotal}>({totalGold} total ÷ {partySize})</div>
          </div>
        </div>

        {/* Claim XP + Gold */}
        {myCharacter && (
          <button
            style={{ ...s.takeBtn, ...(rewardsClaimed ? s.takeBtnDone : {}) }}
            onClick={handleClaimRewards}
            disabled={rewardsClaimed}
          >
            {rewardsClaimed
              ? `✓ Rewards claimed by ${myCharacter.name}`
              : `Claim XP & Gold as ${myCharacter.name}`}
          </button>
        )}

        {/* Magic item roll-offs */}
        {items.length > 0 && (
          <div style={s.magicSection}>
            <div style={s.sectionTitle}>Magic Items</div>
            {items.map(item => (
              <ItemRollOff
                key={item.instanceId}
                item={item}
                partyMembers={members}
                onWinner={handleItemWinner}
              />
            ))}
          </div>
        )}

        {/* Continue */}
        <button style={s.continueBtn} onClick={onDone}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)'; e.currentTarget.style.color = '#d4af37'; e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)'; e.currentTarget.style.color = 'rgba(200,180,140,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
          Continue Adventure →
        </button>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 8000,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%', maxWidth: 540,
    background: 'linear-gradient(180deg, #1a0f05 0%, #110a03 100%)',
    border: '1px solid rgba(212,175,55,0.35)',
    borderRadius: 14, padding: '28px 24px',
    display: 'flex', flexDirection: 'column', gap: 20,
    boxShadow: '0 8px 60px rgba(0,0,0,0.8)',
    maxHeight: '90vh', overflowY: 'auto',
  },
  header: { textAlign: 'center' },
  trophy: { fontSize: '2.8rem', marginBottom: 8, filter: 'drop-shadow(0 0 16px rgba(212,175,55,0.6))' },
  title: { fontFamily: "'Cinzel', Georgia, serif", color: '#d4af37', fontSize: '1.5rem', margin: '0 0 6px', letterSpacing: '0.06em' },
  subtitle: { color: 'rgba(200,180,140,0.6)', fontSize: '0.85rem', margin: 0 },
  rewardRow: { display: 'flex', gap: 12 },
  rewardCard: {
    flex: 1, textAlign: 'center', padding: '16px 10px',
    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 10,
  },
  rewardIcon:   { fontSize: '1.4rem', marginBottom: 4 },
  rewardAmount: { fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.8rem', fontWeight: 700, color: '#d4af37', lineHeight: 1 },
  rewardLabel:  { fontSize: '0.72rem', color: 'rgba(200,180,140,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4, fontFamily: "'Cinzel', Georgia, serif" },
  rewardTotal:  { fontSize: '0.68rem', color: 'rgba(200,180,140,0.35)', marginTop: 2 },
  takeBtn: {
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00', border: 'none', borderRadius: 8,
    padding: '12px 20px', fontSize: '0.9rem', fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif", cursor: 'pointer', width: '100%',
  },
  takeBtnDone: { background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.4)', color: '#2ecc71', cursor: 'default' },
  magicSection: { display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.72rem', color: 'rgba(212,175,55,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase' },

  // ItemRollOff
  rollOffCard: {
    background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
  },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  itemName:   { fontFamily: "'Cinzel', Georgia, serif", fontSize: '1rem', color: '#e8dcc8', fontWeight: 700, flex: 1 },
  rarityBadge: {
    fontSize: '0.68rem', fontFamily: "'Cinzel', Georgia, serif",
    padding: '2px 8px', borderRadius: 4, border: '1px solid',
    textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0,
  },
  itemDesc:       { fontSize: '0.78rem', color: 'rgba(200,180,140,0.55)', lineHeight: 1.4 },
  attunementNote: { fontSize: '0.68rem', color: 'rgba(180,130,200,0.6)', fontStyle: 'italic' },
  winnerBanner: {
    background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.35)',
    borderRadius: 6, padding: '8px 12px', color: '#2ecc71',
    fontSize: '0.85rem', fontFamily: "'Cinzel', Georgia, serif", textAlign: 'center',
  },
  tieBanner: {
    background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6, padding: '8px 12px', color: '#d4af37',
    fontSize: '0.82rem', fontFamily: "'Cinzel', Georgia, serif",
    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  },
  rerollBtn: {
    background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.45)',
    color: '#d4af37', borderRadius: 5, padding: '4px 12px',
    fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Cinzel', Georgia, serif",
  },
  rollList: { display: 'flex', flexDirection: 'column', gap: 6 },
  rollRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 10px',
  },
  portrait: { width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.25)', flexShrink: 0, background: '#111' },
  charName: { flex: 1, fontSize: '0.85rem', color: '#c8b88a', fontFamily: "'Cinzel', Georgia, serif" },
  rollResult: { flexShrink: 0, minWidth: 72, textAlign: 'right' },
  dieValue:  { fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.1rem', fontWeight: 700 },
  rollBtn: {
    background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.4)',
    color: '#d4af37', borderRadius: 5, padding: '4px 10px',
    fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Cinzel', Georgia, serif",
  },
  waiting: { fontSize: '0.78rem', color: 'rgba(200,180,140,0.3)' },

  continueBtn: {
    background: 'transparent', border: '1px solid rgba(212,175,55,0.25)',
    color: 'rgba(200,180,140,0.6)', borderRadius: 8, padding: '10px 20px',
    fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Cinzel', Georgia, serif",
    width: '100%', textAlign: 'center',
  },
};
