import { useState } from 'react';
import useStore from '../store/useStore';
import { CLASS_ACTIONS, GENERIC_ACTIONS } from '../lib/classActions';

export default function ActionPanel({ combatant, onAttack, onSpell, onSpecial, style }) {
  const { useAction, useBonusAction, dashAction, encounter, sessionApiKey, addNarratorMessage, addEncounterLog } = useStore();
  const useItem = useStore(s => s.useItem);
  const myCharacter = useStore(s => s.myCharacter);
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

      {/* Consumable items from inventory */}
      {(() => {
        const isOwn = myCharacter && (myCharacter.id === combatant.id || myCharacter.name === combatant.name);
        const items = isOwn ? (myCharacter.inventory || []).filter(i => i.type === 'consumable') : [];
        if (!isOwn || items.length === 0) return null;
        return (
          <div>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: '#e09040', fontWeight: 700, marginBottom: 4 }}>
              🎒 USE ITEM (Action)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {items.map(item => (
                <button
                  key={item.instanceId}
                  disabled={actionSpent}
                  onClick={() => {
                    if (actionSpent) return;
                    useAction(combatant.id);
                    useItem(item.instanceId);
                    addEncounterLog(`${combatant.name} uses ${item.name}.`);
                  }}
                  style={{
                    ...btnBase,
                    background: actionSpent ? 'rgba(255,255,255,0.02)' : 'rgba(224,144,64,0.08)',
                    borderColor: actionSpent ? 'rgba(255,255,255,0.08)' : 'rgba(224,144,64,0.3)',
                    color: actionSpent ? '#5a4a2a' : '#e09040',
                    opacity: actionSpent ? 0.45 : 1,
                  }}
                >
                  <span style={{ fontSize: '1em', minWidth: 18 }}>{item.icon || '🧪'}</span>
                  <span>{item.name}{(item.quantity || 1) > 1 ? ` ×${item.quantity}` : ''}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: actionSpent ? '#5a4a2a' : '#b87030', background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>
                    {item.description?.slice(0, 28) || 'Use'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Hover description */}
      {hoverDesc && (
        <div style={{ padding: '5px 8px', background: 'rgba(0,0,0,0.5)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', color: '#aaa', fontStyle: 'italic' }}>
          {hoverDesc}
        </div>
      )}
    </div>
  );
}
