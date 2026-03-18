import { useState } from 'react';
import useStore from '../store/useStore';

// ─── Class feature definitions ────────────────────────────────────────────────
// Each entry describes what actions/bonus actions a class gets at a given level.
// Used to build the action panel dynamically.

const CLASS_ACTIONS = {
  Fighter: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '⚔', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Make a weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
      { id: 'help', label: 'Help', icon: '🤝', description: 'Give ally advantage on next check/attack', type: 'special' },
      level >= 2 ? { id: 'action_surge', label: 'Action Surge', icon: '⚡', description: 'Take one additional action', type: 'resource', resource: 'Action Surge', rechargeOn: 'short' } : null,
    ].filter(Boolean),
    bonusActions: (level, char) => [
      { id: 'second_wind', label: 'Second Wind', icon: '💚', description: `Regain 1d10+${level} HP`, type: 'resource', resource: 'Second Wind', rechargeOn: 'short' },
    ],
  },

  Barbarian: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '⚔', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Reckless or normal attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: 'rage', label: 'Rage', icon: '🔥', description: 'Enter a rage for 1 minute', type: 'resource', resource: 'Rage', rechargeOn: 'long' },
      { id: 'reckless', label: 'Reckless Attack', icon: '💥', description: 'Advantage on attack, enemies have advantage against you', type: 'toggle' },
    ],
  },

  Rogue: {
    actions: (level) => [
      { id: 'attack', label: 'Attack (Sneak?)', icon: '🗡', description: 'Attack — Sneak Attack applies if conditions met', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'hide', label: 'Hide', icon: '👁', description: 'DEX (Stealth) check to hide', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: 'cunning_dash', label: 'Cunning: Dash', icon: '💨', description: 'Dash as a bonus action', type: 'special' },
      { id: 'cunning_disengage', label: 'Cunning: Disengage', icon: '🏃', description: 'Disengage as a bonus action', type: 'special' },
      { id: 'cunning_hide', label: 'Cunning: Hide', icon: '👁', description: 'Hide as a bonus action', type: 'special' },
    ],
  },

  Wizard: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a leveled spell or cantrip', type: 'spell' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
    ],
    bonusActions: () => [
      { id: 'arcane_recovery', label: 'Arcane Recovery', icon: '🔮', description: 'Recover spell slots (once per long rest, on short rest)', type: 'resource', resource: 'Arcane Recovery', rechargeOn: 'long' },
    ],
  },

  Sorcerer: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a leveled spell or cantrip', type: 'spell' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
    ],
    bonusActions: (level) => [
      level >= 2 ? { id: 'metamagic', label: 'Metamagic', icon: '🌀', description: 'Modify a spell with sorcery points', type: 'resource', resource: 'Sorcery Points', rechargeOn: 'long' } : null,
    ].filter(Boolean),
  },

  Cleric: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a leveled spell or cantrip', type: 'spell' },
      { id: 'attack', label: 'Attack', icon: '⚔', description: 'Make a weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
      { id: 'help', label: 'Help', icon: '🤝', description: 'Give ally advantage on next check/attack', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: 'channel_divinity', label: 'Channel Divinity', icon: '☀', description: 'Turn Undead or domain ability', type: 'resource', resource: 'Channel Divinity', rechargeOn: 'short' },
    ],
  },

  Paladin: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '⚔', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Make a weapon attack', type: 'attack' },
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a leveled spell', type: 'spell' },
      { id: 'lay_on_hands', label: 'Lay on Hands', icon: '🖐', description: 'Restore HP from your pool (30 × level pts)', type: 'resource', resource: 'Lay on Hands', rechargeOn: 'long' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
    ],
    bonusActions: (level) => [
      { id: 'divine_smite', label: 'Divine Smite', icon: '⚡', description: 'Expend spell slot on hit for extra radiant damage', type: 'spell_trigger' },
      { id: 'channel_divinity', label: 'Channel Divinity', icon: '☀', description: 'Sacred Weapon or divine domain ability', type: 'resource', resource: 'Channel Divinity', rechargeOn: 'short' },
    ],
  },

  Ranger: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '🏹', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Make a weapon attack', type: 'attack' },
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a ranger spell', type: 'spell' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'hide', label: 'Hide', icon: '👁', description: 'DEX (Stealth) check to hide', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: "hunters_mark", label: "Hunter's Mark", icon: '🎯', description: 'Mark a target — +1d6 damage on attacks vs it', type: 'spell', spellLevel: 1 },
    ],
  },

  Monk: {
    actions: (level) => [
      { id: 'attack', label: 'Attack', icon: '👊', description: level >= 5 ? 'Attack twice (Extra Attack)' : 'Make an unarmed or monk weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
      { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
    ],
    bonusActions: (level, char) => {
      const ki = char?.resourcesUsed?.['Ki Points'] || 0;
      const kiMax = level >= 2 ? level : 0;
      return [
        level >= 2 ? { id: 'flurry', label: 'Flurry of Blows', icon: '👊👊', description: 'Spend 1 Ki: 2 unarmed strikes', type: 'resource', resource: 'Ki Points', rechargeOn: 'short' } : null,
        level >= 2 ? { id: 'patient_defense', label: 'Patient Defense', icon: '🛡', description: 'Spend 1 Ki: Dodge as bonus action', type: 'resource', resource: 'Ki Points', rechargeOn: 'short' } : null,
        level >= 2 ? { id: 'step_of_wind', label: 'Step of the Wind', icon: '💨', description: 'Spend 1 Ki: Dash or Disengage as bonus', type: 'resource', resource: 'Ki Points', rechargeOn: 'short' } : null,
      ].filter(Boolean);
    },
  },

  Bard: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '✨', description: 'Cast a bard spell or cantrip', type: 'spell' },
      { id: 'attack', label: 'Attack', icon: '⚔', description: 'Make a weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
      { id: 'help', label: 'Help', icon: '🤝', description: 'Give ally advantage on next check/attack', type: 'special' },
    ],
    bonusActions: (level) => [
      { id: 'bardic_inspiration', label: 'Bardic Inspiration', icon: '🎵', description: `Give ally a d${level < 5 ? 6 : level < 10 ? 8 : level < 15 ? 10 : 12} to add to a roll`, type: 'resource', resource: 'Bardic Inspiration', rechargeOn: level >= 5 ? 'short' : 'long' },
    ],
  },

  Druid: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell', icon: '🌿', description: 'Cast a druid spell or cantrip', type: 'spell' },
      { id: 'attack', label: 'Attack', icon: '⚔', description: 'Make a weapon attack', type: 'attack' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
    ],
    bonusActions: (level) => [
      level >= 2 ? { id: 'wild_shape', label: 'Wild Shape', icon: '🐺', description: 'Transform into a beast (CR ≤ level/4)', type: 'resource', resource: 'Wild Shape', rechargeOn: 'short' } : null,
    ].filter(Boolean),
  },

  Warlock: {
    actions: (level) => [
      { id: 'cast_spell', label: 'Cast Spell (Pact Magic)', icon: '🌑', description: 'Cast using Pact Magic slots (recharge on short rest)', type: 'spell' },
      { id: 'eldritch_blast', label: 'Eldritch Blast', icon: '💜', description: `${Math.max(1, Math.ceil(level / 5))}d10 force damage, ranged spell attack`, type: 'cantrip' },
      { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
    ],
    bonusActions: () => [
      { id: 'hex', label: 'Hex / Curse', icon: '🎭', description: 'Hex: bonus necrotic damage and disadvantage on ability checks', type: 'spell', spellLevel: 1 },
    ],
  },
};

// Fallback for unknown/generic class
const GENERIC_ACTIONS = {
  actions: () => [
    { id: 'attack', label: 'Attack', icon: '⚔', description: 'Make a weapon attack', type: 'attack' },
    { id: 'dash', label: 'Dash', icon: '💨', description: 'Move up to your speed again', type: 'dash' },
    { id: 'disengage', label: 'Disengage', icon: '🏃', description: "Movement won't provoke opportunity attacks", type: 'special' },
    { id: 'dodge', label: 'Dodge', icon: '🛡', description: 'Attacks against you have disadvantage', type: 'special' },
    { id: 'help', label: 'Help', icon: '🤝', description: 'Give ally advantage on next check/attack', type: 'special' },
    { id: 'hide', label: 'Hide', icon: '👁', description: 'DEX (Stealth) check to hide', type: 'special' },
  ],
  bonusActions: () => [],
};

// ─── ActionPanel component ─────────────────────────────────────────────────────

export default function ActionPanel({ combatant, onAttack, onSpell, onSpecial, style }) {
  const { useAction, useBonusAction, dashAction, encounter, sessionApiKey, addNarratorMessage, addEncounterLog } = useStore();
  const [activePanel, setActivePanel] = useState(null); // 'spell_select' | 'special_info'
  const [hoverDesc, setHoverDesc] = useState(null);

  if (!combatant) return null;

  const cls = combatant.class || '';
  const level = combatant.level || 1;
  const classDef = CLASS_ACTIONS[cls] || GENERIC_ACTIONS;

  const actions = classDef.actions(level, combatant);
  const bonusActions = classDef.bonusActions(level, combatant);

  const actionSpent = (combatant.actionsUsed || 0) >= 1;
  const bonusSpent = (combatant.bonusActionsUsed || 0) >= 1;
  const moveLeft = combatant.remainingMove ?? Math.floor((combatant.speed || 30) / 5);

  // Check if a resource is exhausted
  function resourceSpent(resourceName) {
    if (!resourceName) return false;
    const used = combatant.resourcesUsed?.[resourceName] || 0;
    // Simple check — resource is spent if used >= 1 for single-use resources
    // Full tracking would need class resource definitions
    return used >= 1;
  }

  function handleAction(action) {
    if (actionSpent && action.type !== 'cantrip') return;

    if (action.type === 'dash') {
      dashAction(combatant.id);
      addEncounterLog(`${combatant.name} dashes — movement doubled!`);
    } else if (action.type === 'attack') {
      useAction(combatant.id);
      onAttack?.(combatant);
    } else if (action.type === 'spell') {
      useAction(combatant.id);
      onSpell?.(combatant, action);
    } else if (action.type === 'cantrip') {
      useAction(combatant.id);
      onSpell?.(combatant, action);
    } else if (action.type === 'resource') {
      useAction(combatant.id);
      onSpecial?.(combatant, action);
    } else {
      useAction(combatant.id);
      onSpecial?.(combatant, action);
      addEncounterLog(`${combatant.name} uses ${action.label}.`);
    }
  }

  function handleBonusAction(action) {
    if (bonusSpent) return;
    useBonusAction(combatant.id);
    if (action.type === 'spell' || action.type === 'spell_trigger') {
      onSpell?.(combatant, action);
    } else {
      onSpecial?.(combatant, action);
      addEncounterLog(`${combatant.name} uses ${action.label} (bonus action).`);
    }
  }

  const btnBase = {
    width: '100%', padding: '7px 10px', borderRadius: 5, cursor: 'pointer',
    textAlign: 'left', fontSize: '0.82rem', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 7,
    transition: 'background 0.15s, opacity 0.15s',
    border: '1px solid',
  };

  function ActionBtn({ action, spent, onPress }) {
    const disabled = spent || (action.type === 'resource' && resourceSpent(action.resource));
    return (
      <button
        onClick={() => !disabled && onPress(action)}
        onMouseEnter={() => setHoverDesc(action.description)}
        onMouseLeave={() => setHoverDesc(null)}
        disabled={disabled}
        style={{
          ...btnBase,
          background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(212,175,55,0.08)',
          borderColor: disabled ? 'rgba(255,255,255,0.08)' : 'rgba(212,175,55,0.3)',
          color: disabled ? '#5a4a2a' : '#d4af37',
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <span style={{ fontSize: '1em', minWidth: 18 }}>{action.icon}</span>
        <span>{action.label}</span>
        {action.resource && (
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: disabled ? '#5a4a2a' : '#b8941f', background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>
            {resourceSpent(action.resource) ? 'SPENT' : 'Resource'}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {/* Movement indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: '0.75rem', color: moveLeft > 0 ? '#27ae60' : '#e74c3c' }}>🚶 Movement</span>
        <div style={{ flex: 1, height: 4, background: '#1a0f06', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${(moveLeft / Math.floor((combatant.speed || 30) / 5)) * 100}%`,
            background: moveLeft > 2 ? '#27ae60' : moveLeft > 0 ? '#e67e22' : '#e74c3c',
            transition: 'width 0.3s',
          }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: '#ccc', minWidth: 60 }}>
          {moveLeft * 5}ft / {combatant.speed || 30}ft
        </span>
      </div>

      {/* Actions */}
      <div>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: actionSpent ? '#5a4a2a' : '#d4af37', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚡ ACTION
          {actionSpent && <span style={{ fontSize: '0.65rem', color: '#e74c3c', fontWeight: 700 }}>SPENT</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {actions.map(action => (
            <ActionBtn key={action.id} action={action} spent={actionSpent && action.type !== 'cantrip'} onPress={handleAction} />
          ))}
        </div>
      </div>

      {/* Bonus Actions */}
      {bonusActions.length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: bonusSpent ? '#5a4a2a' : '#9b59b6', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✦ BONUS ACTION
            {bonusSpent && <span style={{ fontSize: '0.65rem', color: '#e74c3c', fontWeight: 700 }}>SPENT</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {bonusActions.map(action => (
              <ActionBtn
                key={action.id}
                action={{ ...action }}
                spent={bonusSpent}
                onPress={handleBonusAction}
              />
            ))}
          </div>
        </div>
      )}

      {/* Spell slots (for casters) */}
      {combatant.spellSlots && (
        <div>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: '#5b8fff', fontWeight: 700, marginBottom: 4 }}>
            🔮 SPELL SLOTS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(combatant.spellSlots).map(([lvl, slots]) => {
              if (!slots.total) return null;
              const available = slots.total - (slots.used || 0);
              return (
                <div key={lvl} style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
                  background: available > 0 ? 'rgba(91,143,255,0.12)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${available > 0 ? 'rgba(91,143,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: available > 0 ? '#5b8fff' : '#3a3a4a',
                }}>
                  {lvl === '1' ? '1st' : lvl === '2' ? '2nd' : lvl === '3' ? '3rd' : `${lvl}th`}: {available}/{slots.total}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hover description */}
      {hoverDesc && (
        <div style={{ padding: '5px 8px', background: 'rgba(0,0,0,0.5)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', color: '#aaa', fontStyle: 'italic' }}>
          {hoverDesc}
        </div>
      )}
    </div>
  );
}
