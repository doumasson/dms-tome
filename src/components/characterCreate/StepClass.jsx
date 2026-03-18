import { useState } from 'react';
import { CLASSES, CLASS_NAMES } from '../../data/classes';
import { s } from './charCreateStyles';

export default function StepClass({ cls, setCls }) {
  const [hovered, setHovered] = useState(null);
  const selected = cls ? CLASSES[cls] : null;
  const preview = hovered ? CLASSES[hovered] : selected;

  return (
    <div style={s.stepLayout}>
      <div style={s.optionList}>
        {CLASS_NAMES.map(name => (
          <button
            key={name}
            style={{ ...s.optionBtn, ...(cls === name ? s.optionBtnActive : {}) }}
            onClick={() => setCls(name)}
            onMouseEnter={() => setHovered(name)}
            onMouseLeave={() => setHovered(null)}
          >
            {name}
          </button>
        ))}
      </div>

      <div style={s.detailPanel}>
        {preview ? (
          <>
            <div style={s.detailTitle}>{preview.name}</div>
            <div style={s.classMetaRow}>
              <span style={s.classMeta}>d{preview.hitDie} Hit Die</span>
              <span style={s.classMeta}>Primary: {preview.primaryAbility}</span>
              <span style={s.classMeta}>Saves: {preview.savingThrows.join(', ')}</span>
            </div>
            {preview.castingType && (
              <div style={s.castingBadge}>
                {preview.castingType === 'warlock' ? '✦ Pact Magic' : `✦ ${preview.castingType} caster`}
                {preview.spellAbility && ` (${preview.spellAbility})`}
              </div>
            )}
            <div style={s.traitHeader}>Level 1 Features</div>
            {(preview.features[1] || []).map(f => (
              <div key={f} style={s.traitItem}>
                <span style={s.traitName}>{f}</span>
              </div>
            ))}
            <div style={{ ...s.traitHeader, marginTop: 12 }}>Armor & Weapons</div>
            <div style={s.traitItem}>
              <span style={s.traitDesc}>
                Armor: {preview.armorProficiencies.join(', ') || 'None'} ·{' '}
                Weapons: {preview.weaponProficiencies.join(', ')}
              </span>
            </div>
            <div style={{ ...s.traitHeader, marginTop: 12 }}>Starting Equipment</div>
            {preview.startingEquipment.map((e, i) => (
              <div key={i} style={{ ...s.traitItem, fontSize: '0.72rem' }}>• {e}</div>
            ))}
          </>
        ) : (
          <p style={s.detailPlaceholder}>Select a class to see its features.</p>
        )}
      </div>
    </div>
  );
}
