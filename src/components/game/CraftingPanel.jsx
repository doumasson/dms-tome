import { useState, useCallback } from 'react';
import useStore from '../../store/useStore';
import { RECIPES, MATERIALS, canCraft, consumeIngredients } from '../../lib/craftingRecipes';
import { triggerLootAnimation } from './LootAnimation';

/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * CraftingPanel — RPG workbench UI for combining materials into items.
 * Styled as an ornate crafting table with ingredient slots and spellbook recipes.
 */
export default function CraftingPanel({ onClose }) {
  const myCharacter = useStore(s => s.myCharacter);
  const updateMyCharacter = useStore(s => s.updateMyCharacter);
  const addItemToInventory = useStore(s => s.addItemToInventory);
  const addNarratorMessage = useStore(s => s.addNarratorMessage);
  const [craftResult, setCraftResult] = useState(null);

  const inventory = myCharacter?.inventory || [];

  const handleCraft = useCallback((recipe) => {
    if (!canCraft(recipe, inventory)) return;
    const remaining = consumeIngredients(recipe, inventory);
    updateMyCharacter({ inventory: remaining });

    const stats = myCharacter?.stats || {};
    const skillMods = {
      Medicine: Math.floor(((stats.wis || 10) - 10) / 2),
      Nature: Math.floor(((stats.wis || 10) - 10) / 2),
      Arcana: Math.floor(((stats.int || 10) - 10) / 2),
      Religion: Math.floor(((stats.int || 10) - 10) / 2),
      'Sleight of Hand': Math.floor(((stats.dex || 10) - 10) / 2),
    };
    const mod = skillMods[recipe.skill] || 0;
    const profBonus = Math.floor(((myCharacter?.level || 1) - 1) / 4) + 2;
    const skills = myCharacter?.skills || [];
    const isProficient = skills.includes(recipe.skill);
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + mod + (isProficient ? profBonus : 0);
    const success = total >= recipe.dc;

    if (success) {
      addItemToInventory(recipe.result);
      setCraftResult({ success: true, message: `Crafted ${recipe.result.name}! (${recipe.skill}: ${total} vs DC ${recipe.dc})`, recipe });
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: `${myCharacter?.name || 'The adventurer'} successfully crafts a ${recipe.result.name}.` });
    } else {
      setCraftResult({ success: false, message: `Failed! (${recipe.skill}: ${total} vs DC ${recipe.dc}) — materials lost.`, recipe });
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: `${myCharacter?.name || 'The adventurer'} fails to craft a ${recipe.result.name}. The materials are ruined.` });
    }
    setTimeout(() => setCraftResult(null), 3000);
  }, [inventory, myCharacter, updateMyCharacter, addItemToInventory, addNarratorMessage]);

  const matCounts = {};
  for (const item of inventory) {
    for (const [id, mat] of Object.entries(MATERIALS)) {
      if (item.name === mat.name || item.id === id) {
        matCounts[id] = (matCounts[id] || 0) + (item.quantity || 1);
      }
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        {/* Corner filigree */}
        <Filigree style={{ top: 6, left: 6 }} rotate={0} />
        <Filigree style={{ top: 6, right: 6 }} rotate={90} />
        <Filigree style={{ bottom: 6, left: 6 }} rotate={270} />
        <Filigree style={{ bottom: 6, right: 6 }} rotate={180} />

        {/* Header — workbench title */}
        <div style={S.header}>
          <div style={S.headerIcon}>⚒️</div>
          <div>
            <div style={S.title}>Crafting Table</div>
            <div style={S.subtitle}>Combine materials to forge new items</div>
          </div>
          <button
            style={S.closeBtn}
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.color = '#d4af37'; e.currentTarget.style.textShadow = '0 0 8px rgba(212,175,55,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6a5a40'; e.currentTarget.style.textShadow = 'none'; }}
          >✕</button>
        </div>

        {/* Gold divider with diamond */}
        <div style={S.dividerWrap}>
          <div style={S.dividerLine} />
          <div style={S.dividerDiamond}>◆</div>
          <div style={S.dividerLine} />
        </div>

        {/* Materials — ornate ingredient slots */}
        <div style={S.section}>
          <div style={S.sectionLabel}>
            <span style={S.sectionIcon}>🧪</span> Your Materials
          </div>
          <div style={S.matGrid}>
            {Object.entries(MATERIALS).map(([id, mat]) => {
              const count = matCounts[id] || 0;
              const hasAny = count > 0;
              return (
                <div key={id} style={{
                  ...S.matSlot,
                  borderColor: hasAny ? 'rgba(212,175,55,0.4)' : 'rgba(80,65,40,0.3)',
                  boxShadow: hasAny ? 'inset 0 0 12px rgba(212,175,55,0.08), 0 2px 6px rgba(0,0,0,0.4)' : 'inset 0 0 8px rgba(0,0,0,0.4)',
                  opacity: hasAny ? 1 : 0.4,
                }}>
                  <div style={S.matSlotIcon}>{mat.icon}</div>
                  <div style={S.matSlotName}>{mat.name}</div>
                  {hasAny && (
                    <div style={S.matSlotCount}>{count}</div>
                  )}
                  {/* Slot corner notches */}
                  <div style={{ ...S.slotCorner, top: 0, left: 0, borderTop: '2px solid rgba(212,175,55,0.3)', borderLeft: '2px solid rgba(212,175,55,0.3)' }} />
                  <div style={{ ...S.slotCorner, top: 0, right: 0, borderTop: '2px solid rgba(212,175,55,0.3)', borderRight: '2px solid rgba(212,175,55,0.3)' }} />
                  <div style={{ ...S.slotCorner, bottom: 0, left: 0, borderBottom: '2px solid rgba(212,175,55,0.3)', borderLeft: '2px solid rgba(212,175,55,0.3)' }} />
                  <div style={{ ...S.slotCorner, bottom: 0, right: 0, borderBottom: '2px solid rgba(212,175,55,0.3)', borderRight: '2px solid rgba(212,175,55,0.3)' }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recipes — spellbook-style list */}
        <div style={S.section}>
          <div style={S.sectionLabel}>
            <span style={S.sectionIcon}>📖</span> Recipes
          </div>
          <div style={S.recipeList}>
            {RECIPES.map(recipe => {
              const craftable = canCraft(recipe, inventory);
              return (
                <div key={recipe.id} style={{
                  ...S.recipeCard,
                  borderColor: craftable ? 'rgba(212,175,55,0.35)' : 'rgba(60,50,30,0.3)',
                }}>
                  {/* Recipe header row */}
                  <div style={S.recipeHeader}>
                    <div style={{
                      ...S.recipeIconWrap,
                      boxShadow: craftable ? '0 0 10px rgba(212,175,55,0.2)' : 'none',
                    }}>
                      <span style={S.recipeIcon}>{recipe.icon}</span>
                    </div>
                    <div style={S.recipeInfo}>
                      <div style={{
                        ...S.recipeName,
                        color: craftable ? '#e8d5a3' : '#6a5a40',
                      }}>{recipe.name}</div>
                      <div style={S.recipeDesc}>{recipe.description}</div>
                    </div>
                  </div>

                  {/* Ingredient requirements */}
                  <div style={S.ingredients}>
                    <span style={S.ingLabel}>Requires:</span>
                    {recipe.ingredients.map((ing, i) => {
                      const mat = MATERIALS[ing.id];
                      const have = matCounts[ing.id] || 0;
                      const enough = have >= ing.qty;
                      return (
                        <span key={i} style={{
                          ...S.ingBadge,
                          background: enough ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)',
                          borderColor: enough ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)',
                          color: enough ? '#5dbd84' : '#c0524a',
                        }}>
                          {mat?.icon} {ing.qty}× {mat?.name}
                          <span style={{ opacity: 0.6, marginLeft: 3 }}>({have})</span>
                        </span>
                      );
                    })}
                  </div>

                  {/* Footer — skill check & craft button */}
                  <div style={S.recipeFooter}>
                    <div style={S.skillBadge}>
                      <span style={{ color: '#b896db' }}>⚡</span> DC {recipe.dc} {recipe.skill}
                    </div>
                    <span style={S.timeBadge}>⏱ {recipe.craftTime}</span>
                    <button
                      style={{
                        ...S.craftBtn,
                        opacity: craftable ? 1 : 0.35,
                        cursor: craftable ? 'pointer' : 'not-allowed',
                      }}
                      disabled={!craftable}
                      onClick={() => handleCraft(recipe)}
                      onMouseEnter={e => {
                        if (!craftable) return;
                        e.currentTarget.style.background = 'linear-gradient(180deg, rgba(212,175,55,0.3), rgba(180,140,30,0.2))';
                        e.currentTarget.style.boxShadow = '0 0 14px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'linear-gradient(180deg, rgba(212,175,55,0.15), rgba(160,120,20,0.1))';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.1)';
                      }}
                    >
                      ⚒ Craft
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Craft result toast */}
        {craftResult && (
          <div style={{
            ...S.toast,
            borderColor: craftResult.success ? 'rgba(46,204,113,0.5)' : 'rgba(231,76,60,0.5)',
            background: craftResult.success
              ? 'linear-gradient(180deg, rgba(46,204,113,0.12), rgba(20,60,30,0.2))'
              : 'linear-gradient(180deg, rgba(231,76,60,0.12), rgba(60,20,20,0.2))',
            color: craftResult.success ? '#5dbd84' : '#e0645c',
          }}>
            <span style={{ fontSize: '1.1rem' }}>{craftResult.success ? '✦' : '✗'}</span> {craftResult.message}
          </div>
        )}
      </div>

      <style>{`
        @keyframes craftPanelIn {
          0% { transform: scale(0.9) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** SVG corner filigree accent */
function Filigree({ style, rotate }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{
      position: 'absolute', ...style, pointerEvents: 'none',
      transform: `rotate(${rotate}deg)`,
    }}>
      <path d="M0,0 Q12,1 22,22" stroke="#d4af37" strokeWidth="1.2" fill="none" opacity="0.4" />
      <path d="M0,0 Q6,1 10,10" stroke="#d4af37" strokeWidth="0.8" fill="none" opacity="0.3" />
      <circle cx="2" cy="2" r="1.5" fill="#d4af37" opacity="0.4" />
    </svg>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(2px)',
  },
  panel: {
    position: 'relative',
    background: 'linear-gradient(170deg, rgba(30,22,10,0.98) 0%, rgba(16,12,6,0.99) 100%)',
    border: '2px solid rgba(212,175,55,0.4)',
    borderRadius: 12,
    padding: '22px 24px 18px',
    maxWidth: 540, width: '95vw', maxHeight: '85vh', overflowY: 'auto',
    boxShadow: `
      0 12px 48px rgba(0,0,0,0.9),
      0 0 30px rgba(212,175,55,0.06),
      inset 0 1px 0 rgba(212,175,55,0.12),
      inset 0 -1px 0 rgba(0,0,0,0.3)
    `,
    animation: 'craftPanelIn 0.25s ease-out',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 10,
  },
  headerIcon: {
    fontSize: '1.6rem',
    filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.4))',
  },
  title: {
    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
    fontSize: '1.05rem', color: '#d4af37',
    fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(212,175,55,0.3)',
  },
  subtitle: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.65rem', color: 'rgba(180,150,100,0.5)',
    fontStyle: 'italic', marginTop: 1,
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none', border: '1px solid rgba(100,80,50,0.3)',
    borderRadius: 6, color: '#6a5a40', cursor: 'pointer',
    fontSize: 14, width: 32, height: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  dividerWrap: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  dividerLine: {
    flex: 1, height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.35), transparent)',
  },
  dividerDiamond: {
    color: '#d4af37', fontSize: '0.45rem', opacity: 0.5,
  },
  section: { marginBottom: 16 },
  sectionLabel: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.65rem', color: 'rgba(212,175,55,0.6)',
    textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
    marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
  },
  sectionIcon: { fontSize: '0.8rem' },
  matGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: 6,
  },
  matSlot: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 2, padding: '10px 6px 8px',
    background: 'linear-gradient(180deg, rgba(30,22,10,0.6), rgba(16,12,6,0.8))',
    border: '1px solid',
    borderRadius: 6,
    transition: 'all 0.2s',
  },
  slotCorner: {
    position: 'absolute', width: 6, height: 6, pointerEvents: 'none',
  },
  matSlotIcon: { fontSize: '1.2rem', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' },
  matSlotName: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.55rem', color: '#d4c090', textAlign: 'center', lineHeight: 1.2,
  },
  matSlotCount: {
    position: 'absolute', top: 3, right: 5,
    fontFamily: '"Cinzel", serif',
    fontSize: '0.6rem', fontWeight: 700, color: '#5dbd84',
    textShadow: '0 0 4px rgba(46,204,113,0.3)',
  },
  recipeList: { display: 'flex', flexDirection: 'column', gap: 8 },
  recipeCard: {
    background: 'linear-gradient(180deg, rgba(40,30,14,0.5), rgba(20,15,8,0.6))',
    border: '1px solid',
    borderRadius: 8, padding: '12px 14px',
    transition: 'border-color 0.2s',
  },
  recipeHeader: { display: 'flex', gap: 12, marginBottom: 8 },
  recipeIconWrap: {
    width: 44, height: 44, minWidth: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(145deg, rgba(40,30,14,0.8), rgba(20,15,8,0.9))',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 8,
  },
  recipeIcon: { fontSize: '1.4rem' },
  recipeInfo: { flex: 1, minWidth: 0 },
  recipeName: {
    fontFamily: '"Cinzel", serif',
    fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em',
  },
  recipeDesc: {
    fontFamily: '"Crimson Text", Georgia, serif',
    fontSize: '0.62rem', color: '#8a7a60', marginTop: 2, fontStyle: 'italic',
  },
  ingredients: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: 8,
  },
  ingLabel: {
    fontSize: '0.52rem', color: 'rgba(180,150,100,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
  },
  ingBadge: {
    fontSize: '0.58rem', padding: '3px 8px', borderRadius: 4,
    border: '1px solid', fontWeight: 600,
    fontFamily: '"Crimson Text", Georgia, serif',
  },
  recipeFooter: { display: 'flex', alignItems: 'center', gap: 10 },
  skillBadge: {
    fontSize: '0.55rem', color: '#b896db',
    background: 'rgba(155,89,182,0.08)',
    border: '1px solid rgba(155,89,182,0.2)', borderRadius: 4,
    padding: '3px 8px', fontWeight: 600,
    fontFamily: '"Crimson Text", Georgia, serif',
  },
  timeBadge: {
    fontSize: '0.52rem', color: 'rgba(212,175,55,0.4)',
    fontFamily: '"Crimson Text", Georgia, serif',
    fontStyle: 'italic',
  },
  craftBtn: {
    marginLeft: 'auto', padding: '7px 18px', borderRadius: 6,
    background: 'linear-gradient(180deg, rgba(212,175,55,0.15), rgba(160,120,20,0.1))',
    border: '1px solid rgba(212,175,55,0.45)',
    color: '#d4af37',
    fontFamily: '"Cinzel", serif', fontSize: '0.68rem',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.1)',
    transition: 'all 0.2s',
    minHeight: 36,
  },
  toast: {
    textAlign: 'center',
    fontFamily: '"Cinzel", serif',
    fontSize: '0.72rem', fontWeight: 700,
    padding: '10px 14px', borderRadius: 8,
    border: '1px solid', marginTop: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
};
