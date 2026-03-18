import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import useStore from '../../store/useStore';
import { rollDamage } from '../../lib/dice';
import { crToXp } from '../../lib/xpTable';
import { broadcastPlayerMove } from '../../lib/liveChannel';
import { COMBAT_SPELLS } from '../../lib/combatSpells';
import PartyPanel from '../PartyPanel';
import CharDetailPanel from '../CharDetailPanel';
import ActionPanel from '../ActionPanel';
import LootGenerator from '../LootGenerator';
import SpellTargeting from '../SpellTargeting';
import BattleMap, { buildTypeIndex } from './BattleMap';
import CombatantRow from './CombatantRow';
import AttackPanel from './AttackPanel';
import { SavingThrowPanel, AoEPanel, ConcentratePanel, SpellSelectPanel } from './SpellPanels';
import { btn, apStyle, MAP_W, MAP_H, CELL_PX } from './combatStyles';

function useWindowWidth() {
  return useSyncExternalStore(
    cb => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); },
    () => window.innerWidth,
  );
}

function getCellPx(width) {
  if (width < 480) return 32;
  if (width < 768) return 40;
  return CELL_PX;
}

export default function CombatPhase({ encounter, dmMode, myCharacter, characters, onNextTurn, onEndEncounter, onDamage, onHeal, onLog, onAddCondition, onRemoveCondition, onMoveToken, onRollDeathSave, onStabilize, onSetConcentration, onClearConcentration, onShortRest, onLongRest }) {
  const currentUser = useStore(s => s.user);
  const { combatants, currentTurn, round, log } = encounter;
  const [selectedToken, setSelectedToken] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'attack' | 'aoe' | 'save' | 'concentrate' | 'spell_select' | 'spell_target'
  const [showLoot, setShowLoot] = useState(false);
  const [activeSpell, setActiveSpell] = useState(null);
  const [mobileTab, setMobileTab] = useState('battle'); // 'party' | 'battle' | 'actions'
  const logRef = useRef();
  const winWidth = useWindowWidth();
  const isMobile = winWidth < 640;
  const isTablet = winWidth >= 640 && winWidth < 900;
  const cellPx = getCellPx(winWidth);

  const activeCombatant = combatants[currentTurn] || null;
  const { runEnemyTurn, sessionApiKey } = useStore();

  const isMyTurn = !!(activeCombatant && myCharacter && (
    activeCombatant.id === myCharacter.id || activeCombatant.name === myCharacter.name
  ));
  const canAct = dmMode || isMyTurn;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [log.length]);

  // Auto-trigger AI enemy turns
  useEffect(() => {
    if (encounter.phase !== 'combat') return;
    if (!activeCombatant) return;
    if (activeCombatant.type !== 'enemy') return;
    if (activeCombatant.currentHp <= 0) {
      const t = setTimeout(() => onNextTurn(), 600);
      return () => clearTimeout(t);
    }
    if (!dmMode) return;
    const t = setTimeout(() => runEnemyTurn(sessionApiKey), 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounter.currentTurn, encounter.phase, dmMode]);

  function handleTokenClick(id) {
    setSelectedToken(prev => prev === id ? null : id);
    setPanel(null);
  }

  function handleCellClick(x, y) {
    if (!selectedToken) return;

    const token = combatants.find(c => c.id === selectedToken);
    if (!token) { setSelectedToken(null); return; }

    // Speed-0 conditions block all movement
    const speedZeroConditions = ['Grappled', 'Restrained', 'Paralyzed', 'Stunned', 'Petrified', 'Incapacitated'];
    if (token.conditions?.some(c => speedZeroConditions.includes(c))) {
      const blocking = token.conditions.filter(c => speedZeroConditions.includes(c)).join(', ');
      onLog(`${token.name} cannot move — ${blocking}`);
      setSelectedToken(null);
      return;
    }

    if (!dmMode) {
      const isMyToken = myCharacter && (
        token.id === myCharacter.id || token.name === myCharacter.name
      );
      if (!isMyToken) { setSelectedToken(null); return; }

      if (encounter.phase === 'combat') {
        const isMyTurnNow = activeCombatant && myCharacter && (
          activeCombatant.id === myCharacter.id || activeCombatant.name === myCharacter.name
        );
        if (!isMyTurnNow) { setSelectedToken(null); return; }
        if ((token.remainingMove ?? 0) <= 0) { setSelectedToken(null); return; }
      }
    }

    // Chebyshev distance — diagonal = 1 cell like 5e
    const from = token.position;
    let cost = 1;
    if (from) {
      const dx = Math.abs(x - from.x);
      const dy = Math.abs(y - from.y);
      cost = Math.max(dx, dy);
    }

    // Prone: costs half speed to stand up before moving (5e PHB p. 292)
    const isProne = token.conditions?.includes('Prone');
    if (isProne) {
      const standCost = Math.ceil((token.speed || 30) / 10);
      cost += standCost;
      onLog(`${token.name} stands up from Prone (−${standCost} cells movement) then moves`);
    }

    onMoveToken(selectedToken, x, y, cost);

    if (!dmMode) {
      broadcastPlayerMove(selectedToken, x, y, cost, currentUser?.id);
    }

    setSelectedToken(null);
  }

  function handleHpChange(id, delta) {
    if (delta < 0) onDamage(id, -delta);
    else onHeal(id, delta);
  }

  function handleAttackResolve(targetId, damage, logEntry) {
    if (targetId) onDamage(targetId, damage);
    onLog(logEntry);
  }

  function handleAoEApply(applications, total, dmgType) {
    applications.forEach(({ id, amount }) => onDamage(id, amount));
    const summary = applications
      .map(({ id, amount }) => {
        const c = combatants.find(x => x.id === id);
        return `${c?.name ?? id} (${amount})`;
      })
      .join(', ');
    onLog(`💥 ${dmgType} ${total} dmg → ${summary}`);
    setPanel(null);
  }

  function handleLogOnly(entry) { onLog(entry); }

  function handleSpellOpen(combatant, action) {
    const directName = action?.spellName || (action?.type === 'cantrip' ? action.label : null);
    if (directName && COMBAT_SPELLS[directName]) {
      setActiveSpell({ ...COMBAT_SPELLS[directName], name: directName });
      setPanel('spell_target');
    } else {
      setPanel('spell_select');
    }
  }

  function handleSpellPicked(spellName) {
    const def = COMBAT_SPELLS[spellName] || { name: spellName, areaType: 'single', damage: '', damageType: 'unknown' };
    setActiveSpell({ ...def, name: spellName });
    setPanel('spell_target');
  }

  function handleSpellConfirm(hitCombatants, spellDef) {
    const def = spellDef || activeSpell;
    if (!def) { setPanel(null); return; }

    const isHealing = def.healing;
    const hasDamage = def.damage && def.damage !== '';

    if (!hasDamage) {
      const names = hitCombatants.map(c => c.name).join(', ') || 'no targets';
      onLog(`✨ ${activeCombatant?.name} casts ${def.name} → ${names}${def.save ? ` (${def.save.toUpperCase()} save)` : ''}`);
      if (def.concentration) onSetConcentration(activeCombatant.id, def.name);
    } else {
      const rolled = rollDamage(def.damage);
      if (isHealing) {
        hitCombatants.forEach(c => onHeal(c.id, rolled.total));
        const names = hitCombatants.map(c => c.name).join(', ') || 'no targets';
        onLog(`💚 ${activeCombatant?.name} casts ${def.name} → heals ${names} for ${rolled.total} HP`);
      } else if (def.save) {
        hitCombatants.forEach(c => onDamage(c.id, rolled.total));
        const names = hitCombatants.map(c => c.name).join(', ') || 'no targets';
        onLog(`🔥 ${activeCombatant?.name} casts ${def.name} (${def.damageType} DC${def.save ? ' ??' : ''}) → ${rolled.total} dmg [${rolled.display}] · ${names} — roll ${def.save.toUpperCase()} saves (½ on success)`);
      } else {
        hitCombatants.forEach(c => onDamage(c.id, rolled.total));
        const names = hitCombatants.map(c => c.name).join(', ') || 'no targets';
        onLog(`✨ ${activeCombatant?.name} casts ${def.name} → ${rolled.total} ${def.damageType} dmg [${rolled.display}] → ${names}`);
      }
      if (def.concentration) onSetConcentration(activeCombatant.id, def.name);
    }

    setPanel(null);
    setActiveSpell(null);
  }

  const awardXp = useStore(s => s.awardXp);
  const [xpAwarded, setXpAwarded] = useState(false);

  const enemies = combatants.filter(c => c.type === 'enemy');
  const allEnemiesDead = enemies.length > 0 && enemies.every(c => c.currentHp <= 0);
  const partyDead = combatants.filter(c => c.type === 'player').every(c => c.currentHp <= 0);
  const totalXp = enemies.filter(c => c.currentHp <= 0).reduce((sum, c) => sum + crToXp(c.cr), 0);
  const avgCr = enemies.length > 0
    ? (enemies.map(c => parseFloat(c.cr) || 0).reduce((a, b) => a + b, 0) / enemies.length).toFixed(1)
    : 1;

  const activeChar = characters?.find(c => c.id === activeCombatant?.id || c.name === activeCombatant?.name) || null;

  const INCAP_CONDITIONS = ['Incapacitated', 'Paralyzed', 'Stunned', 'Unconscious', 'Petrified'];
  const incapCondition = activeCombatant?.conditions?.find(c => INCAP_CONDITIONS.includes(c)) || null;

  // Shared panel renderers (used in both mobile + desktop)
  const renderPanels = () => (
    <>
      {panel === 'attack'      && activeCombatant && <AttackPanel attacker={activeCombatant} combatants={combatants} onResolve={handleAttackResolve} onCancel={() => setPanel(null)} />}
      {panel === 'aoe'         && <AoEPanel combatants={combatants} onApply={handleAoEApply} onCancel={() => setPanel(null)} />}
      {panel === 'save'        && <SavingThrowPanel combatants={combatants} onLog={handleLogOnly} onCancel={() => setPanel(null)} />}
      {panel === 'concentrate' && activeCombatant && <ConcentratePanel combatant={activeCombatant} dmMode={dmMode} onSet={spell => { onSetConcentration(activeCombatant.id, spell); setPanel(null); }} onClear={() => { onClearConcentration(activeCombatant.id); setPanel(null); }} onCancel={() => setPanel(null)} />}
      {panel === 'spell_select' && activeCombatant && <SpellSelectPanel combatant={activeCombatant} onPick={handleSpellPicked} onCancel={() => setPanel(null)} />}
      {panel === 'spell_target' && activeCombatant && activeSpell && (
        <div style={apStyle.panel}>
          <div style={{ ...apStyle.label, marginBottom: 6 }}>
            ✨ {activeSpell.name}
            <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#5b8fff' }}>
              {activeSpell.areaType === 'single' ? 'Single Target' :
               activeSpell.areaType === 'cone' ? `Cone ${activeSpell.areaSize}ft` :
               activeSpell.areaType === 'sphere' ? `Sphere ${activeSpell.areaSize}ft` :
               `Line ${activeSpell.areaSize}ft`}
            </span>
          </div>
          {activeSpell.damage && (
            <div style={{ fontSize: '0.7rem', color: '#d4af37', marginBottom: 8 }}>
              {activeSpell.damage} {activeSpell.damageType}
              {activeSpell.save && ` · ${activeSpell.save.toUpperCase()} save`}
              {activeSpell.healing && ' (healing)'}
            </div>
          )}
          <SpellTargeting
            spell={activeSpell}
            caster={activeCombatant}
            combatants={combatants}
            mapW={MAP_W}
            mapH={MAP_H}
            cellPx={cellPx}
            onConfirm={handleSpellConfirm}
            onCancel={() => { setPanel(null); setActiveSpell(null); }}
          />
        </div>
      )}
    </>
  );

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    const partyContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
        <PartyPanel combatants={combatants} characters={characters || []} activeCombatantId={activeCombatant?.id} onSelectCombatant={handleTokenClick} />
        {(activeChar || activeCombatant) && <CharDetailPanel character={activeChar} combatant={activeCombatant} compact />}
        {dmMode && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onShortRest} style={{ ...btn.ghost, flex: 1, fontSize: '0.72rem' }}>🌙 Short Rest</button>
            <button onClick={onLongRest}  style={{ ...btn.ghost, flex: 1, fontSize: '0.72rem', color: '#d4af37', borderColor: 'rgba(212,175,55,0.4)' }}>☀️ Long Rest</button>
          </div>
        )}
      </div>
    );

    const battleContent = (
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 700, fontFamily: "'Cinzel', Georgia, serif" }}>Round {round}</span>
          {activeCombatant && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Turn: <strong>{activeCombatant.name}</strong></span>}
          {(allEnemiesDead || partyDead) && (
            <span style={{ fontSize: '0.78rem', color: allEnemiesDead ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
              {allEnemiesDead ? '🏆 Victory!' : '💀 Defeated!'}
            </span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <BattleMap combatants={combatants} selectedToken={selectedToken} activeCombatantId={activeCombatant?.id} onCellClick={handleCellClick} onTokenClick={handleTokenClick} cellPx={cellPx} />
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3 }}>
          {activeCombatant ? (
            <>
              {activeCombatant.name} — Move: <span style={{ color: (activeCombatant.remainingMove ?? 0) > 0 ? '#2ecc71' : '#e74c3c' }}>{activeCombatant.remainingMove ?? Math.floor((activeCombatant.speed || 30) / 5)} cells</span>
              {!dmMode && myCharacter && (activeCombatant.name === myCharacter?.name || activeCombatant.id === myCharacter?.id)
                ? ' · Tap your token then a cell'
                : !dmMode ? ' · Waiting for your turn' : ' · Tap token · tap cell'}
            </>
          ) : 'Tap token · tap cell to move'}
        </div>
        <div ref={logRef} style={{ background: '#0f0a04', border: '1px solid #2a1a0a', borderRadius: 6, padding: '6px 8px', maxHeight: 100, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.7rem', marginTop: 8 }}>
          {log.map((entry, i) => <div key={i} style={{ color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)', padding: '1px 0' }}>{entry}</div>)}
        </div>
        {showLoot && <div style={{ marginTop: 8 }}><LootGenerator defaultCr={avgCr} onClose={() => setShowLoot(false)} /></div>}
      </div>
    );

    const actionsContent = (
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {panel === null && activeCombatant && (() => {
          const isDying = activeCombatant.currentHp <= 0 && activeCombatant.type === 'player' && !(activeCombatant.deathSaves?.failures >= 3);
          const isMyDying = isDying && isMyTurn;
          if (!canAct && !isDying) return (
            <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif" }}>
                Turn: <strong style={{ color: 'var(--gold)' }}>{activeCombatant.name}</strong> — waiting…
              </div>
            </div>
          );
          return (
            <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: "'Cinzel', Georgia, serif" }}>
                {isDying ? `⚠ ${activeCombatant.name} DYING` : `ACTIONS — ${activeCombatant.name}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {isDying ? (
                  <>
                    {(isMyDying || dmMode) && <button onClick={() => onRollDeathSave(activeCombatant.id)} style={{ ...btn.action, background: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.5)', color: '#f39c12' }}>🎲 Death Save</button>}
                    {dmMode && <button onClick={() => onStabilize(activeCombatant.id)} style={{ ...btn.action, background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71' }}>✚ Stabilize</button>}
                  </>
                ) : incapCondition ? (
                  <div style={{ background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 6, padding: '6px 8px', fontSize: '0.72rem', color: '#e74c3c' }}>
                    ⚠ {activeCombatant.name} is <strong>{incapCondition}</strong> — cannot take actions
                  </div>
                ) : (
                  <>
                    <button onClick={() => setPanel('attack')} style={{ ...btn.action, background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.4)', color: '#e74c3c' }}>⚔ Attack</button>
                    <button onClick={() => setPanel('spell_select')} style={{ ...btn.action, background: 'rgba(91,143,255,0.15)', border: '1px solid rgba(91,143,255,0.4)', color: '#5b8fff' }}>✨ Cast Spell</button>
                    {dmMode && <button onClick={() => setPanel('aoe')} style={{ ...btn.action, background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.4)', color: '#9b59b6' }}>💥 AoE</button>}
                    {(dmMode || activeCombatant.spells?.length > 0) && <button onClick={() => setPanel('concentrate')} style={{ ...btn.action, background: 'rgba(155,89,182,0.15)', border: `1px solid ${activeCombatant.concentration ? 'rgba(155,89,182,0.7)' : 'rgba(155,89,182,0.3)'}`, color: '#9b59b6' }}>🎯 {activeCombatant.concentration ? `Conc: ${activeCombatant.concentration}` : 'Concentrate'}</button>}
                    {dmMode && <button onClick={() => setPanel('save')} style={{ ...btn.action, background: 'rgba(41,128,185,0.15)', border: '1px solid rgba(41,128,185,0.4)', color: '#3498db' }}>🎲 Save</button>}
                  </>
                )}
                {canAct && <button onClick={onNextTurn} style={{ ...btn.action, background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71' }}>➜ Next Turn</button>}
              </div>
            </div>
          );
        })()}
        {renderPanels()}
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Cinzel', Georgia, serif" }}>TURN ORDER</div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {combatants.map((c, i) => (
              <CombatantRow key={c.id} combatant={c} isActive={i === currentTurn} isSelected={c.id === selectedToken} colorIndex={buildTypeIndex(combatants)[c.type]?.[c.id] || 0} dmMode={dmMode} onSelectToken={handleTokenClick} onHpChange={handleHpChange} onAddCondition={onAddCondition} onRemoveCondition={onRemoveCondition} onRollDeathSave={onRollDeathSave} onStabilize={onStabilize} />
            ))}
          </div>
        </div>
        {dmMode && <button onClick={onEndEncounter} style={{ ...btn.ghost, fontSize: '0.78rem', color: '#c0392b', borderColor: 'rgba(192,57,43,0.4)' }}>✕ End Combat</button>}
      </div>
    );

    const MOBILE_TABS = [
      { id: 'party',   label: '👥 Party' },
      { id: 'battle',  label: '🗺 Battle' },
      { id: 'actions', label: '⚔ Actions' },
    ];

    return (
      <div style={{ padding: '0 8px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #2a1a0a', marginBottom: 4 }}>
          {MOBILE_TABS.map(t => (
            <button key={t.id} onClick={() => setMobileTab(t.id)} style={{
              flex: 1, padding: '9px 4px', background: 'transparent', border: 'none',
              borderBottom: mobileTab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              color: mobileTab === t.id ? 'var(--gold)' : 'var(--text-muted)',
              fontSize: '0.78rem', fontFamily: "'Cinzel', Georgia, serif", cursor: 'pointer', fontWeight: mobileTab === t.id ? 700 : 400,
            }}>
              {t.label}
            </button>
          ))}
        </div>
        {mobileTab === 'party'   && partyContent}
        {mobileTab === 'battle'  && battleContent}
        {mobileTab === 'actions' && actionsContent}
      </div>
    );
  }

  // ── Desktop / Tablet layout ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 0, padding: '0 8px', alignItems: 'flex-start' }}>

      {/* Party Column — hidden on tablet */}
      <div style={{ width: isTablet ? 0 : 192, overflow: isTablet ? 'hidden' : 'visible', flexShrink: 0, marginRight: isTablet ? 0 : 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: '10px 8px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          <PartyPanel combatants={combatants} characters={characters || []} activeCombatantId={activeCombatant?.id} onSelectCombatant={handleTokenClick} />
        </div>

        {(activeChar || activeCombatant) && (
          <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: '10px 10px', overflowY: 'auto', maxHeight: 420 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 8 }}>
              {activeCombatant?.type === 'enemy' ? 'ACTIVE ENEMY' : 'ACTIVE COMBATANT'}
            </div>
            <CharDetailPanel character={activeChar} combatant={activeCombatant} compact />
          </div>
        )}

        {dmMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <button onClick={onShortRest} style={{ ...btn.ghost, fontSize: '0.72rem', padding: '5px 8px' }}>🌙 Short Rest</button>
            <button onClick={onLongRest} style={{ ...btn.ghost, fontSize: '0.72rem', padding: '5px 8px', color: '#d4af37', borderColor: 'rgba(212,175,55,0.4)' }}>☀️ Long Rest</button>
          </div>
        )}
      </div>

      {/* Right: Map + Sidebar */}
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Center: Map */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 700, fontFamily: "'Cinzel', Georgia, serif" }}>Round {round}</div>
            {activeCombatant && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Turn: <strong style={{ color: 'var(--text-primary)' }}>{activeCombatant.name}</strong>
              </div>
            )}
            {selectedToken && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Token selected — click a cell to move
              </div>
            )}
            {(allEnemiesDead || partyDead) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: allEnemiesDead ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
                  {allEnemiesDead ? '🏆 Victory!' : '💀 Party defeated!'}
                </span>
                {allEnemiesDead && totalXp > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#f1c40f' }}>{totalXp.toLocaleString()} XP</span>
                )}
                {allEnemiesDead && dmMode && totalXp > 0 && !xpAwarded && (
                  <button onClick={() => { awardXp(totalXp); setXpAwarded(true); }} style={{ ...btn.small, color: '#f1c40f', borderColor: 'rgba(241,196,15,0.4)', fontSize: '0.72rem' }}>
                    ✦ Award XP
                  </button>
                )}
                {xpAwarded && <span style={{ fontSize: '0.68rem', color: '#2ecc71' }}>XP awarded!</span>}
                {allEnemiesDead && dmMode && (
                  <button onClick={() => setShowLoot(l => !l)} style={{ ...btn.small, color: '#d4af37', borderColor: 'var(--border-gold)', fontSize: '0.72rem' }}>
                    🎁 Loot
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <BattleMap combatants={combatants} selectedToken={selectedToken} activeCombatantId={activeCombatant?.id} onCellClick={handleCellClick} onTokenClick={handleTokenClick} cellPx={cellPx} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {activeCombatant && (
              <span>
                Move: <span style={{ color: (activeCombatant.remainingMove ?? 0) > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
                  {activeCombatant.remainingMove ?? Math.floor((activeCombatant.speed || 30) / 5)} cells remaining
                </span>
                {!dmMode && myCharacter && (activeCombatant.name === myCharacter?.name || activeCombatant.id === myCharacter?.id)
                  ? ' · Your turn — click your token then a cell'
                  : !dmMode ? ' · Waiting for your turn…' : ' · Click token then cell to move'}
              </span>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.06em' }}>COMBAT LOG</div>
            <div ref={logRef} style={{ background: '#0f0a04', border: '1px solid #2a1a0a', borderRadius: 6, padding: '8px 10px', maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {log.map((entry, i) => (
                <div key={i} style={{ color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)', padding: '1px 0', borderBottom: i < log.length - 1 ? '1px solid #1a1006' : 'none' }}>
                  {entry}
                </div>
              ))}
            </div>
          </div>

          {showLoot && <div style={{ marginTop: 10 }}><LootGenerator defaultCr={avgCr} onClose={() => setShowLoot(false)} /></div>}
        </div>

        {/* Right Sidebar: Actions + Turn Order */}
        <div style={{ width: 260, flexShrink: 0 }}>
          {panel === null && activeCombatant && (() => {
            const isDying = activeCombatant.currentHp <= 0 && activeCombatant.type === 'player' && !(activeCombatant.deathSaves?.failures >= 3);
            const isMyDying = isDying && isMyTurn;
            const isEnemy = activeCombatant.type === 'enemy';

            if (isEnemy && activeCombatant.currentHp > 0) return (
              <div style={{ background: '#1a1006', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: '0.75rem', color: '#e74c3c', fontFamily: "'Cinzel', Georgia, serif", marginBottom: 4 }}>
                  ENEMY TURN — {activeCombatant.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {dmMode ? 'AI is deciding action…' : 'Waiting for enemy action…'}
                </div>
                {dmMode && (
                  <button onClick={onNextTurn} style={{ ...btn.action, background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71', marginTop: 8 }}>
                    ➜ Skip (Force Next Turn)
                  </button>
                )}
              </div>
            );

            if (!canAct && !isDying) return (
              <div style={{ background: '#1a1006', border: '1px solid #2a1a0a', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'Cinzel', Georgia, serif" }}>
                  Turn: <strong style={{ color: 'var(--gold)' }}>{activeCombatant.name}</strong> — waiting…
                </div>
              </div>
            );

            return (
              <div style={{ background: '#1a1006', border: `1px solid ${isDying ? 'rgba(243,156,18,0.5)' : '#2a1a0a'}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: '0.75rem', color: isDying ? '#f39c12' : 'var(--text-muted)', marginBottom: 8, fontFamily: "'Cinzel', Georgia, serif" }}>
                  {isDying ? `⚠ ${activeCombatant.name} is DYING` : `ACTIONS — ${activeCombatant.name}`}
                </div>

                {isDying ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(isMyDying || dmMode) && (
                      <button onClick={() => onRollDeathSave(activeCombatant.id)} style={{ ...btn.action, background: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.5)', color: '#f39c12' }}>
                        🎲 Roll Death Save
                      </button>
                    )}
                    {dmMode && (
                      <button onClick={() => onStabilize(activeCombatant.id)} style={{ ...btn.action, background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71' }}>
                        ✚ Stabilize (Medicine)
                      </button>
                    )}
                    {canAct && (
                      <button onClick={onNextTurn} style={{ ...btn.action, background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71' }}>
                        ➜ Next Turn
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {incapCondition && (
                      <div style={{ background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 6, padding: '6px 8px', marginBottom: 8, fontSize: '0.72rem', color: '#e74c3c' }}>
                        ⚠ {activeCombatant.name} is <strong>{incapCondition}</strong> — cannot take actions or reactions
                      </div>
                    )}
                    {!incapCondition && (
                      <ActionPanel
                        combatant={activeCombatant}
                        onAttack={() => setPanel('attack')}
                        onSpell={(c, action) => handleSpellOpen(c, action)}
                        onSpecial={() => {}}
                        style={{ marginBottom: 8 }}
                      />
                    )}
                    {dmMode && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4, paddingTop: 8, borderTop: '1px solid #2a1a0a' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>DM TOOLS</div>
                        <button onClick={() => setPanel('aoe')} style={{ ...btn.action, background: 'rgba(155,89,182,0.12)', border: '1px solid rgba(155,89,182,0.35)', color: '#9b59b6', fontSize: '0.78rem' }}>💥 AoE Damage</button>
                        <button onClick={() => setPanel('concentrate')} style={{ ...btn.action, background: 'rgba(155,89,182,0.12)', border: `1px solid ${activeCombatant.concentration ? 'rgba(155,89,182,0.7)' : 'rgba(155,89,182,0.3)'}`, color: '#9b59b6', fontSize: '0.78rem' }}>
                          🎯 {activeCombatant.concentration ? `Conc: ${activeCombatant.concentration}` : 'Concentrate'}
                        </button>
                        <button onClick={() => setPanel('save')} style={{ ...btn.action, background: 'rgba(41,128,185,0.12)', border: '1px solid rgba(41,128,185,0.35)', color: '#3498db', fontSize: '0.78rem' }}>🎲 Saving Throw</button>
                      </div>
                    )}
                    {canAct && (
                      <button onClick={onNextTurn} style={{ ...btn.action, background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)', color: '#2ecc71', marginTop: 8, width: '100%' }}>
                        ➜ End Turn
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {renderPanels()}

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 5, fontFamily: "'Cinzel', Georgia, serif" }}>TURN ORDER</div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {combatants.map((c, i) => (
              <CombatantRow
                key={c.id}
                combatant={c}
                isActive={i === currentTurn}
                isSelected={c.id === selectedToken}
                colorIndex={buildTypeIndex(combatants)[c.type]?.[c.id] || 0}
                dmMode={dmMode}
                onSelectToken={handleTokenClick}
                onHpChange={handleHpChange}
                onAddCondition={onAddCondition}
                onRemoveCondition={onRemoveCondition}
                onRollDeathSave={onRollDeathSave}
                onStabilize={onStabilize}
              />
            ))}
          </div>

          {dmMode && (
            <button onClick={onEndEncounter} style={{ ...btn.ghost, marginTop: 10, width: '100%', fontSize: '0.78rem', color: '#c0392b', borderColor: 'rgba(192,57,43,0.4)' }}>
              ✕ End Combat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
