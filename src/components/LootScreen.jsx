import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { CONSUMABLES } from '../data/equipment';
import { crToXp } from '../lib/xpTable';

// CR-based gold drop table (average gold pieces by CR)
function goldForCr(cr) {
  const table = {
    '0': 2, '1/8': 5, '1/4': 10, '1/2': 20,
    1: 50, 2: 100, 3: 150, 4: 250, 5: 400,
    6: 600, 7: 900, 8: 1300, 9: 1800, 10: 2500,
  };
  const base = table[String(cr)] ?? 100;
  // Roll with some variance (75% to 125%)
  return Math.floor(base * (0.75 + Math.random() * 0.5));
}

// Generate 1-2 item drops based on highest enemy CR
function generateItemDrops(enemies) {
  const lootPool = CONSUMABLES.filter(c => ['healing-potion', 'greater-healing-potion', 'antitoxin', 'potion-of-speed'].includes(c.id));
  const highestCr = enemies.reduce((best, e) => {
    const crNum = parseFloat(e.cr) || 0;
    return crNum > best ? crNum : best;
  }, 0);
  const count = highestCr >= 5 ? 2 : highestCr >= 2 ? 1 : (Math.random() > 0.5 ? 1 : 0);
  const drops = [];
  for (let i = 0; i < count; i++) {
    const pool = highestCr >= 4 ? lootPool : lootPool.filter(c => c.id !== 'potion-of-speed');
    drops.push({ ...pool[Math.floor(Math.random() * pool.length)], instanceId: crypto.randomUUID(), quantity: 1 });
  }
  return drops;
}

export default function LootScreen({ enemies, partySize, onDone }) {
  const myCharacter        = useStore(s => s.myCharacter);
  const claimCombatRewards = useStore(s => s.claimCombatRewards);
  const addItemToInventory = useStore(s => s.addItemToInventory);

  const totalXp   = useMemo(() => enemies.reduce((sum, e) => sum + crToXp(e.cr), 0), [enemies]);
  const totalGold = useMemo(() => enemies.reduce((sum, e) => sum + goldForCr(e.cr), 0), [enemies]);
  const xpEach    = Math.floor(totalXp / Math.max(partySize, 1));
  const goldEach  = Math.floor(totalGold / Math.max(partySize, 1));
  const itemDrops = useMemo(() => generateItemDrops(enemies), [enemies]);

  const [claimed, setClaimed]       = useState({}); // instanceId → true
  const [xpApplied, setXpApplied]   = useState(false);
  const [goldApplied, setGoldApplied] = useState(false);

  function handleClaimItem(item) {
    if (claimed[item.instanceId]) return;
    addItemToInventory(item);
    setClaimed(prev => ({ ...prev, [item.instanceId]: true }));
  }

  function handleTakeRewards() {
    if (xpApplied && goldApplied) return;
    claimCombatRewards(
      xpApplied ? 0 : xpEach,
      goldApplied ? 0 : goldEach,
    );
    setXpApplied(true);
    setGoldApplied(true);
  }

  const rewardsTaken = xpApplied && goldApplied;
  const allClaimed = itemDrops.every(i => claimed[i.instanceId]);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.trophy}>⚔</div>
          <h2 style={styles.title}>Victory!</h2>
          <p style={styles.subtitle}>The enemies are defeated. Claim your rewards.</p>
        </div>

        {/* XP & Gold */}
        <div style={styles.rewardRow}>
          <div style={styles.rewardCard}>
            <div style={styles.rewardIcon}>✦</div>
            <div style={styles.rewardAmount}>{xpEach.toLocaleString()}</div>
            <div style={styles.rewardLabel}>XP each</div>
            <div style={styles.rewardTotal}>({totalXp.toLocaleString()} total ÷ {partySize})</div>
          </div>
          <div style={styles.rewardCard}>
            <div style={styles.rewardIcon}>🪙</div>
            <div style={styles.rewardAmount}>{goldEach}</div>
            <div style={styles.rewardLabel}>Gold each</div>
            <div style={styles.rewardTotal}>({totalGold} total ÷ {partySize})</div>
          </div>
        </div>

        {/* Take XP + Gold button */}
        {myCharacter && (
          <button
            style={{ ...styles.takeBtn, ...(rewardsTaken ? styles.takeBtnDone : {}) }}
            onClick={handleTakeRewards}
            disabled={rewardsTaken}
          >
            {rewardsTaken ? `✓ Rewards claimed by ${myCharacter.name}` : `Claim XP & Gold as ${myCharacter.name}`}
          </button>
        )}

        {/* Item drops */}
        {itemDrops.length > 0 && (
          <div style={styles.itemSection}>
            <div style={styles.itemSectionTitle}>Item Drops</div>
            <div style={styles.itemList}>
              {itemDrops.map(item => (
                <div key={item.instanceId} style={styles.itemCard}>
                  <span style={styles.itemIcon}>{item.icon || '📦'}</span>
                  <div style={styles.itemInfo}>
                    <div style={styles.itemName}>{item.name}</div>
                    <div style={styles.itemDesc}>{item.description}</div>
                  </div>
                  <button
                    style={{ ...styles.claimBtn, ...(claimed[item.instanceId] ? styles.claimBtnDone : {}) }}
                    onClick={() => handleClaimItem(item)}
                    disabled={!!claimed[item.instanceId]}
                  >
                    {claimed[item.instanceId] ? '✓ Claimed' : 'Claim'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue */}
        <button style={styles.continueBtn} onClick={onDone}>
          Continue Adventure →
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 8000,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%', maxWidth: 520,
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
  rewardIcon: { fontSize: '1.4rem', marginBottom: 4 },
  rewardAmount: { fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.8rem', fontWeight: 700, color: '#d4af37', lineHeight: 1 },
  rewardLabel: { fontSize: '0.72rem', color: 'rgba(200,180,140,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4, fontFamily: "'Cinzel', Georgia, serif" },
  rewardTotal: { fontSize: '0.68rem', color: 'rgba(200,180,140,0.35)', marginTop: 2 },
  takeBtn: {
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00', border: 'none', borderRadius: 8,
    padding: '12px 20px', fontSize: '0.9rem', fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif", cursor: 'pointer', width: '100%',
  },
  takeBtnDone: { background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.4)', color: '#2ecc71', cursor: 'default' },
  itemSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  itemSectionTitle: { fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.72rem', color: 'rgba(212,175,55,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase' },
  itemList: { display: 'flex', flexDirection: 'column', gap: 8 },
  itemCard: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px' },
  itemIcon: { fontSize: '1.4rem', flexShrink: 0 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.9rem', color: '#e8dcc8', fontWeight: 700 },
  itemDesc: { fontSize: '0.72rem', color: 'rgba(200,180,140,0.5)', marginTop: 2 },
  claimBtn: { background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#d4af37', borderRadius: 6, padding: '6px 14px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Cinzel', Georgia, serif", flexShrink: 0 },
  claimBtnDone: { background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)', color: '#2ecc71', cursor: 'default' },
  continueBtn: { background: 'transparent', border: '1px solid rgba(212,175,55,0.25)', color: 'rgba(200,180,140,0.6)', borderRadius: 8, padding: '10px 20px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Cinzel', Georgia, serif", width: '100%', textAlign: 'center' },
};
