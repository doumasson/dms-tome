import { useState } from 'react';
import { CLASSES, CLASS_NAMES } from '../../data/classes';
import { s } from './charCreateStyles';

const CLASS_ICONS = {
  Barbarian: '🪓', Bard: '🎵', Cleric: '✙', Druid: '🌿',
  Fighter: '⚔', Monk: '👊', Paladin: '🛡', Ranger: '🏹',
  Rogue: '🗝', Sorcerer: '✨', Warlock: '🌑', Wizard: '📖',
};

const CLASS_FLAVOR = {
  Barbarian: 'Rage & raw power',
  Bard:      'Magic through music',
  Cleric:    'Divine warrior-priest',
  Druid:     'Nature\'s guardian',
  Fighter:   'Master of combat',
  Monk:      'Martial arts & ki',
  Paladin:   'Sacred oath warrior',
  Ranger:    'Hunter & tracker',
  Rogue:     'Stealth & cunning',
  Sorcerer:  'Innate arcane magic',
  Warlock:   'Pact with a patron',
  Wizard:    'Studied arcane master',
};

export default function StepClass({ cls, setCls }) {
  const [hovered, setHovered] = useState(null);
  const previewKey = hovered || cls;
  const preview    = previewKey ? CLASSES[previewKey] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Class card grid */}
      <div style={s.cardGrid}>
        {CLASS_NAMES.map(name => {
          const data   = CLASSES[name];
          const isSel  = cls === name;
          const isHov  = hovered === name;
          return (
            <button
              key={name}
              style={{
                ...s.optionCard,
                ...(isHov && !isSel ? s.optionCardHover : {}),
                ...(isSel ? s.optionCardSelected : {}),
              }}
              onClick={() => setCls(name)}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={s.optionCardIcon}>{CLASS_ICONS[name] || '⚔'}</span>
              <span style={s.optionCardName}>{name}</span>
              <span style={s.optionCardMeta}>d{data.hitDie} · {CLASS_FLAVOR[name]}</span>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {preview ? (
        <div style={s.detailPanel}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
            <div style={s.detailTitle}>{preview.name}</div>
          </div>
          <div style={s.classMetaRow}>
            <span style={s.classMeta}>Hit Die: d{preview.hitDie}</span>
            <span style={s.classMeta}>Primary: {preview.primaryAbility}</span>
            <span style={s.classMeta}>Saves: {preview.savingThrows.join(', ')}</span>
          </div>
          {preview.castingType && (
            <div style={s.castingBadge}>
              {preview.castingType === 'warlock' ? '✦ Pact Magic' : `✦ ${preview.castingType} caster`}
              {preview.spellAbility && ` (${preview.spellAbility})`}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
            <div>
              <div style={s.traitHeader}>Level 1 Features</div>
              {(preview.features[1] || []).map(f => (
                <div key={f} style={s.traitItem}>• {f}</div>
              ))}
            </div>
            <div>
              <div style={s.traitHeader}>Proficiencies</div>
              <div style={s.traitItem}>Armor: {preview.armorProficiencies.join(', ') || 'None'}</div>
              <div style={s.traitItem}>Weapons: {preview.weaponProficiencies.join(', ')}</div>
              <div style={{ ...s.traitHeader, marginTop: 10 }}>Starting Equipment</div>
              {(preview.startingEquipment || []).map((e, i) => (
                <div key={i} style={{ ...s.traitItem, marginBottom: 2 }}>• {e}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={s.detailPanel}>
          <p style={s.detailPlaceholder}>Select a class to see its features and abilities.</p>
        </div>
      )}
    </div>
  );
}
