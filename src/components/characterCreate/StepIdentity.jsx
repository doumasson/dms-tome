import { useState } from 'react';
import { ALIGNMENT_OPTIONS, avatarUrl } from '../../lib/charBuilder';
import { s } from './charCreateStyles';
import PortraitPickerModal from '../PortraitPickerModal';

export default function StepIdentity({ name, setName, alignment, setAlignment, appearance, setAppearance, backstory, setBackstory, race, cls, portrait, setPortrait }) {
  const [showPicker, setShowPicker] = useState(false);
  const seed   = name.trim() || `${race} ${cls}`;
  const avatar = avatarUrl(seed, race, cls);
  const imgSrc = portrait || avatar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showPicker && (
        <PortraitPickerModal
          race={race}
          cls={cls}
          currentPortrait={portrait}
          onSelect={url => { setPortrait(url); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
      <div style={s.identityRow}>
        <div
          onClick={() => setShowPicker(true)}
          style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
          title="Choose Portrait"
        >
          <img src={imgSrc} alt="Avatar" style={s.avatarPreview} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.65)',
            color: '#d4af37',
            fontSize: 10,
            textAlign: 'center',
            padding: '3px 0',
            letterSpacing: '0.05em',
            borderBottomLeftRadius: s.avatarPreview?.borderRadius,
            borderBottomRightRadius: s.avatarPreview?.borderRadius,
          }}>
            Choose Portrait
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={s.fieldLabel}>Character Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Thorin Stoneback"
              style={s.fieldInput}
            />
          </div>
          <div>
            <label style={s.fieldLabel}>Alignment</label>
            <div style={s.alignGrid}>
              {ALIGNMENT_OPTIONS.map(a => (
                <button
                  key={a}
                  style={{ ...s.alignBtn, ...(alignment === a ? s.alignBtnActive : {}) }}
                  onClick={() => setAlignment(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label style={s.fieldLabel}>Appearance <span style={{ opacity: 0.5 }}>(optional)</span></label>
        <textarea
          value={appearance}
          onChange={e => setAppearance(e.target.value)}
          placeholder="Describe how your character looks..."
          style={{ ...s.fieldInput, ...s.fieldTextarea }}
          rows={2}
        />
      </div>

      <div>
        <label style={s.fieldLabel}>Backstory <span style={{ opacity: 0.5 }}>(optional)</span></label>
        <textarea
          value={backstory}
          onChange={e => setBackstory(e.target.value)}
          placeholder="Brief history — where are you from, why are you adventuring?"
          style={{ ...s.fieldInput, ...s.fieldTextarea }}
          rows={3}
        />
      </div>
    </div>
  );
}
