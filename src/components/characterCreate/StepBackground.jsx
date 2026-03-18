import { useState } from 'react';
import { CLASSES } from '../../data/classes';
import { BACKGROUNDS } from '../../lib/charBuilder';
import { s } from './charCreateStyles';

export default function StepBackground({ background, setBackground, skills, setSkills, cls }) {
  const clsData = cls ? CLASSES[cls] : null;
  const [hovered, setHovered] = useState(null);
  const bg = BACKGROUNDS.find(b => b.name === background);
  const preview = hovered ? BACKGROUNDS.find(b => b.name === hovered) : bg;

  const classSkillPool  = clsData?.skillChoices || [];
  const classSkillCount = clsData?.skillCount || 2;
  const bgSkills        = bg?.skills || [];

  function toggleSkill(skill) {
    if (bgSkills.includes(skill)) return;
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      const classSkillsCount = skills.filter(s => !bgSkills.includes(s)).length;
      if (classSkillsCount < classSkillCount) setSkills([...skills, skill]);
    }
  }

  return (
    <div style={s.stepLayout}>
      <div style={s.optionList}>
        {BACKGROUNDS.map(b => (
          <button
            key={b.name}
            style={{ ...s.optionBtn, ...(background === b.name ? s.optionBtnActive : {}) }}
            onClick={() => { setBackground(b.name); setSkills(b.skills); }}
            onMouseEnter={() => setHovered(b.name)}
            onMouseLeave={() => setHovered(null)}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div style={s.detailPanel}>
        {preview ? (
          <>
            <div style={s.detailTitle}>{preview.name}</div>
            <p style={s.detailDesc}>{preview.description}</p>
            <div style={s.traitHeader}>Background Skills</div>
            <div style={s.skillTagRow}>
              {preview.skills.map(sk => (
                <span key={sk} style={s.skillTagFixed}>{sk}</span>
              ))}
            </div>
            {background === preview.name && clsData && (
              <>
                <div style={{ ...s.traitHeader, marginTop: 12 }}>
                  Class Skills (choose {classSkillCount})
                </div>
                <div style={s.skillTagRow}>
                  {classSkillPool.map(sk => {
                    const isBg     = bgSkills.includes(sk);
                    const isChosen = skills.includes(sk) && !isBg;
                    return (
                      <button
                        key={sk}
                        style={{ ...s.skillTagBtn, ...(isChosen ? s.skillTagChosen : {}) }}
                        onClick={() => toggleSkill(sk)}
                        disabled={isBg}
                      >
                        {sk}
                      </button>
                    );
                  })}
                </div>
                <p style={s.nameHint}>
                  {skills.filter(s => !bgSkills.includes(s)).length}/{classSkillCount} chosen
                </p>
              </>
            )}
          </>
        ) : (
          <p style={s.detailPlaceholder}>Select a background to see its details.</p>
        )}
      </div>
    </div>
  );
}
