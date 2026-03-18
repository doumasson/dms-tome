import { useState } from 'react';
import { s } from './charSheetStyles';
import useStore from '../../store/useStore';
import { getSlotType } from '../../data/equipment';

const SLOT_LABELS = {
  mainHand: 'Main Hand', offHand: 'Off Hand', chest: 'Chest',
  head: 'Head', hands: 'Hands', feet: 'Feet', neck: 'Neck',
  ring1: 'Ring 1', ring2: 'Ring 2',
};

function itemIcon(item) {
  if (item.icon) return item.icon;
  if (item.type === 'consumable') return '🧪';
  if (item.type === 'gear') return '🎒';
  if (item.armorType === 'shield') return '🛡';
  if (item.baseAC !== undefined) return '🥋';
  if (item.category?.includes('ranged')) return '🏹';
  if (item.damage !== undefined) return '⚔';
  return '📦';
}

function itemSubtext(item) {
  if (item.type === 'consumable') return item.description || '';
  if (item.damage) return `${item.damage} ${item.damageType}${item.properties?.length ? ' · ' + item.properties.join(', ') : ''}`;
  if (item.baseAC) return `AC ${item.baseAC}${item.addDex ? ' + DEX' : ''}${item.maxDex != null ? ` (max +${item.maxDex})` : ''}`;
  return item.description || '';
}

export default function InventoryPane({ character, readOnly, inCombat }) {
  const myCharacter = useStore(st => st.myCharacter);
  const equipItem = useStore(st => st.equipItem);
  const removeItemFromInventory = useStore(st => st.removeItemFromInventory);
  const useItem = useStore(st => st.useItem);
  const [dragOver, setDragOver] = useState(null);
  const [justUsed, setJustUsed] = useState(null);

  const isOwn = !readOnly && myCharacter?.id === character.id;
  const inventory = character.inventory || [];
  const gold = character.gold || 0;

  function handleUse(item) {
    if (!isOwn) return;
    useItem(item.instanceId);
    setJustUsed(item.instanceId);
    setTimeout(() => setJustUsed(null), 1200);
  }

  function handleDrop(item) {
    if (!isOwn) return;
    removeItemFromInventory(item.instanceId);
  }

  function handleEquip(item) {
    if (!isOwn) return;
    const slot = getSlotType(item);
    if (slot && slot !== 'consumable' && slot !== 'misc') {
      equipItem(slot, item);
    }
  }

  const canEquip = (item) => {
    const slot = getSlotType(item);
    return !!slot && slot !== 'consumable' && slot !== 'misc';
  };

  return (
    <div style={s.rightPane}>
      {/* Header */}
      <div style={s.invHeader}>
        <div style={s.sectionTitle}>Inventory</div>
        <div style={s.goldBadge}>🪙 {gold} gp</div>
      </div>

      {/* Item list */}
      <div style={s.invList}>
        {inventory.length === 0 && (
          <div style={s.emptyInv}>Your pack is empty.</div>
        )}

        {inventory.map(item => {
          const used = justUsed === item.instanceId;
          return (
            <div
              key={item.instanceId}
              draggable={isOwn}
              onDragStart={e => {
                e.dataTransfer.setData('application/json', JSON.stringify(item));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => setDragOver(null)}
              style={{
                ...s.invItem,
                ...(dragOver === item.instanceId ? s.invItemDragging : {}),
                opacity: used ? 0.5 : 1,
              }}
              onDragOver={() => setDragOver(item.instanceId)}
              onDragLeave={() => setDragOver(null)}
            >
              <span style={s.invItemIcon}>{itemIcon(item)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.invItemName}>{item.name}{(item.quantity || 1) > 1 ? ` ×${item.quantity}` : ''}</div>
                <div style={s.invItemDesc}>{itemSubtext(item)}</div>
              </div>
              {isOwn && (
                <div style={s.invActions}>
                  {canEquip(item) && (
                    <button style={s.equipBtn} onClick={() => handleEquip(item)} title={`Equip to ${SLOT_LABELS[getSlotType(item)]}`}>
                      Equip
                    </button>
                  )}
                  {(item.type === 'consumable') && (
                    <button
                      style={{ ...s.useBtn, opacity: inCombat ? 0.5 : 1 }}
                      onClick={() => handleUse(item)}
                      title={inCombat ? 'Use as action during your turn' : 'Use item'}
                    >
                      {used ? '✓' : 'Use'}
                    </button>
                  )}
                  <button style={s.dropBtn} onClick={() => handleDrop(item)} title="Drop item">
                    Drop
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isOwn && (
        <div style={s.dropZoneHint}>
          Drag a weapon or armor to an equipment slot on the left to equip it.
        </div>
      )}
    </div>
  );
}
