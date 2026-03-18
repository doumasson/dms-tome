import { useState } from 'react';
import useStore from '../store/useStore';
import { broadcastEncounterAction } from '../lib/liveChannel';
import InitiativePhase from './combat/InitiativePhase';
import CombatPhase from './combat/CombatPhase';
import CustomCombatSetup from './combat/CustomCombatSetup';
import { btn } from './combat/combatStyles';

// ─── Idle Phase (scene viewer shown when no combat is active) ─────────────────

function IdlePhase({ campaign, isHost, encounter, onStartEncounter, onStartCustom }) {
  const setCurrentScene = useStore(s => s.setCurrentScene);
  const { scenes, currentSceneIndex, loaded } = campaign;
  const scene = scenes[currentSceneIndex] || null;

  if (!loaded || scenes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📜</div>
        <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '1rem', marginBottom: 8 }}>No Campaign Loaded</div>
        <div style={{ fontSize: '0.82rem' }}>Import a campaign JSON in the Import tab to begin.</div>
        {isHost && (
          <button onClick={onStartCustom} style={{ ...btn.gold, marginTop: 20 }}>
            ⚔ Start Custom Combat
          </button>
        )}
      </div>
    );
  }

  const enemies = scene?.encounter?.enemies || [];
  const hasEncounter = enemies.length > 0;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
      {/* Scene Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => setCurrentScene(Math.max(0, currentSceneIndex - 1))}
          disabled={currentSceneIndex === 0}
          style={{ ...btn.small, opacity: currentSceneIndex === 0 ? 0.3 : 1 }}
        >
          ← Prev
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Scene {currentSceneIndex + 1} / {scenes.length}
        </span>
        <button
          onClick={() => setCurrentScene(Math.min(scenes.length - 1, currentSceneIndex + 1))}
          disabled={currentSceneIndex === scenes.length - 1}
          style={{ ...btn.small, opacity: currentSceneIndex === scenes.length - 1 ? 0.3 : 1 }}
        >
          Next →
        </button>
      </div>

      {scene && hasEncounter && isHost && (
        <div style={{ background: '#1a1006', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontFamily: "'Cinzel', Georgia, serif" }}>
            ENCOUNTER — {enemies.length} enemy group{enemies.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {enemies.map((e, i) => (
              <span key={i} style={{ fontSize: '0.78rem', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', color: '#e74c3c', borderRadius: 4, padding: '3px 10px' }}>
                {e.count > 1 ? `${e.count}× ` : ''}{e.name}
              </span>
            ))}
          </div>
          <button onClick={() => onStartEncounter(enemies)} style={btn.gold}>
            ⚔ Start Encounter
          </button>
        </div>
      )}

      {isHost && !hasEncounter && (
        <button onClick={onStartCustom} style={{ ...btn.ghost, width: '100%' }}>
          ⚔ Start Custom Combat
        </button>
      )}
    </div>
  );
}

// ─── Main EncounterView ───────────────────────────────────────────────────────

export default function EncounterView() {
  const [customSetup, setCustomSetup] = useState(false);

  const campaign     = useStore(s => s.campaign);
  const encounter    = useStore(s => s.encounter);
  const isDM         = useStore(s => s.isDM);
  const dmMode       = useStore(s => s.dmMode);
  const myCharacter  = useStore(s => s.myCharacter);
  const user         = useStore(s => s.user);
  const partyMembers = useStore(s => s.partyMembers);

  const startEncounter          = useStore(s => s.startEncounter);
  const setEncounterInitiative  = useStore(s => s.setEncounterInitiative);
  const beginCombat             = useStore(s => s.beginCombat);
  const nextEncounterTurn       = useStore(s => s.nextEncounterTurn);
  const applyEncounterDamage    = useStore(s => s.applyEncounterDamage);
  const applyEncounterHeal      = useStore(s => s.applyEncounterHeal);
  const addEncounterLog         = useStore(s => s.addEncounterLog);
  const addEncounterCondition   = useStore(s => s.addEncounterCondition);
  const removeEncounterCondition = useStore(s => s.removeEncounterCondition);
  const moveToken               = useStore(s => s.moveToken);
  const endEncounter            = useStore(s => s.endEncounter);
  const applyDeathSaveResult    = useStore(s => s.applyDeathSaveResult);
  const stabilizeCombatant      = useStore(s => s.stabilizeCombatant);
  const setConcentration        = useStore(s => s.setConcentration);
  const clearConcentration      = useStore(s => s.clearConcentration);
  const shortRest               = useStore(s => s.shortRest);
  const longRest                = useStore(s => s.longRest);

  // Broadcast wrappers — call store action + broadcast to all clients
  const uid = user?.id;
  function wrappedNextTurn()             { nextEncounterTurn(); broadcastEncounterAction({ type: 'next-turn', userId: uid }); }
  function wrappedDamage(id, amount)     { applyEncounterDamage(id, amount); broadcastEncounterAction({ type: 'damage', targetId: id, amount, userId: uid }); }
  function wrappedHeal(id, amount)       { applyEncounterHeal(id, amount); broadcastEncounterAction({ type: 'heal', targetId: id, amount, userId: uid }); }
  function wrappedLog(entry)             { addEncounterLog(entry); broadcastEncounterAction({ type: 'log', entry, userId: uid }); }
  function wrappedRollDeathSave(id)      { const roll = Math.floor(Math.random() * 20) + 1; applyDeathSaveResult(id, roll); broadcastEncounterAction({ type: 'death-save', id, roll, userId: uid }); }
  function wrappedStabilize(id)          { stabilizeCombatant(id); broadcastEncounterAction({ type: 'stabilize', id, userId: uid }); }
  function wrappedEndEncounter()         { endEncounter(); broadcastEncounterAction({ type: 'end-encounter', userId: uid }); }
  function wrappedAddCondition(id, c)    { addEncounterCondition(id, c); broadcastEncounterAction({ type: 'add-condition', id, condition: c, userId: uid }); }
  function wrappedRemoveCondition(id, c) { removeEncounterCondition(id, c); broadcastEncounterAction({ type: 'remove-condition', id, condition: c, userId: uid }); }
  function wrappedLongRest()             { longRest(); broadcastEncounterAction({ type: 'long-rest', userId: uid }); }
  function wrappedSetConcentration(id, spell) { setConcentration(id, spell); broadcastEncounterAction({ type: 'set-concentration', id, spell, userId: uid }); }
  function wrappedClearConcentration(id) { clearConcentration(id); broadcastEncounterAction({ type: 'clear-concentration', id, userId: uid }); }

  function handleStartEncounter(enemies) {
    setCustomSetup(false);
    const party = partyMembers.length > 0 ? partyMembers : campaign.characters;
    startEncounter(enemies, party);
  }

  if (customSetup) {
    return (
      <div style={{ padding: '16px 0' }}>
        <CustomCombatSetup
          partyMembers={partyMembers.length > 0 ? partyMembers : campaign.characters}
          onStart={handleStartEncounter}
          onCancel={() => setCustomSetup(false)}
        />
      </div>
    );
  }

  if (encounter.phase === 'initiative') {
    if (!isDM) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, color: 'var(--text-muted)', padding: 40 }}>
          <div style={{ fontSize: '3rem' }}>⚔</div>
          <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '1.1rem', color: 'var(--parchment)' }}>Combat is beginning…</div>
          <div style={{ fontSize: '0.85rem' }}>The host is rolling initiative.</div>
        </div>
      );
    }
    return (
      <div style={{ padding: '16px 0' }}>
        <InitiativePhase
          combatants={encounter.combatants}
          onSetInitiative={setEncounterInitiative}
          onBeginCombat={beginCombat}
          onCancel={endEncounter}
        />
      </div>
    );
  }

  if (encounter.phase === 'combat') {
    return (
      <div style={{ padding: '16px 0' }}>
        <CombatPhase
          encounter={encounter}
          dmMode={dmMode}
          myCharacter={myCharacter}
          characters={campaign.characters}
          onNextTurn={wrappedNextTurn}
          onEndEncounter={wrappedEndEncounter}
          onDamage={wrappedDamage}
          onHeal={wrappedHeal}
          onLog={wrappedLog}
          onAddCondition={wrappedAddCondition}
          onRemoveCondition={wrappedRemoveCondition}
          onMoveToken={moveToken}
          onRollDeathSave={wrappedRollDeathSave}
          onStabilize={wrappedStabilize}
          onSetConcentration={wrappedSetConcentration}
          onClearConcentration={wrappedClearConcentration}
          onShortRest={shortRest}
          onLongRest={wrappedLongRest}
        />
      </div>
    );
  }

  // idle
  return (
    <div style={{ padding: '16px 0' }}>
      <IdlePhase
        campaign={campaign}
        isHost={isDM}
        encounter={encounter}
        onStartEncounter={handleStartEncounter}
        onStartCustom={() => setCustomSetup(true)}
      />
    </div>
  );
}
