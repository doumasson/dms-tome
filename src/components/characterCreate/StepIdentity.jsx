import { ALIGNMENT_OPTIONS, avatarUrl } from '../../lib/charBuilder';
import { s } from './charCreateStyles';

export default function StepIdentity({ name, setName, alignment, setAlignment, appearance, setAppearance, backstory, setBackstory, race, cls }) {
  const seed   = name.trim() || `${race} ${cls}`;
  const avatar = avatarUrl(seed, race, cls);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={s.identityRow}>
        <img src={avatar} alt="Avatar" style={s.avatarPreview} />
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
