import { useState } from 'react';
import { getRace, getBaseRaces, getSubraces } from '../../data/races';
import { STAT_LABELS } from '../../lib/charBuilder';
import { s } from './charCreateStyles';

const RACE_ICONS = {
  Dwarf: '⛏', Elf: '🌙', Halfling: '🍀', Human: '⚜',
  Dragonborn: '🐉', Gnome: '⚙', 'Half-Elf': '✦', 'Half-Orc': '🗡', Tiefling: '🔥',
};

export default function StepRace({ race, setRace }) {
  const bases = getBaseRaces();
  const [hovered, setHovered] = useState(null);

  const previewKey = hovered || race;
  const preview    = previewKey ? getRace(previewKey) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Race card grid */}
      <div style={s.cardGrid}>
        {bases.map(r => {
          const subraces   = getSubraces(r.baseName);
          const parentSel  = race === r.name;
          const subSel     = subraces.some(sr => sr.name === race);
          const anyActive  = parentSel || subSel;
          const isHov      = hovered === r.name;

          if (subraces.length === 0) {
            return (
              <button
                key={r.name}
                style={{
                  ...s.optionCard,
                  ...(isHov ? s.optionCardHover : {}),
                  ...(parentSel ? s.optionCardSelected : {}),
                }}
                onClick={() => setRace(r.name)}
                onMouseEnter={() => setHovered(r.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <span style={s.optionCardIcon}>{RACE_ICONS[r.name] || '🧙'}</span>
                <span style={s.optionCardName}>{r.name}</span>
                <span style={s.optionCardMeta}>
                  {Object.entries(r.statBonuses || {}).map(([k, v]) => `${STAT_LABELS[k]} +${v}`).join(' · ') || 'Versatile'}
                </span>
              </button>
            );
          }

          // Race with subraces: show parent card + sub-cards below
          return (
            <div key={r.name} style={{ gridColumn: '1 / -1' }}>
              {/* Parent row label */}
              <div style={parentRowStyle}>
                <span style={raceGroupLabel}>{RACE_ICONS[r.name] || '🧙'} {r.name}</span>
                <div style={{ ...s.subraceIndent, paddingLeft: 0, marginTop: 6 }}>
                  {subraces.map(sr => (
                    <button
                      key={sr.name}
                      style={{
                        ...s.subraceCard,
                        ...(hovered === sr.name ? { ...s.optionCardHover, borderRadius: 8 } : {}),
                        ...(race === sr.name ? s.subraceCardSelected : {}),
                      }}
                      onClick={() => setRace(sr.name)}
                      onMouseEnter={() => setHovered(sr.name)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <span style={s.optionCardIcon}>{RACE_ICONS[r.name] || '🧙'}</span>
                      <span style={s.subraceCardName}>{sr.subrace || sr.name.replace(r.name, '').trim()}</span>
                      <span style={s.optionCardMeta}>
                        {Object.entries(sr.statBonuses || {}).map(([k, v]) => `${STAT_LABELS[k]} +${v}`).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {preview && (
        <div style={s.detailPanel}>
          <div style={s.detailTitle}>{preview.name}</div>
          <div style={s.statBonusRow}>
            {Object.entries(preview.statBonuses || {}).map(([k, v]) => (
              <span key={k} style={s.statBonusBadge}>{STAT_LABELS[k]} +{v}</span>
            ))}
            {preview.flexibleBonusCount && (
              <span style={s.statBonusBadge}>Any +1 ×{preview.flexibleBonusCount}</span>
            )}
          </div>
          <p style={s.detailDesc}>{preview.description}</p>
          <div style={s.traitList}>
            <div style={s.traitHeader}>Speed {preview.speed}ft · {preview.size}{preview.darkvision ? ` · Darkvision ${preview.darkvision}ft` : ''}</div>
            {(preview.traits || []).map(t => (
              <div key={t.name} style={s.traitItem}>
                <span style={s.traitName}>{t.name}.</span>{' '}
                <span style={s.traitDesc}>{t.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!preview && (
        <div style={s.detailPanel}>
          <p style={s.detailPlaceholder}>Select a race to see its traits and abilities.</p>
        </div>
      )}
    </div>
  );
}

const parentRowStyle = {
  padding: '8px 0 4px',
};

const raceGroupLabel = {
  fontFamily: "'Cinzel', Georgia, serif",
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'rgba(200,180,140,0.4)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};
