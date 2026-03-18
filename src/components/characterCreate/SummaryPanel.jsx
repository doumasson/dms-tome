import { CLASSES } from '../../data/classes';
import { getRace } from '../../data/races';
import { STAT_KEYS, STAT_LABELS, statMod, calcHp, calcAc } from '../../lib/charBuilder';
import { s } from './charCreateStyles';

export default function SummaryPanel({ name, race, cls, background, finalStats, skills }) {
  const clsData  = cls ? CLASSES[cls] : null;
  const hp       = clsData ? calcHp(clsData, finalStats.con) : 0;
  const ac       = clsData ? calcAc(clsData, finalStats.dex) : 10;
  const raceData = getRace(race);

  return (
    <div style={s.summaryPanel}>
      <div style={s.summaryTitle}>{name || '—'}</div>
      <div style={s.summarySubtitle}>{[race, cls, background].filter(Boolean).join(' · ')}</div>

      <div style={s.summaryStatRow}>
        {STAT_KEYS.map(k => (
          <div key={k} style={s.summaryStatBlock}>
            <div style={s.summaryStatLabel}>{STAT_LABELS[k]}</div>
            <div style={s.summaryStatVal}>{finalStats[k]}</div>
            <div style={s.summaryStatMod}>{statMod(finalStats[k])}</div>
          </div>
        ))}
      </div>

      <div style={s.summaryInfoRow}>
        {clsData && (
          <>
            <span style={s.summaryInfoItem}>♥ {hp} HP</span>
            <span style={s.summaryInfoItem}>🛡 AC {ac}</span>
            <span style={s.summaryInfoItem}>⚡ {raceData?.speed || 30}ft</span>
            <span style={s.summaryInfoItem}>d{clsData.hitDie} HD</span>
          </>
        )}
      </div>

      {skills.length > 0 && (
        <div style={s.summarySkills}>
          {skills.map(sk => <span key={sk} style={s.summarySkillBadge}>{sk}</span>)}
        </div>
      )}
    </div>
  );
}
