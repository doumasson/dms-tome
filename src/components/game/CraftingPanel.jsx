import { useState, useCallback } from 'react';
import useStore from '../../store/useStore';
import { RECIPES, MATERIALS, canCraft, consumeIngredients } from '../../lib/craftingRecipes';
import { triggerLootAnimation } from './LootAnimation';

/**
 * CraftingPanel — UI for combining materials into items.
 * Shows available recipes, material requirements, and craft button.
 */
export default function CraftingPanel({ onClose }) {
  const myCharacter = useStore(s => s.myCharacter);
  const updateMyCharacter = useStore(s => s.updateMyCharacter);
  const addItemToInventory = useStore(s => s.addItemToInventory);
  const addNarratorMessage = useStore(s => s.addNarratorMessage);
  const [craftResult, setCraftResult] = useState(null); // { success, message, recipe }

  const inventory = myCharacter?.inventory || [];

  const handleCraft = useCallback((recipe) => {
    if (!canCraft(recipe, inventory)) return;

    // Consume materials
    const remaining = consumeIngredients(recipe, inventory);
    updateMyCharacter({ inventory: remaining });

    // Skill check (simplified: d20 + ability mod vs DC)
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
    // Check if proficient (simplified)
    const skills = myCharacter?.skills || [];
    const isProficient = skills.includes(recipe.skill);
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + mod + (isProficient ? profBonus : 0);
    const success = total >= recipe.dc;

    if (success) {
      addItemToInventory(recipe.result);
      setCraftResult({ success: true, message: `Crafted ${recipe.result.name}! (${recipe.skill} check: ${total} vs DC ${recipe.dc})`, recipe });
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: `${myCharacter?.name || 'The adventurer'} successfully crafts a ${recipe.result.name}.` });
    } else {
      // Failed — materials consumed but no item produced
      setCraftResult({ success: false, message: `Crafting failed! (${recipe.skill} check: ${total} vs DC ${recipe.dc}) — materials lost.`, recipe });
      addNarratorMessage({ role: 'dm', speaker: 'DM', text: `${myCharacter?.name || 'The adventurer'} fails to craft a ${recipe.result.name}. The materials are ruined.` });
    }

    // Clear result after 3s
    setTimeout(() => setCraftResult(null), 3000);
  }, [inventory, myCharacter, updateMyCharacter, addItemToInventory, addNarratorMessage]);

  // Count materials in inventory
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
        <div style={S.header}>
          <span style={S.title}>Crafting</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Materials inventory */}
        <div style={S.section}>
          <div style={S.sectionLabel}>Your Materials</div>
          <div style={S.matGrid}>
            {Object.entries(MATERIALS).map(([id, mat]) => {
              const count = matCounts[id] || 0;
              return (
                <div key={id} style={{ ...S.matItem, opacity: count > 0 ? 1 : 0.3 }}>
                  <span style={S.matIcon}>{mat.icon}</span>
                  <span style={S.matName}>{mat.name}</span>
                  <span style={{ ...S.matCount, color: count > 0 ? '#2ecc71' : '#666' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recipes */}
        <div style={S.section}>
          <div style={S.sectionLabel}>Recipes</div>
          <div style={S.recipeList}>
            {RECIPES.map(recipe => {
              const craftable = canCraft(recipe, inventory);
              return (
                <div key={recipe.id} style={{ ...S.recipeCard, opacity: craftable ? 1 : 0.5 }}>
                  <div style={S.recipeHeader}>
                    <span style={S.recipeIcon}>{recipe.icon}</span>
                    <div style={S.recipeInfo}>
                      <div style={S.recipeName}>{recipe.name}</div>
                      <div style={S.recipeDesc}>{recipe.description}</div>
                    </div>
                  </div>
                  <div style={S.ingredients}>
                    {recipe.ingredients.map((ing, i) => {
                      const mat = MATERIALS[ing.id];
                      const have = matCounts[ing.id] || 0;
                      const enough = have >= ing.qty;
                      return (
                        <span key={i} style={{ ...S.ingBadge, color: enough ? '#2ecc71' : '#e74c3c', borderColor: enough ? '#2ecc7144' : '#e74c3c44' }}>
                          {mat?.icon} {ing.qty}x {mat?.name} ({have})
                        </span>
                      );
                    })}
                  </div>
                  <div style={S.recipeFooter}>
                    <span style={S.skillBadge}>DC {recipe.dc} {recipe.skill}</span>
                    <span style={S.timeBadge}>{recipe.craftTime}</span>
                    <button
                      style={{ ...S.craftBtn, opacity: craftable ? 1 : 0.4 }}
                      disabled={!craftable}
                      onClick={() => handleCraft(recipe)}
                    >
                      Craft
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
            borderColor: craftResult.success ? '#2ecc71' : '#e74c3c',
            color: craftResult.success ? '#2ecc71' : '#e74c3c',
          }}>
            {craftResult.success ? '✓' : '✗'} {craftResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    background: 'linear-gradient(180deg, #1a1208 0%, #120e06 100%)',
    border: '2px solid rgba(212,175,55,0.5)',
    borderRadius: 10, padding: '20px 22px',
    maxWidth: 520, width: '95vw', maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, paddingBottom: 10,
    borderBottom: '1px solid rgba(212,175,55,0.3)',
  },
  title: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '1rem', color: '#d4af37',
    fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
  },
  closeBtn: { background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 16 },
  section: { marginBottom: 14 },
  sectionLabel: {
    fontSize: '0.6rem', color: 'rgba(212,175,55,0.5)',
    textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 6,
  },
  matGrid: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
  },
  matItem: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 4, padding: '3px 8px', fontSize: '0.6rem',
  },
  matIcon: { fontSize: '0.75rem' },
  matName: { color: '#d4c090' },
  matCount: { fontWeight: 700, fontSize: '0.65rem' },
  recipeList: { display: 'flex', flexDirection: 'column', gap: 8 },
  recipeCard: {
    background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)',
    borderRadius: 6, padding: '10px 12px',
  },
  recipeHeader: { display: 'flex', gap: 10, marginBottom: 6 },
  recipeIcon: { fontSize: '1.3rem' },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: '0.75rem', fontWeight: 700, color: '#d4c090', fontFamily: "'Cinzel', serif" },
  recipeDesc: { fontSize: '0.6rem', color: '#8a7a60', marginTop: 2 },
  ingredients: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  ingBadge: {
    fontSize: '0.55rem', padding: '2px 6px', borderRadius: 3,
    border: '1px solid', fontWeight: 600,
  },
  recipeFooter: { display: 'flex', alignItems: 'center', gap: 8 },
  skillBadge: {
    fontSize: '0.5rem', color: '#9b59b6', background: 'rgba(155,89,182,0.1)',
    border: '1px solid rgba(155,89,182,0.3)', borderRadius: 3, padding: '1px 6px',
  },
  timeBadge: {
    fontSize: '0.5rem', color: 'rgba(212,175,55,0.5)', fontStyle: 'italic',
  },
  craftBtn: {
    marginLeft: 'auto', padding: '4px 14px', borderRadius: 4,
    background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)',
    color: '#d4af37', fontFamily: "'Cinzel', serif", fontSize: '0.65rem',
    fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  toast: {
    textAlign: 'center', fontSize: '0.7rem', fontWeight: 700,
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid', marginTop: 10,
    background: 'rgba(0,0,0,0.3)',
  },
};
