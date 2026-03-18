import { useState } from 'react';
import { CLASSES } from '../../data/classes';
import { BACKGROUNDS } from '../../lib/charBuilder';
import { s } from './charCreateStyles';

const BG_ICONS = {
  Acolyte: '✙', Criminal: '🗡', 'Folk Hero': '🌾', Noble: '👑',
  Sage: '📖', Soldier: '⚔', Outlander: '🏕', Charlatan: '🎭',
  Entertainer: '🎵', Guild: '⚙',
};

export default function StepBackground({ background, setBackground, skills, setSkills, cls }) {
  const clsData         = cls ? CLASSES[cls] : null;
  const [hovered, setHovered] = useState(null);
  const bg       = BACKGROUNDS.find(b => b.name === background);
  const preview  = hovered ? BACKGROUNDS.find(b => b.name === hovered) : bg;

  const classSkillPool  = clsData?.skillChoices || [];
  const classSkillCount = clsData?.skillCount   || 2;
  const bgSkills        = bg?.skills || [];

  function toggleSkill(skill) {
    if (bgSkills.includes(skill)) return;
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      const classCount = skills.filter(s => !bgSkills.includes(s)).length;
      if (classCount < classSkillCount) setSkills([...skills, skill]);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Background card grid */}
      <div style={{ ...s.cardGrid, gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
        {BACKGROUNDS.map(b => {
          const isSel = background === b.name;
          const isHov = hovered === b.name;
          return (
            <button
              key={b.name}
              style={{
                ...s.optionCard,
                ...(isHov && !isSel ? s.optionCardHover : {}),
                ...(isSel ? s.optionCardSelected : {}),
              }}
              onClick={() => { setBackground(b.name); setSkills(b.skills); }}
              onMouseEnter={() => setHovered(b.name)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={s.optionCardIcon}>{BG_ICONS[b.name] || '📜'}</span>
              <span style={s.optionCardName}>{b.name}</span>
              <span style={s.optionCardMeta}>{b.skills.join(' · ')}</span>
            </button>
          );
        })}
      </div>

      {/* Detail + skill selection */}
      {preview ? (
        <div style={s.detailPanel}>
          <div style={s.detailTitle}>{preview.name}</div>
          <p style={s.detailDesc}>{preview.description}</p>

          <div style={s.traitHeader}>Background Skills (auto-granted)</div>
          <div style={{ ...s.skillTagRow, marginBottom: 12 }}>
            {preview.skills.map(sk => (
              <span key={sk} style={s.skillTagFixed}>{sk}</span>
            ))}
          </div>

          {background === preview.name && clsData && (
            <>
              <div style={s.traitHeader}>
                Class Skills — choose {classSkillCount}
                <span style={{ color: 'rgba(212,175,55,0.5)', fontWeight: 400 }}>
                  {' '}({skills.filter(sk => !bgSkills.includes(sk)).length}/{classSkillCount} chosen)
                </span>
              </div>
              <div style={s.skillTagRow}>
                {classSkillPool.map(sk => {
                  const isBg     = bgSkills.includes(sk);
                  const isChosen = skills.includes(sk) && !isBg;
                  return (
                    <button
                      key={sk}
                      style={{ ...s.skillTagBtn, ...(isChosen ? s.skillTagChosen : {}), ...(isBg ? { opacity: 0.3, cursor: 'default' } : {}) }}
                      onClick={() => toggleSkill(sk)}
                      disabled={isBg}
                    >
                      {sk}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={s.detailPanel}>
          <p style={s.detailPlaceholder}>Select a background to see its skills and description.</p>
        </div>
      )}
    </div>
  );
}
