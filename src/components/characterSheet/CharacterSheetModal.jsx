import { s } from './charSheetStyles';
import EquipmentPane from './EquipmentPane';
import InventoryPane from './InventoryPane';
import useStore from '../../store/useStore';

export default function CharacterSheetModal({ character, onClose }) {
  const myCharacter = useStore(st => st.myCharacter);
  const equipItem   = useStore(st => st.equipItem);
  const encounter   = useStore(st => st.encounter);

  if (!character) return null;

  const isOwn = myCharacter?.id === character.id || myCharacter?.name === character.name;
  const inCombat = encounter.phase !== 'idle';

  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(character.name)}&backgroundColor=transparent`;

  function handleDropOnSlot(slotName, item) {
    if (!isOwn) return;
    equipItem(slotName, item);
  }

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <img src={avatarUrl} alt="" style={s.portrait}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
          <div style={s.headerInfo}>
            <div style={s.charName}>{character.name}</div>
            <div style={s.charSub}>
              Level {character.level || 1} {character.race} {character.class}
              {character.background ? ` · ${character.background}` : ''}
              {!isOwn ? ' (view only)' : ''}
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body: two panes */}
        <div style={s.body}>
          <EquipmentPane
            character={character}
            readOnly={!isOwn}
            onDropOnSlot={handleDropOnSlot}
          />
          <InventoryPane
            character={character}
            readOnly={!isOwn}
            inCombat={inCombat}
          />
        </div>
      </div>
    </div>
  );
}
