import { useState } from 'react';
import { getRace, getBaseRaces, getSubraces } from '../../data/races';
import { STAT_LABELS } from '../../lib/charBuilder';
import { s } from './charCreateStyles';

export default function StepRace({ race, setRace }) {
  const bases = getBaseRaces();
  const [hoveredRace, setHoveredRace] = useState(null);
  const selected = getRace(race);
  const preview = hoveredRace ? getRace(hoveredRace) : selected;

  return (
    <div style={s.stepLayout}>
      <div style={s.optionList}>
        {bases.map(r => {
          const subraces = getSubraces(r.baseName);
          const isSelected = race === r.name || subraces.some(sr => sr.name === race);
          return (
            <div key={r.name}>
              <button
                style={{ ...s.optionBtn, ...(isSelected && !subraces.some(sr => sr.name === race) && race === r.name ? s.optionBtnActive : {}), ...(isSelected ? s.optionBtnGroupActive : {}) }}
                onClick={() => setRace(r.name)}
                onMouseEnter={() => setHoveredRace(r.name)}
                onMouseLeave={() => setHoveredRace(null)}
              >
                {r.name}
              </button>
              {subraces.length > 0 && (
                <div style={s.subraceList}>
                  {subraces.map(sr => (
                    <button
                      key={sr.name}
                      style={{ ...s.optionBtn, ...s.subraceBtn, ...(race === sr.name ? s.optionBtnActive : {}) }}
                      onClick={() => setRace(sr.name)}
                      onMouseEnter={() => setHoveredRace(sr.name)}
                      onMouseLeave={() => setHoveredRace(null)}
                    >
                      {sr.subrace}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={s.detailPanel}>
        {preview ? (
          <>
            <div style={s.detailTitle}>{preview.name}</div>
            <p style={s.detailDesc}>{preview.description}</p>
            <div style={s.statBonusRow}>
              {Object.entries(preview.statBonuses).map(([k, v]) => (
                <span key={k} style={s.statBonusBadge}>{STAT_LABELS[k]} +{v}</span>
              ))}
              {preview.flexibleBonusCount && (
                <span style={s.statBonusBadge}>Any +1 ×{preview.flexibleBonusCount}</span>
              )}
            </div>
            <div style={s.traitList}>
              <div style={s.traitHeader}>Speed {preview.speed}ft · {preview.size}</div>
              {preview.darkvision && <div style={s.traitHeader}>Darkvision {preview.darkvision}ft</div>}
              {preview.traits.map(t => (
                <div key={t.name} style={s.traitItem}>
                  <span style={s.traitName}>{t.name}.</span>{' '}
                  <span style={s.traitDesc}>{t.description}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={s.detailPlaceholder}>Select a race to see its traits.</p>
        )}
      </div>
    </div>
  );
}
