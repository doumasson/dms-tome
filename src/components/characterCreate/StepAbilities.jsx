import { useState } from 'react';
import { getRace, applyRacialBonuses } from '../../data/races';
import { STANDARD_ARRAY, STAT_KEYS, STAT_LABELS, STAT_FULL, statMod } from '../../lib/charBuilder';
import { s } from './charCreateStyles';

export default function StepAbilities({ race, baseStats, setBaseStats, method, setMethod, flexChoices, setFlexChoices }) {
  const raceData   = getRace(race);
  const finalStats = raceData ? applyRacialBonuses(baseStats, race, flexChoices) : baseStats;
  const [assignTarget, setAssignTarget] = useState(null);

  function assignStandard(val) {
    if (!assignTarget) return;
    setBaseStats({ ...baseStats, [assignTarget]: val });
    setAssignTarget(null);
  }

  function rollStats() {
    const newStats = {};
    STAT_KEYS.forEach(k => {
      const dice = [1,2,3,4].map(() => Math.ceil(Math.random() * 6));
      dice.sort((a, b) => b - a);
      newStats[k] = dice.slice(0, 3).reduce((a, b) => a + b, 0);
    });
    setBaseStats(newStats);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Method selector */}
      <div style={s.methodRow}>
        {['standard', 'rolled'].map(m => (
          <button
            key={m}
            style={{ ...s.methodBtn, ...(method === m ? s.methodBtnActive : {}) }}
            onClick={() => { setMethod(m); if (m === 'standard') setBaseStats({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }); }}
          >
            {m === 'standard' ? 'Standard Array' : '4d6 Drop Lowest'}
          </button>
        ))}
        {method === 'rolled' && (
          <button style={s.rollDiceBtn} onClick={rollStats}>🎲 Roll!</button>
        )}
      </div>

      {/* Standard array picker */}
      {method === 'standard' && (
        <div style={s.standardRow}>
          {STANDARD_ARRAY.map((val, i) => {
            const usedBy = Object.entries(baseStats).find(([, v]) => v === val)?.[0];
            return (
              <button
                key={i}
                style={{ ...s.arrayValBtn, ...(assignTarget && !usedBy ? s.arrayValBtnAvail : {}), ...(usedBy ? s.arrayValBtnUsed : {}) }}
                onClick={() => assignTarget && !usedBy ? assignStandard(val) : null}
              >
                {val}
                {usedBy && <div style={s.arrayValUsedLabel}>{STAT_LABELS[usedBy]}</div>}
              </button>
            );
          })}
        </div>
      )}

      {/* Stat grid */}
      <div style={s.statGrid}>
        {STAT_KEYS.map(k => {
          const base  = baseStats[k];
          const final = finalStats[k];
          const bonus = final - base;
          const isTarget = assignTarget === k;
          return (
            <button
              key={k}
              style={{ ...s.statBlock, ...(isTarget ? s.statBlockTarget : {}) }}
              onClick={() => method === 'standard' ? setAssignTarget(isTarget ? null : k) : null}
              title={STAT_FULL[k]}
            >
              <div style={s.statBlockLabel}>{STAT_LABELS[k]}</div>
              <div style={s.statBlockVal}>{final}</div>
              <div style={s.statBlockMod}>{statMod(final)}</div>
              {bonus !== 0 && <div style={s.statBlockBonus}>+{bonus} racial</div>}
              {isTarget && <div style={s.statBlockHint}>click a value</div>}
            </button>
          );
        })}
      </div>

      {/* Flexible racial bonus choices (Half-Elf) */}
      {raceData?.flexibleBonusCount && (
        <div>
          <div style={s.traitHeader}>
            Choose {raceData.flexibleBonusCount} stats for +1 racial bonus
          </div>
          <div style={s.skillTagRow}>
            {STAT_KEYS.map(k => {
              const chosen = flexChoices.includes(k);
              return (
                <button
                  key={k}
                  style={{ ...s.skillTagBtn, ...(chosen ? s.skillTagChosen : {}) }}
                  onClick={() => {
                    if (chosen) setFlexChoices(flexChoices.filter(x => x !== k));
                    else if (flexChoices.length < raceData.flexibleBonusCount) setFlexChoices([...flexChoices, k]);
                  }}
                >
                  {STAT_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {method === 'standard' && (
        <p style={s.nameHint}>Click a stat block, then click an array value to assign it.</p>
      )}
    </div>
  );
}
