import { useEffect, useCallback, useState } from 'react'
import useStore from '../store/useStore'
import { getAvailableInteractions } from '../lib/interactionController'
import {
  attemptPickpocket, attemptLockpick, attemptForceOpen,
  attemptSearch, generateChestLoot,
} from '../lib/worldInteractions'
import { broadcastEncounterAction } from '../lib/liveChannel'

const ACTION_ICONS = {
  talk: '\u{1F5E3}',       // speech bubble
  pickpocket: '\u{1F91E}', // fingers crossed (sneaky)
  lockpick: '\u{1F511}',   // key
  force_open: '\u{1F4AA}', // muscle
  open_chest: '\u{1F4E6}', // package
  search: '\u{1F50D}',     // magnifying glass
  search_area: '\u{1F50E}', // magnifying glass right
  exit: '\u{1F6AA}',       // door
}

const ACTION_LABELS = {
  talk: 'Talk',
  pickpocket: 'Pickpocket',
  lockpick: 'Pick Lock',
  force_open: 'Force Open',
  open_chest: 'Open',
  search: 'Search',
  search_area: 'Search Area',
  exit: 'Travel',
}

/**
 * Context menu that appears when player presses E near an interactable.
 * Shows available actions based on proximity.
 */
export default function InteractionMenu({
  playerPos,
  zone,
  onTalk,
  onExit,
  onClose,
}) {
  const myCharacter = useStore(s => s.myCharacter)
  const addNarratorMessage = useStore(s => s.addNarratorMessage)
  const addGold = useStore(s => s.addGold)
  const [result, setResult] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const actions = getAvailableInteractions(playerPos, zone)

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(0, i - 1))
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(actions.length - 1, i + 1))
      }
      if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        // Execute selected action
        document.querySelector('[data-interaction-selected="true"]')?.click()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, actions.length])

  // Auto-close after result display
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => { setResult(null); onClose() }, 2500)
      return () => clearTimeout(timer)
    }
  }, [result, onClose])

  const handleAction = useCallback((action) => {
    const { type, target } = action
    const charName = myCharacter?.name || 'You'

    switch (type) {
      case 'talk': {
        onTalk(target)
        onClose()
        return
      }
      case 'exit': {
        onExit(target)
        onClose()
        return
      }
      case 'pickpocket': {
        const result = attemptPickpocket(myCharacter, target)
        if (result.success) {
          const lootDesc = result.loot.gold
            ? `${result.loot.gold} gold`
            : result.loot.name
          addNarratorMessage({
            role: 'dm', speaker: 'DM',
            text: `${charName} deftly lifts ${lootDesc} from ${target.name}'s pocket. (Sleight of Hand: ${result.roll.total} vs DC ${result.dc})`,
          })
          if (result.loot.gold) {
            addGold?.(result.loot.gold)
          }
          broadcastEncounterAction({ type: 'pickpocket', charName, npc: target.name, success: true, loot: lootDesc })
        } else {
          const reactionText = result.npcReaction === 'hostile'
            ? `${target.name} catches ${charName}'s hand! "Thief!" they cry out in anger.`
            : result.npcReaction === 'alarmed'
            ? `${target.name} flinches away. "Watch your hands, stranger!"`
            : `${target.name} gives ${charName} a suspicious look.`
          addNarratorMessage({
            role: 'dm', speaker: 'DM',
            text: `${reactionText} (Sleight of Hand: ${result.roll.total} vs DC ${result.dc} — Failed)`,
          })
          broadcastEncounterAction({ type: 'pickpocket', charName, npc: target.name, success: false })
        }
        setResult({ success: result.success, text: result.success ? 'Success!' : 'Caught!' })
        return
      }
      case 'lockpick': {
        const result = attemptLockpick(myCharacter, target)
        if (result.success) {
          addNarratorMessage({
            role: 'dm', speaker: 'DM',
            text: `${charName} picks the lock with a satisfying click. (DC ${result.dc}: ${result.roll.total}${result.hasTools ? ' w/ Thieves\' Tools' : ''})`,
          })
          // Mark as unlocked and open
          target.locked = false
          const loot = generateChestLoot(target.lootTable)
          showChestLoot(charName, target, loot, addNarratorMessage, addGold)
          target.opened = true
          broadcastEncounterAction({ type: 'lockpick', id: target.id, success: true })
        } else {
          const brokeText = result.broken ? ' The lockpick snaps!' : ''
          addNarratorMessage({
            role: 'dm', speaker: 'DM',
            text: `${charName} fails to pick the lock.${brokeText} (DC ${result.dc}: ${result.roll.total})`,
          })
          broadcastEncounterAction({ type: 'lockpick', id: target.id, success: false })
        }
        setResult({ success: result.success, text: result.success ? 'Unlocked!' : 'Failed!' })
        return
      }
      case 'force_open': {
        const result = attemptForceOpen(myCharacter, target)
        if (result.success) {
          addNarratorMessage({
            role: 'dm', speaker: 'DM',
            text: `${charName} forces the lock open with brute strength! (Athletics DC ${result.dc}: ${result.roll.total})`,
          })
          target.locked = false
          const loot = generateChestLoot(target.lootTable)
          showChestLoot(charName, target, loot, addNarratorMessage, addGold)
          target.opened = true
          broadcastEncounterAction({ type: 'force-open', id: target.id, success: true })
        } else {
          addNarratorMessage({
            role: 'dm', speaker: 'DM',
            text: `${charName} strains against the lock but it holds firm. The noise echoes... (Athletics DC ${result.dc}: ${result.roll.total})`,
          })
          broadcastEncounterAction({ type: 'force-open', id: target.id, success: false })
        }
        setResult({ success: result.success, text: result.success ? 'Smashed open!' : 'Too tough!' })
        return
      }
      case 'open_chest': {
        const loot = generateChestLoot(target.lootTable)
        showChestLoot(charName, target, loot, addNarratorMessage, addGold)
        target.opened = true
        broadcastEncounterAction({ type: 'open-chest', id: target.id })
        setResult({ success: true, text: 'Opened!' })
        return
      }
      case 'search':
      case 'search_area': {
        const dc = target.dc || 12
        const searchResult = attemptSearch(myCharacter, dc)
        if (searchResult.success) {
          const findTexts = searchResult.finds.map(f =>
            f.gold ? `${f.gold} gold` : f.name
          )
          addNarratorMessage({
            role: 'dm', speaker: 'DM',
            text: `${charName} searches carefully and finds: ${findTexts.join(', ')}! (Investigation DC ${dc}: ${searchResult.roll.total})`,
          })
          for (const find of searchResult.finds) {
            if (find.gold) addGold?.(find.gold)
          }
          if (target.id) target.opened = true
          broadcastEncounterAction({ type: 'search', id: target.id, success: true, finds: findTexts })
        } else {
          addNarratorMessage({
            role: 'dm', speaker: 'DM',
            text: `${charName} searches but finds nothing of interest. (Investigation DC ${dc}: ${searchResult.roll.total})`,
          })
          broadcastEncounterAction({ type: 'search', id: target.id, success: false })
        }
        setResult({ success: searchResult.success, text: searchResult.success ? 'Found something!' : 'Nothing here.' })
        return
      }
    }
  }, [myCharacter, addNarratorMessage, addGold, onTalk, onExit, onClose])

  if (actions.length === 0) return null

  // If only one non-search action, auto-execute it
  if (actions.length === 1 && actions[0].type === 'exit') {
    onExit(actions[0].target)
    onClose()
    return null
  }
  if (actions.length === 1 && actions[0].type === 'talk') {
    onTalk(actions[0].target)
    onClose()
    return null
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.menu}>
        <div style={styles.header}>
          <span style={styles.title}>Actions</span>
          <button style={styles.closeBtn} onClick={onClose}>ESC</button>
        </div>
        <div style={styles.divider} />
        {result ? (
          <div style={{
            ...styles.result,
            color: result.success ? '#44cc44' : '#cc4444',
          }}>
            {result.text}
          </div>
        ) : (
          <div style={styles.actions}>
            {actions.map((action, i) => (
              <button
                key={`${action.type}-${i}`}
                data-interaction-selected={i === selectedIdx ? 'true' : 'false'}
                style={{
                  ...styles.actionBtn,
                  ...(i === selectedIdx ? styles.actionBtnSelected : {}),
                }}
                onClick={() => handleAction(action)}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <span style={styles.icon}>{ACTION_ICONS[action.type]}</span>
                <span style={styles.label}>{ACTION_LABELS[action.type]}</span>
                {action.target?.name && action.type !== 'exit' && (
                  <span style={styles.targetName}>({action.target.name})</span>
                )}
                {action.target?.label && action.type !== 'talk' && action.type !== 'pickpocket' && (
                  <span style={styles.targetName}>({action.target.label})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function showChestLoot(charName, chest, loot, addNarratorMessage, addGold) {
  const parts = []
  if (loot.gold > 0) {
    parts.push(`${loot.gold} gold`)
    addGold?.(loot.gold)
  }
  for (const item of loot.items) {
    parts.push(item.name)
  }
  addNarratorMessage({
    role: 'dm', speaker: 'DM',
    text: `${charName} opens the ${chest.label || 'chest'} and finds: ${parts.join(', ')}.`,
  })
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.3)',
  },
  menu: {
    background: 'linear-gradient(180deg, rgba(30,22,14,0.97) 0%, rgba(20,14,8,0.97) 100%)',
    border: '2px solid #c9a84c',
    borderRadius: 10,
    padding: '12px 16px',
    minWidth: 220,
    maxWidth: 320,
    fontFamily: "'Cinzel', Georgia, serif",
    color: '#e8dcc8',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(201,168,76,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    color: '#c9a84c',
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  closeBtn: {
    background: 'none',
    border: '1px solid rgba(201,168,76,0.3)',
    color: '#c9a84c',
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, #c9a84c40, transparent)',
    marginBottom: 8,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(201,168,76,0.06)',
    border: '1px solid rgba(201,168,76,0.15)',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: "'Cinzel', Georgia, serif",
    color: '#e8dcc8',
    fontSize: 13,
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  actionBtnSelected: {
    background: 'rgba(201,168,76,0.18)',
    border: '1px solid rgba(201,168,76,0.5)',
    color: '#c9a84c',
  },
  icon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
    flexShrink: 0,
  },
  label: {
    fontWeight: 600,
  },
  targetName: {
    fontSize: 11,
    opacity: 0.6,
    marginLeft: 'auto',
  },
  result: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 700,
    padding: '16px 0',
    letterSpacing: '0.05em',
  },
}
