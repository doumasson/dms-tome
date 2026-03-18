import { useState } from 'react';
import { getRace, applyRacialBonuses } from '../../data/races';
import { STANDARD_ARRAY, STAT_KEYS, STAT_LABELS, STAT_FULL, statMod } from '../../lib/charBuilder';
import { s } from './charCreateStyles';

// Roll 4d6 drop lowest, returns { dice: [d1,d2,d3,d4], score }
function roll4d6() {
  const dice = [1, 2, 3, 4].map(() => Math.ceil(Math.random() * 6));
  const minIdx = dice.indexOf(Math.min(...dice));
  const score = dice.reduce((sum, d, i) => sum + (i === minIdx ? 0 : d), 0);
  return { dice, minIdx, score };
}

// Roll 7 sets, mark the set with the lowest score as dropped
function rollAllSets() {
  const sets = Array.from({ length: 7 }, () => roll4d6());
  const minScore = Math.min(...sets.map(s => s.score));
  const dropIdx = sets.findIndex(s => s.score === minScore);
  return sets.map((s, i) => ({ ...s, dropped: i === dropIdx }));
}

export default function StepAbilities({ race, baseStats, setBaseStats, method, setMethod, flexChoices, setFlexChoices }) {
  const raceData = getRace(race);
  const finalStats = raceData ? applyRacialBonuses(baseStats, race, flexChoices) : baseStats;

  // Standard array mode
  const [assignTarget, setAssignTarget] = useState(null);

  // Rolled mode
  const [rollSets, setRollSets] = useState(null); // null = not rolled yet
  const [assignments, setAssignments] = useState({}); // { str: setIndex, dex: setIndex, ... }
  const [pickTarget, setPickTarget] = useState(null); // which stat is waiting for a score

  function handleRoll() {
    const sets = rollAllSets();
    setRollSets(sets);
    setAssignments({});
    setPickTarget(null);
    // Reset baseStats to unassigned
    setBaseStats({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
  }

  function assignRolledScore(setIdx) {
    if (!pickTarget) return;
    const set = rollSets[setIdx];
    if (set.dropped) return;

    // Unassign any stat that previously had this set
    const prevStat = Object.entries(assignments).find(([, v]) => v === setIdx)?.[0];
    const newAssignments = { ...assignments };
    if (prevStat) delete newAssignments[prevStat];
    newAssignments[pickTarget] = setIdx;

    setAssignments(newAssignments);
    setBaseStats(prev => ({ ...prev, [pickTarget]: set.score }));

    // Auto-advance to next unassigned stat
    const remainingStats = STAT_KEYS.filter(k => k !== pickTarget && newAssignments[k] === undefined);
    setPickTarget(remainingStats[0] || null);
  }

  function unassignStat(stat) {
    const newAssignments = { ...assignments };
    delete newAssignments[stat];
    setAssignments(newAssignments);
    setBaseStats(prev => ({ ...prev, [stat]: 8 }));
    setPickTarget(stat);
  }

  // Standard array
  function assignStandard(val) {
    if (!assignTarget) return;
    setBaseStats({ ...baseStats, [assignTarget]: val });
    setAssignTarget(null);
  }

  const availableSets = rollSets ? rollSets.filter((s, i) => !s.dropped && assignments[Object.keys(assignments).find(k => assignments[k] === i)] === undefined) : [];
  const allAssigned = rollSets && STAT_KEYS.every(k => assignments[k] !== undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Method selector */}
      <div style={s.methodRow}>
        {['standard', 'rolled'].map(m => (
          <button
            key={m}
            style={{ ...s.methodBtn, ...(method === m ? s.methodBtnActive : {}) }}
            onClick={() => {
              setMethod(m);
              setRollSets(null);
              setAssignments({});
              setPickTarget(null);
              if (m === 'standard') setBaseStats({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
              else setBaseStats({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
            }}
          >
            {m === 'standard' ? 'Standard Array' : '4d6 Drop Lowest'}
          </button>
        ))}
      </div>

      {/* ── Standard Array ── */}
      {method === 'standard' && (
        <>
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
          <div style={s.statGrid}>
            {STAT_KEYS.map(k => {
              const base = baseStats[k];
              const final = finalStats[k];
              const bonus = final - base;
              const isTarget = assignTarget === k;
              return (
                <button
                  key={k}
                  style={{ ...s.statBlock, ...(isTarget ? s.statBlockTarget : {}) }}
                  onClick={() => setAssignTarget(isTarget ? null : k)}
                  title={STAT_FULL[k]}
                >
                  <div style={s.statBlockLabel}>{STAT_LABELS[k]}</div>
                  <div style={s.statBlockVal}>{final}</div>
                  <div style={s.statBlockMod}>{statMod(final)}</div>
                  {bonus !== 0 && <div style={s.statBlockBonus}>+{bonus} racial</div>}
                  {isTarget && <div style={s.statBlockHint}>pick a value</div>}
                </button>
              );
            })}
          </div>
          <p style={s.nameHint}>Click a stat block, then click an array value to assign it.</p>
        </>
      )}

      {/* ── 4d6 Drop Lowest ── */}
      {method === 'rolled' && (
        <>
          {/* Roll button */}
          {!rollSets ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ color: 'rgba(200,180,140,0.5)', fontSize: '0.82rem', marginBottom: 16, lineHeight: 1.6 }}>
                Roll 7 sets of 4 dice each. Drop the lowest die per set, then drop the lowest set. Assign the 6 remaining scores to your stats.
              </div>
              <button style={s.rollDiceBtn} onClick={handleRoll}>
                🎲 Roll 7 Sets
              </button>
            </div>
          ) : (
            <>
              {/* Rolled sets display */}
              <div style={diceSetsGrid}>
                {rollSets.map((set, i) => {
                  const assignedTo = Object.entries(assignments).find(([, v]) => v === i)?.[0];
                  const isDropped = set.dropped;
                  return (
                    <button
                      key={i}
                      style={{
                        ...diceSetCard,
                        ...(isDropped ? diceSetDropped : {}),
                        ...(assignedTo ? diceSetAssigned : {}),
                        ...(pickTarget && !isDropped && !assignedTo ? diceSetAvail : {}),
                      }}
                      onClick={() => !isDropped && !assignedTo && assignRolledScore(i)}
                      disabled={isDropped || !!assignedTo}
                      title={isDropped ? 'Lowest set — dropped' : assignedTo ? `Assigned to ${STAT_FULL[assignedTo]}` : 'Click to assign'}
                    >
                      <div style={diceRow}>
                        {set.dice.map((d, di) => (
                          <span
                            key={di}
                            style={{ ...dieFace, ...(di === set.minIdx ? dieDropped : {}) }}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                      <div style={setScore}>{set.score}</div>
                      {isDropped && <div style={droppedLabel}>DROPPED</div>}
                      {assignedTo && <div style={assignedLabel}>{STAT_LABELS[assignedTo]}</div>}
                    </button>
                  );
                })}
              </div>

              {/* Instruction */}
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(200,180,140,0.5)', minHeight: 22 }}>
                {allAssigned
                  ? 'All stats assigned! You can re-roll to start over.'
                  : pickTarget
                    ? `Assigning → ${STAT_FULL[pickTarget]} — click a score above`
                    : 'Click a stat below to start assigning scores.'}
              </div>

              {/* Stat grid */}
              <div style={s.statGrid}>
                {STAT_KEYS.map(k => {
                  const base = baseStats[k];
                  const final = finalStats[k];
                  const bonus = final - base;
                  const isTarget = pickTarget === k;
                  const hasValue = assignments[k] !== undefined;
                  return (
                    <button
                      key={k}
                      style={{
                        ...s.statBlock,
                        ...(isTarget ? s.statBlockTarget : {}),
                        ...(hasValue && !isTarget ? diceStatAssigned : {}),
                      }}
                      onClick={() => {
                        if (hasValue) unassignStat(k);
                        else setPickTarget(isTarget ? null : k);
                      }}
                      title={STAT_FULL[k]}
                    >
                      <div style={s.statBlockLabel}>{STAT_LABELS[k]}</div>
                      <div style={{ ...s.statBlockVal, ...(hasValue ? {} : { color: 'rgba(200,180,140,0.2)', fontSize: '0.9rem' }) }}>
                        {hasValue ? final : '—'}
                      </div>
                      {hasValue && <div style={s.statBlockMod}>{statMod(final)}</div>}
                      {bonus !== 0 && hasValue && <div style={s.statBlockBonus}>+{bonus} racial</div>}
                      {isTarget && <div style={s.statBlockHint}>pick above</div>}
                      {hasValue && !isTarget && <div style={{ ...s.statBlockHint, color: 'rgba(200,180,140,0.35)' }}>tap to clear</div>}
                    </button>
                  );
                })}
              </div>

              {/* Re-roll button */}
              <div style={{ textAlign: 'center' }}>
                <button
                  style={{ ...s.rollDiceBtn, background: 'rgba(255,255,255,0.06)', color: 'rgba(200,180,140,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={handleRoll}
                >
                  🎲 Re-roll
                </button>
              </div>
            </>
          )}
        </>
      )}

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
    </div>
  );
}

// Local styles for dice cards
const diceSetsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
  gap: 8,
};

const diceSetCard = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '10px 8px 8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const diceSetDropped = {
  opacity: 0.35,
  border: '1px dashed rgba(200,80,80,0.3)',
  background: 'rgba(200,80,80,0.04)',
  cursor: 'default',
};

const diceSetAssigned = {
  border: '1px solid rgba(46,204,113,0.4)',
  background: 'rgba(46,204,113,0.06)',
  cursor: 'default',
};

const diceSetAvail = {
  border: '1px solid rgba(212,175,55,0.45)',
  background: 'rgba(212,175,55,0.07)',
};

const diceRow = {
  display: 'flex',
  gap: 4,
  justifyContent: 'center',
};

const dieFace = {
  width: 20,
  height: 20,
  borderRadius: 4,
  background: 'rgba(212,175,55,0.15)',
  border: '1px solid rgba(212,175,55,0.35)',
  color: '#d4af37',
  fontSize: '0.7rem',
  fontWeight: 700,
  fontFamily: "'Cinzel', Georgia, serif",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};

const dieDropped = {
  background: 'rgba(200,80,80,0.12)',
  border: '1px solid rgba(200,80,80,0.25)',
  color: 'rgba(200,80,80,0.5)',
  textDecoration: 'line-through',
};

const setScore = {
  fontFamily: "'Cinzel', Georgia, serif",
  fontWeight: 700,
  fontSize: '1.3rem',
  color: '#f0e6d0',
  lineHeight: 1,
};

const droppedLabel = {
  fontSize: '0.55rem',
  color: 'rgba(200,80,80,0.6)',
  fontWeight: 700,
  fontFamily: "'Cinzel', Georgia, serif",
  letterSpacing: '0.08em',
};

const assignedLabel = {
  fontSize: '0.6rem',
  color: 'rgba(46,204,113,0.8)',
  fontWeight: 700,
  fontFamily: "'Cinzel', Georgia, serif",
  letterSpacing: '0.05em',
};

const diceStatAssigned = {
  border: '2px solid rgba(46,204,113,0.3)',
  background: 'rgba(46,204,113,0.04)',
};
