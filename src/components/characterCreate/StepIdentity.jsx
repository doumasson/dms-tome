import { useState } from 'react';
import { ALIGNMENT_OPTIONS, avatarUrl } from '../../lib/charBuilder';
import { s } from './charCreateStyles';
import PortraitPickerModal from '../PortraitPickerModal';

const ALIGNMENT_TIPS = {
  'Lawful Good': 'Follows a code of honor and acts for the greater good.',
  'Neutral Good': 'Does the best they can without bias toward law or chaos.',
  'Chaotic Good': 'Acts on conscience, with little regard for rules.',
  'Lawful Neutral': 'Acts in accordance with law, tradition, or personal code.',
  'True Neutral': 'Acts without prejudice or compulsion.',
  'Chaotic Neutral': 'Follows their whims above all else.',
  'Lawful Evil': 'Methodically takes what they want within a code of conduct.',
  'Neutral Evil': 'Does whatever they can get away with.',
  'Chaotic Evil': 'Acts with arbitrary violence, driven by greed and hate.',
};

export default function StepIdentity({ name, setName, alignment, setAlignment, appearance, setAppearance, backstory, setBackstory, race, cls, portrait, setPortrait }) {
  const [showPicker, setShowPicker] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
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
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX + 12, y: e.clientY - 30 })}
                  onMouseEnter={() => setTooltip(ALIGNMENT_TIPS[a])}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {a}
                </button>
              ))}
            </div>
            {tooltip && (
              <div style={{
                position: 'fixed',
                left: tooltipPos.x,
                top: tooltipPos.y,
                background: 'rgba(10,8,6,0.95)',
                border: '1px solid rgba(201,168,76,0.3)',
                padding: '6px 10px',
                color: '#bba878',
                fontSize: 11,
                maxWidth: 220,
                pointerEvents: 'none',
                zIndex: 1000,
                borderRadius: 4,
                lineHeight: 1.4,
              }}>
                {tooltip}
              </div>
            )}
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
