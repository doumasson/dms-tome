import { useState } from 'react';
import { rollDie, rollDamage, parseAttackBonus } from '../../lib/dice';
import { getConditionModifiers } from '../../lib/combatSpells';
import { apStyle } from './combatStyles';

const ADV_MODES = ['normal', 'advantage', 'disadvantage'];
const ADV_LABELS = { normal: 'Normal', advantage: 'Advantage', disadvantage: 'Disadvantage' };
const ADV_COLORS = { normal: 'var(--text-muted)', advantage: '#2ecc71', disadvantage: '#e74c3c' };

function rollWithAdvantage(mode) {
  const a = rollDie(20);
  const b = rollDie(20);
  if (mode === 'advantage') return { d20: Math.max(a, b), alt: Math.min(a, b) };
  if (mode === 'disadvantage') return { d20: Math.min(a, b), alt: Math.max(a, b) };
  return { d20: a, alt: null };
}

export default function AttackPanel({ attacker, combatants, onResolve, onCancel }) {
  const hasWeapons = attacker.attacks && attacker.attacks.length > 0;
  const [weapon, setWeapon] = useState(hasWeapons && attacker.attacks.length === 1 ? attacker.attacks[0] : null);
  const [advMode, setAdvMode] = useState('normal');
  const [result, setResult] = useState(null);

  const targets = combatants.filter(c => c.id !== attacker.id && c.currentHp > 0);

  function doAttack(target) {
    const w = weapon || { name: 'Unarmed Strike', bonus: '+0', damage: '1' };
    const bonus = parseAttackBonus(w.bonus);

    // Merge manual adv/disadv toggle with condition-based modifiers
    const condMods = getConditionModifiers(attacker, target);
    let effectiveMode = advMode;
    if (condMods.hasAdv && !condMods.hasDisadv) effectiveMode = 'advantage';
    else if (condMods.hasDisadv && !condMods.hasAdv) effectiveMode = 'disadvantage';
    else if (condMods.hasAdv && condMods.hasDisadv) effectiveMode = 'normal';
    if (advMode !== 'normal' && effectiveMode === 'normal') effectiveMode = advMode;

    const { d20, alt } = rollWithAdvantage(effectiveMode);
    const total = d20 + bonus;
    const isCrit = d20 === 20 || condMods.autoCrit;
    const isFumble = d20 === 1 && effectiveMode !== 'advantage';
    const hit = !isFumble && (isCrit || total >= (target.ac || 10));
    let damage = 0;
    let dmgDisplay = '';
    if (hit) {
      const rolled = rollDamage(w.damage);
      damage = isCrit ? rolled.total * 2 : rolled.total;
      dmgDisplay = isCrit ? `CRIT ×2 = ${damage}` : rolled.display;
    }

    const condReasons = [];
    if (condMods.hasAdv) condReasons.push('adv from conditions');
    if (condMods.hasDisadv) condReasons.push('disadv from conditions');
    if (condMods.autoCrit) condReasons.push('auto-crit: Paralyzed/Unconscious');
    const condSuffix = condReasons.length ? ` [${condReasons.join(', ')}]` : '';
    const advSuffix = effectiveMode !== 'normal' ? ` (${effectiveMode}, dropped ${alt})` : '';

    const entry = hit
      ? `${attacker.name} → ${target.name}: HIT! d20(${d20})${bonus >= 0 ? '+' : ''}${bonus}=${total} vs AC ${target.ac}${advSuffix}${condSuffix}. Dmg: ${damage} (${w.name})`
      : `${attacker.name} → ${target.name}: MISS. d20(${d20})${bonus >= 0 ? '+' : ''}${bonus}=${total} vs AC ${target.ac}${advSuffix}${condSuffix} (${w.name})`;
    onResolve(hit ? target.id : null, damage, entry);
    setResult({ hit, isCrit, isFumble, d20, alt, bonus, total, ac: target.ac, damage, dmgDisplay, targetName: target.name, condReasons });
  }

  function autoAttack() {
    if (targets.length === 0) return;
    doAttack(targets[Math.floor(Math.random() * targets.length)]);
  }

  if (result) {
    return (
      <div style={apStyle.panel}>
        {result.isCrit && <div style={{ color: '#f1c40f', fontWeight: 700, textAlign: 'center' }}>⚡ CRITICAL HIT!</div>}
        {result.isFumble && <div style={{ color: '#e74c3c', fontWeight: 700, textAlign: 'center' }}>💀 CRITICAL MISS!</div>}
        <div style={{ color: result.hit ? '#2ecc71' : '#e74c3c', fontWeight: 700, textAlign: 'center', fontSize: '1rem' }}>
          {result.hit ? '✔ HIT' : '✘ MISS'}
        </div>
        {result.condReasons?.length > 0 && (
          <div style={{ fontSize: '0.7rem', color: '#f39c12', textAlign: 'center', marginBottom: 4 }}>
            {result.condReasons.join(' · ')}
          </div>
        )}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center' }}>
          {attacker.name} → {result.targetName}<br />
          d20(<strong>{result.d20}</strong>){result.alt !== null && <span style={{ color: 'var(--text-muted)' }}> / {result.alt}</span>}
          {' '}{result.bonus >= 0 ? '+' : ''}{result.bonus} = <strong>{result.total}</strong> vs AC {result.ac}
          {result.hit && <><br />Damage: <strong>{result.damage}</strong> ({result.dmgDisplay})</>}
        </div>
        <button onClick={onCancel} style={apStyle.btn}>Done</button>
      </div>
    );
  }

  if (!weapon) {
    return (
      <div style={apStyle.panel}>
        <div style={apStyle.label}>Choose weapon</div>
        {hasWeapons ? attacker.attacks.map((w, i) => (
          <button key={i} onClick={() => setWeapon(w)} style={apStyle.targetBtn}>
            {w.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({w.bonus}, {w.damage})</span>
          </button>
        )) : (
          <button onClick={() => setWeapon({ name: 'Unarmed Strike', bonus: '+0', damage: '1' })} style={apStyle.targetBtn}>
            Unarmed Strike
          </button>
        )}
        <button onClick={onCancel} style={apStyle.cancel}>← Back</button>
      </div>
    );
  }

  return (
    <div style={apStyle.panel}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {ADV_MODES.map(m => (
          <button key={m} onClick={() => setAdvMode(m)} style={{
            flex: 1, padding: '4px 6px', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer', fontWeight: advMode === m ? 700 : 400,
            background: advMode === m ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: `1px solid ${advMode === m ? ADV_COLORS[m] : 'var(--border-light)'}`,
            color: ADV_COLORS[m],
          }}>
            {ADV_LABELS[m]}
          </button>
        ))}
      </div>
      <div style={apStyle.label}>
        {weapon.name} — pick target
        <button onClick={autoAttack} style={apStyle.auto}>🎲 Auto</button>
      </div>
      {targets.length === 0
        ? <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No valid targets.</div>
        : targets.map(t => (
          <button key={t.id} onClick={() => doAttack(t)} style={apStyle.targetBtn}>
            {t.name}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> AC {t.ac} · {t.currentHp}/{t.maxHp}HP</span>
          </button>
        ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {attacker.attacks.length > 1 && (
          <button onClick={() => setWeapon(null)} style={apStyle.cancel}>← Back</button>
        )}
        <button onClick={onCancel} style={apStyle.cancel}>← Back</button>
      </div>
    </div>
  );
}
