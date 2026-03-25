import { lazy, Suspense } from 'react'

const DiceTray = lazy(() => import('../DiceTray'))
const CharacterSheetModal = lazy(() => import('../characterSheet/CharacterSheetModal'))
const WorldMap = lazy(() => import('../../hud/WorldMap'))
const Inventory_ = lazy(() => import('./Inventory'))
const JournalModal = lazy(() => import('../JournalModal'))
const FactionReputation = lazy(() => import('../FactionReputation'))
const RestModal = lazy(() => import('../RestModal'))
const InteractionMenu = lazy(() => import('../InteractionMenu'))
const NpcDialog = lazy(() => import('../NpcDialog'))
const StoryCutscene = lazy(() => import('../StoryCutscene'))
const LevelUpModal = lazy(() => import('../LevelUpModal'))
const LootScreen = lazy(() => import('../LootScreen'))
const ShopPanel = lazy(() => import('../ShopPanel'))
const FormationPanel = lazy(() => import('../FormationPanel'))
const CombatDebugOverlay = lazy(() => import('../../hud/CombatDebugOverlay'))
const GameOverModal = lazy(() => import('../GameOverModal'))
const VictoryScreen = lazy(() => import('./VictoryScreen'))
const DefeatScreen = lazy(() => import('./DefeatScreen'))
const PreCombatMenu = lazy(() => import('./PreCombatMenu'))
const SessionResume = lazy(() => import('./SessionResume'))
const SpellTargeting = lazy(() => import('./SpellTargeting'))
const OAConfirmModal = lazy(() => import('../v2/OAConfirmModal'))
const WeaponPickerModal = lazy(() => import('../../hud/WeaponPickerModal'))
const SpellPickerModal = lazy(() => import('../../hud/SpellPickerModal'))
const ConsumablePickerModal = lazy(() => import('../../hud/ConsumablePickerModal'))
const ReadyActionModal = lazy(() => import('../../hud/ReadyActionModal'))
const ReadyActionPrompt = lazy(() => import('../../hud/ReadyActionPrompt'))
const ApiKeySettings = lazy(() => import('../ApiKeySettings'))

export default function GameModalsRenderer({
  toolPanel, setToolPanel,
  sheetChar, setSheetChar,
  activeMode, setActiveMode,
  showApiSettings, setShowApiSettings,
  showJournal, setShowJournal,
  showFactions, setShowFactions,
  activeNpc, setActiveNpc,
  activeShop, setActiveShop,
  showFormation, setShowFormation,
  showLevelUp, setShowLevelUp,
  showInteractionMenu, setShowInteractionMenu,
  showVictory, setShowVictory,
  showDefeat, setShowDefeat,
  showDeathOptions,
  showPreCombat, setShowPreCombat,
  pendingCombatEnemies,
  showSessionResume, setShowSessionResume,
  showSpellTargeting, setShowSpellTargeting,
  pendingSpell,
  dismissedLevelRef,
  stealthMode,
  myCharacter,
  activeMode_,
  restProposal, setRestProposal,
  user,
  activeCutscene,
  showWeaponPicker, setShowWeaponPicker,
  showSpellPicker, setShowSpellPicker,
  showConsumablePicker, setShowConsumablePicker,
  showReadyModal, setShowReadyModal,
  readyTriggerPrompt,
  encounter,
  inCombat,
  campaign,
  pendingLoot, setPendingLoot,
  applyLevelUp,
  advanceGameTime,
  openNpcInteraction,
  handleAreaTransition,
  handleCombatAction,
  handleWeaponSelected,
  handleSpellSelected,
  handleConsumableUsed,
  executeReadiedAction,
  passReadiedAction,
  executeMoveWithOA,
  pendingOA, setPendingOA,
  startCombatFromMenu,
  handleEndTurn,
  playerPos,
  zone,
  pixiRef,
  encounterRewards,
  showDebug,
  playerPosRef,
  onLeave,
}) {
  return (
    <>
      <Suspense fallback={null}>
        <DiceTray open={toolPanel === 'dice'} onClose={() => setToolPanel(null)} />
      </Suspense>
      {stealthMode?.active && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(26, 26, 26, 0.95)', border: '2px solid #2ecc71',
          borderRadius: 4, padding: '8px 16px', zIndex: 90,
          fontFamily: 'Cinzel, serif', color: '#2ecc71', fontSize: 13,
          letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 0 12px rgba(46, 204, 113, 0.2)',
        }}>
          <span style={{ fontSize: 16 }}>👁</span>
          SNEAKING — Stealth: {stealthMode.stealthResult}
        </div>
      )}
      {sheetChar && (
        <Suspense fallback={null}>
          <CharacterSheetModal character={sheetChar} onClose={() => { setSheetChar(null); setActiveMode(null) }} />
        </Suspense>
      )}
      {activeMode_ === 'map' && (
        <Suspense fallback={null}>
          <WorldMap open={true} onClose={() => setActiveMode(null)} />
        </Suspense>
      )}
      {activeMode_ === 'character' && sheetChar && (
        <Suspense fallback={null}>
          <CharacterSheetModal character={sheetChar} onClose={() => { setActiveMode(null) }} />
        </Suspense>
      )}
      {activeMode_ === 'inventory' && myCharacter && (
        <Suspense fallback={null}>
          <Inventory_
            items={myCharacter.inventory || []}
            equipment={myCharacter.equipment || {}}
            gold={myCharacter.gold || 0}
            onEquip={() => {}}
            onUse={() => {}}
            onDrop={() => {}}
            onClose={() => setActiveMode(null)}
          />
        </Suspense>
      )}
      {showApiSettings && <ApiKeySettings userId={user?.id} onClose={() => setShowApiSettings(false)} />}
      {showJournal && (
        <Suspense fallback={null}>
          <JournalModal onClose={() => setShowJournal(false)} />
        </Suspense>
      )}
      {showFactions && (
        <Suspense fallback={null}>
          <FactionReputation onClose={() => setShowFactions(false)} />
        </Suspense>
      )}
      {restProposal && (
        <Suspense fallback={null}>
          <RestModal
            type={restProposal.type} proposedBy={restProposal.proposedBy}
            partyMembers={[{ id: user?.id, name: myCharacter?.name || 'You' }]}
            isHost={false}
            onResolve={() => { advanceGameTime(restProposal.type === 'long' ? 8 : 1); setRestProposal(null) }}
            onCancel={() => setRestProposal(null)}
          />
        </Suspense>
      )}
      {showInteractionMenu && !inCombat && (
        <Suspense fallback={null}>
          <InteractionMenu
            playerPos={playerPos}
            zone={zone}
            onTalk={openNpcInteraction}
            onExit={handleAreaTransition}
            onClose={() => setShowInteractionMenu(false)}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        {activeNpc && !activeNpc.isCutscene && <NpcDialog npc={activeNpc} onClose={() => setActiveNpc(null)} />}
        {activeNpc && activeNpc.isCutscene && <StoryCutscene npc={activeNpc} pixiRef={pixiRef} onClose={() => setActiveNpc(null)} isWatching={false} />}
        {!activeNpc && activeCutscene && activeCutscene.initiatorId !== user?.id && (
          <StoryCutscene
            npc={{ name: activeCutscene.npcName, criticalInfo: activeCutscene.criticalInfo, role: '' }}
            pixiRef={pixiRef} onClose={() => {}} isWatching={true}
          />
        )}
      </Suspense>
      {showLevelUp && myCharacter && (
        <Suspense fallback={null}>
          <LevelUpModal
            character={myCharacter}
            onConfirm={(updates) => { applyLevelUp(updates); dismissedLevelRef.current = myCharacter.level; setShowLevelUp(false) }}
            onCancel={() => { dismissedLevelRef.current = myCharacter.level; setShowLevelUp(false) }}
          />
        </Suspense>
      )}
      {pendingLoot && (
        <Suspense fallback={null}>
          <LootScreen enemies={pendingLoot.enemies} partySize={pendingLoot.partySize} onDone={() => setPendingLoot(null)} />
        </Suspense>
      )}
      <OAConfirmModal
        pendingOA={pendingOA}
        onConfirm={() => { executeMoveWithOA(pendingOA); setPendingOA(null) }}
        onCancel={() => setPendingOA(null)}
      />
      {showWeaponPicker && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <WeaponPickerModal
          attacks={encounter.combatants[encounter.currentTurn].attacks || []}
          character={encounter.combatants[encounter.currentTurn]}
          onSelect={handleWeaponSelected}
          onClose={() => setShowWeaponPicker(false)}
        />
      )}
      {showSpellPicker && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <SpellPickerModal
          character={encounter.combatants[encounter.currentTurn]}
          spellSlots={encounter.combatants[encounter.currentTurn].spellSlots || {}}
          onSelect={handleSpellSelected}
          onClose={() => setShowSpellPicker(false)}
          cantripsOnly={!!encounter.combatants[encounter.currentTurn].leveledSpellCastThisTurn}
        />
      )}
      {showConsumablePicker && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <ConsumablePickerModal
          character={encounter.combatants[encounter.currentTurn]}
          onSelect={handleConsumableUsed}
          onClose={() => setShowConsumablePicker(false)}
        />
      )}
      {showReadyModal && inCombat && encounter.combatants?.[encounter.currentTurn] && (
        <ReadyActionModal
          combatant={encounter.combatants[encounter.currentTurn]}
          onConfirm={(readyData) => handleCombatAction('ready-confirm', readyData)}
          onCancel={() => setShowReadyModal(false)}
        />
      )}
      {readyTriggerPrompt && (
        <ReadyActionPrompt
          readiedAction={readyTriggerPrompt.readiedAction}
          triggerDescription={readyTriggerPrompt.triggerDescription}
          onExecute={executeReadiedAction}
          onPass={passReadiedAction}
        />
      )}
      {activeShop && (
        <Suspense fallback={null}>
          <ShopPanel
            npc={activeShop.npc}
            shopType={activeShop.shopType}
            onClose={() => setActiveShop(null)}
          />
        </Suspense>
      )}
      {showFormation && (
        <Suspense fallback={null}>
          <FormationPanel onClose={() => setShowFormation(false)} />
        </Suspense>
      )}
      {showDebug && (
        <Suspense fallback={null}>
          <CombatDebugOverlay />
        </Suspense>
      )}
      {showDeathOptions && (
        <Suspense fallback={null}>
          <GameOverModal
            onRevive={() => {}}
            onLeave={() => { onLeave() }}
          />
        </Suspense>
      )}
      {showVictory && (
        <Suspense fallback={null}>
          <VictoryScreen
            encounter={encounter}
            loot={{ items: [] }}
            rewards={encounterRewards || { xp: 0, gold: 0 }}
            onContinue={() => setShowVictory(false)}
          />
        </Suspense>
      )}
      {showDefeat && (
        <Suspense fallback={null}>
          <DefeatScreen
            encounter={encounter}
            defeats={encounter.combatants?.filter(c => c.type === 'player' && (c.currentHp ?? 0) <= 0) || []}
            onRetry={() => { setShowDefeat(false); }}
            onContinue={() => { setShowDefeat(false); onLeave() }}
          />
        </Suspense>
      )}
      {showPreCombat && pendingCombatEnemies && (
        <Suspense fallback={null}>
          <PreCombatMenu
            enemies={pendingCombatEnemies}
            onSneak={() => { setShowPreCombat(false) }}
            onTalk={() => { setShowPreCombat(false) }}
            onPickpocket={() => { setShowPreCombat(false) }}
            onAmbush={() => startCombatFromMenu(pendingCombatEnemies)}
            onCharge={() => startCombatFromMenu(pendingCombatEnemies)}
            onCancel={() => { setShowPreCombat(false) }}
          />
        </Suspense>
      )}
      {showSessionResume && myCharacter && (
        <Suspense fallback={null}>
          <SessionResume
            sessionData={{
              campaignName: campaign?.title || 'Your Campaign',
              lastSessionDate: myCharacter.lastPlayedAt || new Date().toISOString(),
              currentLocation: zone?.title || 'Exploration',
              locationDescription: zone?.description || zone?.narrative || 'A mysterious place awaits your return.'
            }}
            characters={[myCharacter]}
            recap={`Your adventure continues in ${zone?.title || 'the world'}... Character Level: ${myCharacter.level}, HP: ${myCharacter.currentHp || myCharacter.hp}/${myCharacter.hp}`}
            onResume={() => setShowSessionResume(false)}
          />
        </Suspense>
      )}
      {showSpellTargeting && pendingSpell && inCombat && (
        <Suspense fallback={null}>
          <SpellTargeting
            spell={pendingSpell}
            encounter={encounter}
            onConfirm={({ position, targets }) => { handleCombatAction('spell-confirm', { spell: pendingSpell, position, targets }); setShowSpellTargeting(false) }}
            onCancel={() => { setShowSpellTargeting(false) }}
          />
        </Suspense>
      )}
      {/* CombatUI removed — combat actions handled by CombatActionBar in BottomBar */}
    </>
  )
}
