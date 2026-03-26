import { s } from './charSheetStyles';
import EquipmentPane from './EquipmentPane';
import InventoryPane from './InventoryPane';
import ModeScreen from '../../hud/ModeScreen';
import useStore from '../../store/useStore';

export default function CharacterSheetModal({ character, onClose }) {
  const myCharacter = useStore(st => st.myCharacter);
  const equipItem   = useStore(st => st.equipItem);
  const encounter   = useStore(st => st.encounter);

  if (!character) return null;

  const isOwn = myCharacter?.id === character.id || myCharacter?.name === character.name;
  // Use live store character for own sheet so equip/drop/use updates instantly without reopening
  const liveChar = isOwn ? (myCharacter ?? character) : character;
  const inCombat = encounter.phase !== 'idle';

  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(liveChar.name)}&backgroundColor=transparent`;

  function handleDropOnSlot(slotName, item) {
    if (!isOwn) return;
    equipItem(slotName, item);
  }

  return (
    <ModeScreen open={true} onClose={onClose} title="Character Record">
      {/* Header */}
      <div style={s.header}>
        <img src={avatarUrl} alt="" style={s.portrait}
          onError={e => { e.currentTarget.style.display = 'none'; }} />
        <div style={s.headerInfo}>
          <div style={s.charName}>{liveChar.name}</div>
          <div style={s.charSub}>
            Level {liveChar.level || 1} {liveChar.race} {liveChar.class}
            {liveChar.background ? ` · ${liveChar.background}` : ''}
            {!isOwn ? ' (view only)' : ''}
          </div>
        </div>
      </div>

      {/* Body: equipment + inventory (inventory hidden for other players) */}
      <div style={s.body}>
        <EquipmentPane
          character={liveChar}
          readOnly={!isOwn}
          onDropOnSlot={handleDropOnSlot}
        />
        {isOwn && (
          <InventoryPane
            character={liveChar}
            readOnly={false}
            inCombat={inCombat}
          />
        )}
      </div>
    </ModeScreen>
  );
}
