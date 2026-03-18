import { useState } from 'react';
import { s } from './charSheetStyles';
import useStore from '../../store/useStore';
import { getSlotType } from '../../data/equipment';
import InventoryGrid from './InventoryGrid';

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
    <div style={{ ...s.rightPane, overflowX: 'auto' }}>
      {/* Header */}
      <div style={s.invHeader}>
        <div style={s.sectionTitle}>Inventory</div>
        <div style={s.goldBadge}>🪙 {gold} gp</div>
      </div>

      {inventory.length === 0 ? (
        <div style={s.emptyInv}>Your pack is empty.</div>
      ) : (
        <InventoryGrid
          character={character}
          isOwn={isOwn}
          onEquip={handleEquip}
          onDrop={handleDrop}
          onUse={handleUse}
        />
      )}
    </div>
  );
}
