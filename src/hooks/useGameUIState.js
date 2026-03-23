import { useState, useEffect, useRef } from 'react'

export function useGameUIState({ myCharacter, activeMode, onModeSelect }) {
  const [toolPanel, setToolPanel] = useState(null)
  const [sheetChar, setSheetChar] = useState(null)
  const [activeMode_, setActiveMode_] = useState(null)
  const [restProposal, setRestProposal] = useState(null)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [showJournal, setShowJournal] = useState(false)
  const [showFactions, setShowFactions] = useState(false)
  const [activeNpc, setActiveNpc] = useState(null)
  const [activeShop, setActiveShop] = useState(null)
  const [worldTransform, setWorldTransform] = useState(null)
  const [showFormation, setShowFormation] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showInteractionMenu, setShowInteractionMenu] = useState(false)
  const [showVictory, setShowVictory] = useState(false)
  const [showDefeat, setShowDefeat] = useState(false)
  const [showPreCombat, setShowPreCombat] = useState(false)
  const [pendingCombatEnemies, setPendingCombatEnemies] = useState(null)
  const [showSessionResume, setShowSessionResume] = useState(false)
  const [showSpellTargeting, setShowSpellTargeting] = useState(false)
  const [pendingSpell, setPendingSpell] = useState(null)

  const dismissedLevelRef = useRef(null)
  const dialogOpenRef = useRef(false)
  const handleInteractRef = useRef(null)
  const handleChatRef = useRef(null)

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      switch (e.key.toLowerCase()) {
        case 'c':
          setActiveMode_(prev => prev === 'character' ? null : 'character')
          if (activeMode_ !== 'character') setSheetChar(myCharacter)
          else setSheetChar(null)
          break
        case 'i':
          setActiveMode_(prev => prev === 'inventory' ? null : 'inventory')
          if (activeMode_ !== 'inventory') setSheetChar(myCharacter)
          else setSheetChar(null)
          break
        case 'j':
          setShowJournal(prev => !prev)
          break
        case 'm':
          setActiveMode_(prev => prev === 'map' ? null : 'map')
          break
        case 'escape':
          setActiveMode_(null)
          setSheetChar(null)
          setShowJournal(false)
          setShowApiSettings(false)
          setShowFormation(false)
          setToolPanel(null)
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeMode_, myCharacter])

  return {
    toolPanel, setToolPanel,
    sheetChar, setSheetChar,
    activeMode_, setActiveMode_,
    restProposal, setRestProposal,
    showApiSettings, setShowApiSettings,
    showJournal, setShowJournal,
    showFactions, setShowFactions,
    activeNpc, setActiveNpc,
    activeShop, setActiveShop,
    worldTransform, setWorldTransform,
    showFormation, setShowFormation,
    showLevelUp, setShowLevelUp,
    showInteractionMenu, setShowInteractionMenu,
    showVictory, setShowVictory,
    showDefeat, setShowDefeat,
    showPreCombat, setShowPreCombat,
    pendingCombatEnemies, setPendingCombatEnemies,
    showSessionResume, setShowSessionResume,
    showSpellTargeting, setShowSpellTargeting,
    pendingSpell, setPendingSpell,
    dismissedLevelRef,
    dialogOpenRef,
    handleInteractRef,
    handleChatRef,
  }
}
