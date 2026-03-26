import { useState, useCallback, useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { rollDamage } from '../lib/dice'
import { findOATriggers, resolveOA } from '../lib/opportunityAttack.js'
import { calculateCover, COVER_BONUS, buildPropCoverSet } from '../lib/cover.js'
import { getTilesInSphere, getTilesInCone, getTilesInLine, getTilesInCube, renderAoEPreview, clearAoEPreview } from '../engine/AoEOverlay'
import { renderMovementRange, clearMovementRange } from '../engine/MovementRange'
import { findPathEdge, getReachableTilesEdge } from '../lib/pathfinding'
import { animateTokenAlongPath, isAnimating } from '../engine/TokenLayer'
import { broadcastEncounterAction } from '../lib/liveChannel'
import { getSaveProficiencies, profBonus as getProfBonus, abilityMod } from '../lib/derivedStats.js'
import { resolveContestedCheck } from '../lib/contestedCheck.js'
import { getExtraAttacks, CLASSES } from '../data/classes.js'
import { checkReadiedTrigger as checkTrigger, resolveReadiedAttack as resolveReady } from '../lib/readiedAction.js'
import { handleClassAbility } from '../lib/classAbilityHandlers.js'

/**
 * Encapsulates all combat-specific logic: attack targeting, spell AoE,
 * combat movement (with opportunity attacks), movement range rendering,
 * cover calculation, enemy auto-turns, and combat camera lock.
 */
export function useCombatActions({ zone, encounter, pixiRef, cameraRef, sessionApiKey, addNarratorMessage, narrateCombatAction, inCombat, isDM, setShowSpellTargeting, setPendingSpell }) {
  const nextEncounterTurn = useStore(s => s.nextEncounterTurn)
  const runEnemyTurn = useStore(s => s.runEnemyTurn)
  const activeCampaign = useStore(s => s.activeCampaign)
  // In solo/demo mode (no Supabase campaign), this client runs enemy AI.
  // In multiplayer, only the DM/host runs it.
  const shouldRunEnemyAI = isDM || !activeCampaign

  const [targetingMode, setTargetingMode] = useState(null)
  const [pendingOA, setPendingOA] = useState(null)
  const [showWeaponPicker, setShowWeaponPicker] = useState(false)
  const [showSpellPicker, setShowSpellPicker] = useState(false)
  const [selectedWeapon, setSelectedWeapon] = useState(null)
  const [showConsumablePicker, setShowConsumablePicker] = useState(false)
  const [showReadyModal, setShowReadyModal] = useState(false)
  const [readyTriggerPrompt, setReadyTriggerPrompt] = useState(null) // { combatantId, readiedAction, triggerDescription, targetId }
  const reachableTilesRef = useRef(new Set())
  const propCoverRef = useRef(new Set())

  // --- Escape to cancel targeting mode or close pickers ---
  useEffect(() => {
    if (!targetingMode && !showWeaponPicker && !showSpellPicker && !showConsumablePicker && !showReadyModal) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showWeaponPicker) { setShowWeaponPicker(false); return }
        if (showSpellPicker) { setShowSpellPicker(false); return }
        if (showConsumablePicker) { setShowConsumablePicker(false); return }
        if (showReadyModal) { setShowReadyModal(false); return }
        setTargetingMode(null)
        setSelectedWeapon(null)
        const layer = pixiRef.current?.getMovementRangeLayer?.()
        if (layer) clearAoEPreview(layer)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [targetingMode, showWeaponPicker, showSpellPicker, showConsumablePicker, showReadyModal])

  // --- Combat camera lock (area camera mode only) ---
  // Compute bounds ONCE when combat starts, not on every combatant change.
  // This prevents camera snapping when combatants move or take actions.
  const combatBoundsRef = useRef(null)
  useEffect(() => {
    const cam = cameraRef.current
    if (!cam) return
    if (inCombat && encounter.combatants?.length) {
      // Only compute bounds once at combat start
      if (!combatBoundsRef.current) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const c of encounter.combatants) {
          if (c.position) {
            minX = Math.min(minX, c.position.x)
            minY = Math.min(minY, c.position.y)
            maxX = Math.max(maxX, c.position.x)
            maxY = Math.max(maxY, c.position.y)
          }
        }
        if (minX !== Infinity) {
          combatBoundsRef.current = { x: minX - 2, y: minY - 2, width: maxX - minX + 4, height: maxY - minY + 4 }
          cam.setCombatBounds(combatBoundsRef.current)
        }
      }
    } else {
      combatBoundsRef.current = null
      cam.setCombatBounds(null)
    }
  }, [inCombat])

  // --- Show movement range during the active player's combat turn ---
  useEffect(() => {
    const mrLayer = pixiRef.current?.getMovementRangeLayer?.()
    if (!mrLayer) return

    if (!inCombat || !zone?.wallEdges) {
      clearMovementRange(mrLayer)
      reachableTilesRef.current = new Set()
      return
    }

    const active = encounter.combatants?.[encounter.currentTurn]
    if (!active || active.isEnemy || !active.position || (active.currentHp ?? 0) <= 0) {
      clearMovementRange(mrLayer)
      reachableTilesRef.current = new Set()
      return
    }

    const enemyTiles = new Set(
      encounter.combatants
        .filter(c => c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position)
        .map(c => `${c.position.x},${c.position.y}`)
    )

    const maxMove = active.remainingMove ?? Math.floor((active.speed || 30) / 5)
    const reachable = getReachableTilesEdge(
      { wallEdges: zone.wallEdges, cellBlocked: zone.cellBlocked || new Uint8Array(zone.width * zone.height) },
      zone.width, zone.height,
      active.position,
      maxMove,
      null,
      enemyTiles
    )
    reachableTilesRef.current = reachable

    const tileSize = zone.tileSize || 200
    renderMovementRange(mrLayer, reachable, 0x44cc66, 0.15, tileSize)

    return () => {
      clearMovementRange(mrLayer)
      reachableTilesRef.current = new Set()
    }
  }, [encounter.currentTurn, encounter.phase, encounter.combatants, inCombat, zone])

  // --- Build prop cover set when combat starts ---
  useEffect(() => {
    if (inCombat && zone?.layers?.props && zone?.palette) {
      propCoverRef.current = buildPropCoverSet(zone.layers.props, zone.palette, zone.width, zone.height)
    } else {
      propCoverRef.current = new Set()
    }
  }, [inCombat, zone])

  // --- Cancel spell targeting when combat ends ---
  useEffect(() => {
    if (!inCombat) {
      pixiRef.current?.cancelSpellTargeting?.()
    }
  }, [inCombat])

  // --- Auto-run enemy turns (DM/host only to prevent duplicate execution) ---
  useEffect(() => {
    if (!inCombat || !shouldRunEnemyAI) return
    const active = encounter.combatants?.[encounter.currentTurn]
    if (!active || !active.isEnemy) return

    // Skip dead enemies — advance turn immediately
    if ((active.currentHp ?? 0) <= 0) {
      const t = setTimeout(() => {
        nextEncounterTurn()
        broadcastEncounterAction({ type: 'next-turn', userId: 'system' })
      }, 600)
      return () => clearTimeout(t)
    }

    const apiKey = sessionApiKey
    const timer = setTimeout(() => {
      try {
        const result = runEnemyTurn(apiKey || '')
        Promise.resolve(result).then(() => {
        }).catch((err) => {
          console.error('[CombatAI] Enemy turn FAILED:', active.name, err)
          nextEncounterTurn()
          broadcastEncounterAction({ type: 'next-turn', userId: 'system' })
        })
      } catch (err) {
        console.error('[CombatAI] runEnemyTurn threw synchronously:', err)
        nextEncounterTurn()
        broadcastEncounterAction({ type: 'next-turn', userId: 'system' })
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [encounter.currentTurn, encounter.phase, inCombat, shouldRunEnemyAI, runEnemyTurn, sessionApiKey, nextEncounterTurn])

  // --- Check readied action triggers after each enemy turn ---
  // When the turn changes, check if the just-completed enemy turn triggered any readied actions.
  const prevTurnRef = useRef(encounter.currentTurn)
  useEffect(() => {
    if (!inCombat || prevTurnRef.current === encounter.currentTurn) return
    const prevIdx = prevTurnRef.current
    prevTurnRef.current = encounter.currentTurn
    const combatants = encounter.combatants || []
    const prevActive = combatants[prevIdx]
    if (!prevActive?.isEnemy || (prevActive.currentHp ?? 0) <= 0) return

    // Check move-based triggers (enemy just moved and is now near a player with readied action)
    const myChar = useStore.getState().myCharacter
    for (const c of combatants) {
      if (!c.readiedAction || c.reactionUsed || (c.currentHp ?? 1) <= 0) continue
      if (c.id !== myChar?.id) continue
      const triggered = checkTrigger(c.readiedAction, 'move', {
        moverId: prevActive.id,
        moverName: prevActive.name,
        moverIsEnemy: true,
        toPos: prevActive.position,
      }, c)
      if (triggered) {
        setReadyTriggerPrompt({
          combatantId: c.id,
          readiedAction: c.readiedAction,
          triggerDescription: `${prevActive.name} moved into range!`,
          targetId: prevActive.id,
        })
        break
      }
    }
  }, [encounter.currentTurn, inCombat, encounter.combatants])

  // --- Handle combat tile click (attack, spell, movement) ---
  // Returns true if click was handled by combat logic, false otherwise
  const handleCombatTileClick = useCallback(({ x, y }) => {
    // Block all combat tile clicks when it's not the player's turn or player is dead
    if (inCombat) {
      const active = encounter.combatants?.[encounter.currentTurn]
      const myChar = useStore.getState().myCharacter
      if (!active || active.type === 'enemy' || active.id !== myChar?.id) return true // consume click but do nothing
      // Block all actions when player is dead/dying (0 HP)
      if ((active.currentHp ?? 0) <= 0) return true
    }

    // Attack targeting — resolve attack on clicked enemy
    if (targetingMode === 'attack' && inCombat) {
      const target = encounter.combatants.find(c =>
        c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position?.x === x && c.position?.y === y
      )
      if (!target) return true // Clicked empty tile — ignore but consume

      const active = encounter.combatants[encounter.currentTurn]
      if (!active || !active.position) return true

      // Guard: action already used this turn (prevent double-attack race condition)
      // Allow bonus action attacks (Martial Arts, Flurry of Blows) even if action is used
      const isBonusStrike = !!selectedWeapon && (selectedWeapon.name?.includes('Martial Arts') || selectedWeapon.name?.includes('Flurry'))
      if (active.actionsUsed && !isBonusStrike) {
        setTargetingMode(null)
        setSelectedWeapon(null)
        return true
      }

      const dist = Math.max(Math.abs(active.position.x - x), Math.abs(active.position.y - y))
      // Use selectedWeapon (from weapon picker or class ability) if set, otherwise first attack
      const weapon = selectedWeapon || active.attacks?.[0] || { name: 'Unarmed Strike', bonus: '+0', damage: '1' }
      const isRanged = weapon.range != null
      const maxRange = isRanged ? Math.floor((weapon.range || 80) / 5) : 1

      if (dist > maxRange) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Target out of range.' })
        return true
      }

      // Save-based spell resolution (Sacred Flame, Poison Spray, etc.)
      if (selectedWeapon?.isSaveSpell) {
        const saveAbility = selectedWeapon.save.toLowerCase()
        const casterAbility = active.class === 'Cleric' ? 'wis' : active.class === 'Wizard' ? 'int' : active.class === 'Druid' ? 'wis' : 'cha'
        const casterMod = Math.floor(((active.stats?.[casterAbility] || 10) - 10) / 2)
        const profBonusVal = Math.ceil((active.level || 1) / 4) + 1
        const saveDC = 8 + profBonusVal + casterMod

        const targetSaveProfs = target.class ? getSaveProficiencies(target.class) : []
        const baseSaveMod = Math.floor(((target.stats?.[saveAbility] || 10) - 10) / 2)
        const saveProfBonus = targetSaveProfs.includes(saveAbility) ? getProfBonus(target.level || 1) : 0
        const saveMod = baseSaveMod + saveProfBonus
        const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod
        const saved = saveRoll >= saveDC

        const dmgResult = rollDamage(selectedWeapon.damage)
        const damage = saved ? 0 : dmgResult.total

        if (damage > 0) {
          const { applyEncounterDamage: applyDmg } = useStore.getState()
          applyDmg(target.id || target.name, damage)
        }

        // Consume action (or bonus action if Quickened Spell active)
        if (active.quickenedSpell) {
          const { useBonusAction } = useStore.getState()
          useBonusAction(active.id)
          useStore.setState(state => ({
            encounter: { ...state.encounter, combatants: state.encounter.combatants.map(c =>
              c.id === active.id ? { ...c, quickenedSpell: false } : c
            ) },
          }))
        } else {
          const { useAction: consumeAction } = useStore.getState()
          consumeAction(active.id)
        }

        // Consume spell slot (if not cantrip)
        if (selectedWeapon.castLevel > 0) {
          const { useSpellSlot } = useStore.getState()
          useSpellSlot(active.id, selectedWeapon.castLevel)
        }

        const entry = saved
          ? `${active.name} casts ${selectedWeapon.name} on ${target.name}! ${saveAbility.toUpperCase()} save: ${saveRoll} vs DC ${saveDC} — SAVE! No damage.`
          : `${active.name} casts ${selectedWeapon.name} on ${target.name}! ${saveAbility.toUpperCase()} save: ${saveRoll} vs DC ${saveDC} — FAIL! ${damage} ${selectedWeapon.damageType} damage.`

        addNarratorMessage({ role: 'dm', speaker: 'Combat', text: entry })
        broadcastEncounterAction({ type: 'attack-result', attackerId: active.id, targetId: target.id, hit: !saved, damage, log: entry })

        setTargetingMode(null)
        setSelectedWeapon(null)
        return true
      }

      const coverType = calculateCover(active.position, { x, y }, zone.wallEdges, propCoverRef.current, zone.width)
      const coverBonus = COVER_BONUS[coverType] || 0
      const effectiveAC = (target.ac || 10) + coverBonus

      // Determine how many hits (Flurry of Blows = 2, normal = 1)
      // Extra Attack: martial classes get 2+ attacks per action at level 5+
      const isBonusAttack = !!selectedWeapon && (selectedWeapon.name?.includes('Martial Arts') || selectedWeapon.name?.includes('Flurry'))
      const extraAttackCount = isBonusAttack ? 1 : getExtraAttacks(active.class, active.level || 1)
      const numHits = weapon.flurryHits || extraAttackCount
      let totalDamageDealt = 0
      const logEntries = []

      // Check if Help action granted advantage on this target
      const hasHelpAdvantage = !!target.helpAdvantage
      if (hasHelpAdvantage) {
        // Consume the help advantage (one-time use)
        useStore.setState(state => ({
          encounter: {
            ...state.encounter,
            combatants: state.encounter.combatants.map(c =>
              c.id === target.id ? { ...c, helpAdvantage: false, helpGrantedBy: null } : c
            ),
          },
        }))
      }

      // Check for Reckless Attack advantage (Barbarian)
      const hasReckless = !!active.recklessAttack
      let sneakAttackApplied = false

      for (let strike = 0; strike < numHits; strike++) {
        const bonus = parseInt(weapon.bonus) || 0
        let d20 = Math.floor(Math.random() * 20) + 1
        if ((hasHelpAdvantage && strike === 0) || hasReckless) {
          const d20b = Math.floor(Math.random() * 20) + 1
          d20 = Math.max(d20, d20b) // advantage: take higher roll
        }
        const total = d20 + bonus
        const isCrit = d20 === 20
        let hit = isCrit || total >= effectiveAC

        let damage = 0
        let bonusDmgNotes = ''
        if (hit) {
          const dmgResult = rollDamage(weapon.damage || '1')
          damage = isCrit ? dmgResult.total * 2 : dmgResult.total

          // Rage bonus damage (Barbarian, melee only)
          if (active.rageBonus && !weapon.name?.toLowerCase().includes('ranged')) {
            damage += active.rageBonus
            bonusDmgNotes += ` +${active.rageBonus} rage`
          }

          // Sneak Attack (Rogue, once per turn, finesse/ranged weapon)
          if (active.class === 'Rogue' && !sneakAttackApplied) {
            const cls = CLASSES.Rogue
            const saLevel = active.level || 1
            const saDice = cls?.sneakAttackDice?.[saLevel] || '1d6'
            const saResult = rollDamage(saDice)
            const saDmg = isCrit ? saResult.total * 2 : saResult.total
            damage += saDmg
            sneakAttackApplied = true
            bonusDmgNotes += ` +${saDmg} sneak`
          }

          // Divine Smite (Paladin, consume 1st-level spell slot on hit)
          if (active.divineSmiteReady && !isBonusAttack) {
            const smiteResult = rollDamage('2d8')
            const smiteDmg = isCrit ? smiteResult.total * 2 : smiteResult.total
            damage += smiteDmg
            bonusDmgNotes += ` +${smiteDmg} smite`
            // Consume the smite flag and a spell slot
            useStore.setState(state => ({
              encounter: {
                ...state.encounter,
                combatants: state.encounter.combatants.map(c =>
                  c.id === active.id ? { ...c, divineSmiteReady: false } : c
                ),
              },
            }))
            const { useSpellSlot } = useStore.getState()
            if (useSpellSlot) useSpellSlot(active.id, 1) // consume lowest slot
          }

          // Hunter's Mark extra damage (Ranger, 1d6 per hit on marked target)
          if (active.huntersMarkTarget && active.huntersMarkTarget === (target.id || target.name)) {
            const hmResult = rollDamage('1d6')
            damage += hmResult.total
            bonusDmgNotes += ` +${hmResult.total} hunter`
          }

          totalDamageDealt += damage

          // Stunning Strike resolution (Monk, on hit, target CON save or Stunned)
          if (hit && active.stunningStrikeReady) {
            const wisMod = Math.floor(((active.stats?.wis || 10) - 10) / 2)
            const prof = Math.ceil((active.level || 1) / 4) + 1
            const dc = 8 + prof + wisMod
            const conSave = Math.floor(Math.random() * 20) + 1 + Math.floor(((target.stats?.con || 10) - 10) / 2)
            if (conSave < dc) {
              useStore.getState().addEncounterCondition(target.id || target.name, 'Stunned')
              broadcastEncounterAction({ type: 'add-condition', id: target.id || target.name, condition: 'Stunned', userId: useStore.getState().user?.id || 'system' })
              bonusDmgNotes += ` [STUNNED! CON ${conSave} < DC ${dc}]`
            } else {
              bonusDmgNotes += ` [Stun resisted CON ${conSave} ≥ DC ${dc}]`
            }
            useStore.setState(state => ({
              encounter: { ...state.encounter, combatants: state.encounter.combatants.map(c =>
                c.id === active.id ? { ...c, stunningStrikeReady: false } : c
              ) },
            }))
          }
        }

        // Bardic Inspiration: on a miss, add inspiration die to attack roll — may turn it into a hit
        if (!hit && active.bardicInspiration) {
          const biResult = rollDamage(`1${active.bardicInspiration}`)
          const newTotal = total + biResult.total
          if (newTotal >= effectiveAC) {
            hit = true
            damage = rollDamage(weapon.damage || '1').total
            if (isCrit) damage *= 2
            totalDamageDealt += damage
            bonusDmgNotes += ` (Bardic +${biResult.total} turned miss→hit)`
            // Consume inspiration
            useStore.setState(state => ({
              encounter: { ...state.encounter, combatants: state.encounter.combatants.map(c =>
                c.id === active.id ? { ...c, bardicInspiration: null } : c
              ) },
            }))
          }
        }

        if (hit && damage > 0) {
          const { applyEncounterDamage: applyDmg } = useStore.getState()
          applyDmg(target.id || target.name, damage, weapon.damageType || undefined)
        }

        const coverNote = coverBonus > 0 ? ` (${coverType} cover +${coverBonus})` : ''
        const strikeLabel = numHits > 1 ? ` [Strike ${strike + 1}]` : ''
        const entry = hit
          ? `${active.name} → ${target.name}${strikeLabel}: HIT! d20(${d20})+${bonus}=${total} vs AC ${effectiveAC}${coverNote}. ${damage} damage${bonusDmgNotes}${isCrit ? ' (CRITICAL!)' : ''}.`
          : `${active.name} → ${target.name}${strikeLabel}: MISS. d20(${d20})+${bonus}=${total} vs AC ${effectiveAC}${coverNote}.`
        logEntries.push(entry)
      }

      // Attacking breaks Hidden condition
      if (active.conditions?.includes('Hidden')) {
        useStore.getState().removeEncounterCondition(active.id, 'Hidden')
      }

      // Consume action only for normal attacks (bonus attacks already consumed bonus action)
      if (!isBonusAttack) {
        const { useAction: consumeAction } = useStore.getState()
        consumeAction(active.id)
      }
      setTargetingMode(null)
      setSelectedWeapon(null)

      const fullLog = logEntries.join(' ')
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: fullLog })
      // Broadcast attack result + action economy state so all clients enforce turn rules
      const updatedActive = useStore.getState().encounter.combatants.find(c => c.id === active.id)
      broadcastEncounterAction({
        type: 'attack-result', attackerId: active.id, targetId: target.id,
        hit: totalDamageDealt > 0, damage: totalDamageDealt, log: fullLog,
        actionsUsed: updatedActive?.actionsUsed, bonusActionsUsed: updatedActive?.bonusActionsUsed,
      })
      return true
    }

    // Grapple targeting — contested Athletics vs Athletics/Acrobatics
    if (targetingMode === 'grapple' && inCombat) {
      const target = encounter.combatants.find(c =>
        c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position?.x === x && c.position?.y === y
      )
      if (!target) return true

      const active = encounter.combatants[encounter.currentTurn]
      if (!active?.position) return true

      // Must be adjacent (Chebyshev distance <= 1)
      const dx = Math.abs(active.position.x - target.position.x)
      const dy = Math.abs(active.position.y - target.position.y)
      if (dx > 1 || dy > 1) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Target must be adjacent (5 ft).' })
        return true
      }

      const { useAction: consumeAction, addEncounterCondition } = useStore.getState()
      const result = resolveContestedCheck(active, target)
      consumeAction(active.id)
      setTargetingMode(null)

      if (result.attackerTotal >= result.defenderTotal) {
        addEncounterCondition(target.id, 'Grappled')
        // Track who is grappling whom
        useStore.setState(state => ({
          encounter: {
            ...state.encounter,
            combatants: state.encounter.combatants.map(c =>
              c.id === target.id ? { ...c, grappledBy: active.id } : c
            ),
          },
        }))
        addNarratorMessage({ role: 'dm', speaker: 'Combat',
          text: `${active.name} grapples ${target.name}! Athletics ${result.attackerTotal} vs ${result.defenderSkill} ${result.defenderTotal} — Grappled! (speed 0)`,
        })
        broadcastEncounterAction({ type: 'grapple', attackerId: active.id, targetId: target.id, success: true, log: result })
      } else {
        addNarratorMessage({ role: 'dm', speaker: 'Combat',
          text: `${active.name} fails to grapple ${target.name}. Athletics ${result.attackerTotal} vs ${result.defenderSkill} ${result.defenderTotal}.`,
        })
        broadcastEncounterAction({ type: 'grapple', attackerId: active.id, targetId: target.id, success: false, log: result })
      }
      return true
    }

    // Shove targeting — contested Athletics vs Athletics/Acrobatics
    if (targetingMode === 'shove' && inCombat) {
      const target = encounter.combatants.find(c =>
        c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position?.x === x && c.position?.y === y
      )
      if (!target) return true

      const active = encounter.combatants[encounter.currentTurn]
      if (!active?.position) return true

      const dx = Math.abs(active.position.x - target.position.x)
      const dy = Math.abs(active.position.y - target.position.y)
      if (dx > 1 || dy > 1) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Target must be adjacent (5 ft).' })
        return true
      }

      const { useAction: consumeAction, addEncounterCondition: addCond, moveToken } = useStore.getState()
      const result = resolveContestedCheck(active, target)
      consumeAction(active.id)
      setTargetingMode(null)

      if (result.attackerTotal >= result.defenderTotal) {
        // Shove: knock prone (default) — push 5ft away only if there's an open tile
        const pushDir = { x: target.position.x - active.position.x, y: target.position.y - active.position.y }
        const pushX = target.position.x + (pushDir.x || 0)
        const pushY = target.position.y + (pushDir.y || 0)
        const pushBlocked = zone?.cellBlocked?.[pushY * (zone.width || 0) + pushX] ||
          encounter.combatants.some(c => c.position?.x === pushX && c.position?.y === pushY && (c.currentHp ?? c.hp) > 0)
        const outOfBounds = pushX < 0 || pushY < 0 || pushX >= (zone?.width || 999) || pushY >= (zone?.height || 999)

        if (!pushBlocked && !outOfBounds) {
          // Push 5 feet
          moveToken(target.id, pushX, pushY, 0)
          addNarratorMessage({ role: 'dm', speaker: 'Combat',
            text: `${active.name} shoves ${target.name} back 5 feet! Athletics ${result.attackerTotal} vs ${result.defenderSkill} ${result.defenderTotal}.`,
          })
          broadcastEncounterAction({ type: 'shove', attackerId: active.id, targetId: target.id, success: true, effect: 'push', position: { x: pushX, y: pushY } })
        } else {
          // Can't push — knock prone instead
          addCond(target.id, 'Prone')
          addNarratorMessage({ role: 'dm', speaker: 'Combat',
            text: `${active.name} shoves ${target.name} prone! Athletics ${result.attackerTotal} vs ${result.defenderSkill} ${result.defenderTotal}.`,
          })
          broadcastEncounterAction({ type: 'shove', attackerId: active.id, targetId: target.id, success: true, effect: 'prone' })
        }
      } else {
        addNarratorMessage({ role: 'dm', speaker: 'Combat',
          text: `${active.name} fails to shove ${target.name}. Athletics ${result.attackerTotal} vs ${result.defenderSkill} ${result.defenderTotal}.`,
        })
        broadcastEncounterAction({ type: 'shove', attackerId: active.id, targetId: target.id, success: false })
      }
      return true
    }

    // Help targeting — click an adjacent enemy to grant allies advantage
    if (targetingMode === 'help' && inCombat) {
      const target = encounter.combatants.find(c =>
        c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position?.x === x && c.position?.y === y
      )
      if (!target) return true

      const active = encounter.combatants[encounter.currentTurn]
      if (!active?.position) return true

      // Must be adjacent
      const dx = Math.abs(active.position.x - target.position.x)
      const dy = Math.abs(active.position.y - target.position.y)
      if (dx > 1 || dy > 1) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Target must be adjacent (5 ft).' })
        return true
      }

      const { useAction: consumeAction } = useStore.getState()
      consumeAction(active.id)
      // Mark the target as having advantage-against (next ally attack)
      useStore.setState(state => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === target.id ? { ...c, helpAdvantage: true, helpGrantedBy: active.id } : c
          ),
        },
      }))
      setTargetingMode(null)
      addNarratorMessage({ role: 'dm', speaker: 'Combat',
        text: `${active.name} uses the Help action! The next attack against ${target.name} has advantage.`,
      })
      broadcastEncounterAction({ type: 'help', attackerId: active.id, targetId: target.id })
      return true
    }

    // Spell AoE targeting
    if (targetingMode?.type === 'spell' && inCombat) {
      const spell = targetingMode.spell
      const active = encounter.combatants[encounter.currentTurn]
      if (!active?.position) return true

      const dist = Math.max(Math.abs(active.position.x - x), Math.abs(active.position.y - y))
      const maxRange = Math.floor((spell.range || 60) / 5)
      if (dist > maxRange) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Out of range.' })
        return true
      }

      const radiusTiles = Math.floor((spell.areaSize || 10) / 5)
      let affectedTiles
      if (spell.areaType === 'sphere') {
        affectedTiles = getTilesInSphere({ x, y }, radiusTiles)
      } else if (spell.areaType === 'cube') {
        affectedTiles = getTilesInCube({ x, y }, radiusTiles * 2 + 1)
      } else if (spell.areaType === 'line') {
        const dx2 = x - active.position.x
        const dy2 = y - active.position.y
        const dir = Math.abs(dx2) >= Math.abs(dy2) ? (dx2 > 0 ? 'E' : 'W') : (dy2 > 0 ? 'S' : 'N')
        affectedTiles = getTilesInLine(active.position, dir, radiusTiles)
      } else if (spell.areaType === 'cone') {
        const dx2 = x - active.position.x
        const dy2 = y - active.position.y
        const dir = Math.abs(dx2) >= Math.abs(dy2) ? (dx2 > 0 ? 'E' : 'W') : (dy2 > 0 ? 'S' : 'N')
        affectedTiles = getTilesInCone(active.position, dir, radiusTiles)
      } else {
        affectedTiles = getTilesInSphere({ x, y }, radiusTiles)
      }

      const layer = pixiRef.current?.getMovementRangeLayer?.()
      if (layer) renderAoEPreview(layer, affectedTiles, zone?.tileSize || 200)

      const affected = encounter.combatants.filter(c =>
        (c.currentHp ?? c.hp) > 0 && c.position &&
        affectedTiles.some(t => t.x === c.position.x && t.y === c.position.y)
      )

      const prof = Math.floor(((active.level || 1) - 1) / 4) + 2
      const castAbility = spell.castingAbility || 'int'
      const castMod = Math.floor(((active.stats?.[castAbility] || 10) - 10) / 2)
      const saveDC = 8 + prof + castMod

      const baseDmg = rollDamage(spell.damage || '1d6').total

      const spellOrigin = { x, y }
      const saveAbility = spell.saveAbility || 'dex'
      const results = []
      const logLines = []
      for (const target of affected) {
        const coverType = calculateCover(spellOrigin, target.position, zone.wallEdges, propCoverRef.current, zone.width)
        const coverSaveBonus = COVER_BONUS[coverType] || 0
        const baseSaveMod = Math.floor(((target.stats?.[saveAbility] || 10) - 10) / 2)
        // Add proficiency bonus if target is proficient in this save
        const targetSaveProfs = target.class ? getSaveProficiencies(target.class) : []
        const saveProfBonus = targetSaveProfs.includes(saveAbility) ? getProfBonus(target.level || 1) : 0
        const saveMod = baseSaveMod + saveProfBonus
        const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod + coverSaveBonus
        const saved = saveRoll >= saveDC
        const dmg = saved && spell.halfOnSave ? Math.floor(baseDmg / 2) : saved ? 0 : baseDmg

        if (dmg > 0) {
          const { applyEncounterDamage: applyDmg } = useStore.getState()
          applyDmg(target.id, dmg)
        }

        results.push({ targetId: target.id, damage: dmg, saved })

        const coverNote = coverSaveBonus > 0 ? ` (${coverType} cover +${coverSaveBonus})` : ''
        const entry = `${target.name}: ${saveAbility.toUpperCase()} save ${saveRoll} vs DC ${saveDC}${coverNote} — ${saved ? 'SAVE' : 'FAIL'} (${dmg} ${spell.name} damage)`
        addNarratorMessage({ role: 'dm', speaker: 'Combat', text: entry })
        logLines.push(entry)
      }

      // Consume action (or bonus action if Quickened Spell active)
      if (active.quickenedSpell) {
        const { useBonusAction } = useStore.getState()
        useBonusAction(active.id)
        useStore.setState(state => ({
          encounter: { ...state.encounter, combatants: state.encounter.combatants.map(c =>
            c.id === active.id ? { ...c, quickenedSpell: false } : c
          ) },
        }))
      } else {
        const { useAction: consumeAction } = useStore.getState()
        consumeAction(active.id)
      }
      const castLog = `${active.name} casts ${spell.name}! ${logLines.join(' ')}`
      broadcastEncounterAction({ type: 'aoe-resolve', spellName: spell.name, casterId: active.id, affectedTiles, saveDC, results, log: castLog, userId: useStore.getState().user?.id })

      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} casts ${spell.name}!` })

      setTimeout(() => {
        setTargetingMode(null)
        if (layer) clearAoEPreview(layer)
      }, 1500)
      return true
    }

    // Combat movement — click within reachable range to move active combatant
    if (inCombat && zone?.wallEdges) {
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active || active.isEnemy || !active.position) return true
      if (!reachableTilesRef.current.has(`${x},${y}`)) return true

      const collisionData = {
        wallEdges: zone.wallEdges,
        cellBlocked: zone.cellBlocked || new Uint8Array(zone.width * zone.height),
      }
      const path = findPathEdge(collisionData, zone.width, zone.height, active.position, { x, y })
      if (!path || path.length < 2) return true

      const aliveEnemies = encounter.combatants.filter(c =>
        c.isEnemy && (c.currentHp ?? c.hp) > 0 && c.position
      )
      const oaTriggers = findOATriggers(path, aliveEnemies, active.disengaged)
      if (oaTriggers.length > 0) {
        const names = [...new Set(oaTriggers.map(t => t.enemy.name))].join(', ')
        setPendingOA({ triggers: oaTriggers, path, active, x, y, names })
        return true
      }

      const cost = path.length - 1
      const { moveToken } = useStore.getState()
      moveToken(active.id, x, y, cost)
      const tileSize = zone.tileSize || 200
      animateTokenAlongPath(active.id, path, (stepPos) => {
        if (cameraRef.current) cameraRef.current.centerOn(stepPos.x, stepPos.y, tileSize)
      }, () => {
        if (cameraRef.current) cameraRef.current.centerOn(x, y, tileSize)
      }, tileSize)
      broadcastEncounterAction({ type: 'move-token', id: active.id, position: { x, y }, cost })
      return true
    }

    return false // Not handled by combat
  }, [zone, inCombat, encounter, targetingMode, addNarratorMessage, sessionApiKey, narrateCombatAction])

  // --- Handle combat action buttons (attack, cast, disengage, etc.) ---
  const handleCombatAction = useCallback((type, payload) => {
    // Allow death-save and stabilize for dying players, block everything else
    const activeCheck = encounter.combatants?.[encounter.currentTurn]
    if (activeCheck && (activeCheck.currentHp ?? 0) <= 0 && type !== 'death-save' && type !== 'stabilize') return

    if (type === 'death-save') {
      const { applyDeathSaveResult } = useStore.getState()
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active) return
      const roll = Math.floor(Math.random() * 20) + 1
      applyDeathSaveResult(active.id, roll)
      const updated = useStore.getState().encounter.combatants.find(c => c.id === active.id)
      if (updated) {
        if (updated.currentHp > 0) {
          addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} rolls a natural 20 — revived with 1 HP!` })
        } else if ((updated.deathSaves?.failures ?? 0) >= 3) {
          addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} has failed 3 death saves — they are dead.` })
        }
      }
      broadcastEncounterAction({ type: 'death-save', id: active.id, roll })
      return roll
    } else if (type === 'stabilize') {
      const { stabilizeCombatant } = useStore.getState()
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active) return
      stabilizeCombatant(active.id)
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} is stabilized.` })
      broadcastEncounterAction({ type: 'stabilize', id: active.id })
      return
    } else if (type === 'attack') {
      setTargetingMode('attack')
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Select a target to attack. Press Escape to cancel.' })
      return
    } else if (type === 'spell-pick') {
      setShowSpellPicker(true)
      return
    } else if (type === 'attack-pick') {
      // Double-check action economy before opening picker
      const curr = useStore.getState().encounter?.combatants?.[useStore.getState().encounter?.currentTurn]
      if (curr?.actionsUsed) return
      setShowWeaponPicker(true)
      return
    } else if (type === 'class-ability') {
      const handled = handleClassAbility(payload, encounter, addNarratorMessage, setSelectedWeapon, setTargetingMode)
      if (handled) return
      // Default fallback for unknown abilities
      const active = encounter.combatants?.[encounter.currentTurn]
      if (active && payload?.name) {
        addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} uses ${payload.name}!` })
      }
      return
    } else if (type === 'grapple') {
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active || active.actionsUsed) return
      setTargetingMode('grapple')
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Select an adjacent target to grapple. Press Escape to cancel.' })
      return
    } else if (type === 'shove') {
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active || active.actionsUsed) return
      setTargetingMode('shove')
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Select an adjacent target to shove. Press Escape to cancel.' })
      return
    } else if (type === 'hide') {
      // Hide action: Stealth check, success grants Hidden condition
      const { useAction: consumeAction, addEncounterCondition: addCond } = useStore.getState()
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active) return
      consumeAction(active.id)
      const stats = active.stats || active.abilityScores || {}
      const dexMod = Math.floor(((stats.dex ?? 10) - 10) / 2)
      const level = active.level || 1
      const prof = Math.ceil(level / 4) + 1
      const skills = active.skills || []
      const isProficient = skills.some(s => s === 'Stealth' || s === 'stealth')
      const bonus = dexMod + (isProficient ? prof : 0)
      const d20 = Math.floor(Math.random() * 20) + 1
      const total = d20 + bonus
      // Hidden if total beats enemy passive perceptions (DC 10-15 typical)
      const dc = 12 // moderate difficulty
      if (total >= dc) {
        addCond(active.id, 'Hidden')
        addNarratorMessage({ role: 'dm', speaker: 'Combat',
          text: `${active.name} hides! Stealth: ${total} (d20: ${d20} + ${bonus}) vs DC ${dc}. Attacks against you have disadvantage.`
        })
        broadcastEncounterAction({ type: 'hide', id: active.id, success: true, total })
      } else {
        addNarratorMessage({ role: 'dm', speaker: 'Combat',
          text: `${active.name} fails to hide. Stealth: ${total} (d20: ${d20} + ${bonus}) vs DC ${dc}.`
        })
        broadcastEncounterAction({ type: 'hide', id: active.id, success: false, total })
      }
      return
    } else if (type === 'help') {
      // Help action: enter targeting mode to select an ally's target
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active || active.actionsUsed) return
      setTargetingMode('help')
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Select an adjacent enemy to grant an ally advantage against. Press Escape to cancel.' })
      return
    } else if (type === 'use-item') {
      // Open consumable picker
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active || active.actionsUsed) return
      setShowConsumablePicker(true)
      return
    } else if (type === 'move') {
      setTargetingMode(null) // Clear any active targeting so tile clicks route to movement
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Click a tile to move during combat.' })
    } else if (type === 'say') {
      // Focus the SessionLog chat input via custom event
      window.dispatchEvent(new CustomEvent('combat-say-focus'))
    } else if (type === 'disengage') {
      const { useAction: consumeAction } = useStore.getState()
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active) return
      consumeAction(active.id)
      useStore.setState(state => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === active.id ? { ...c, disengaged: true } : c
          ),
        },
      }))
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} takes the Disengage action.` })
      broadcastEncounterAction({ type: 'disengage', id: active.id })
    } else if (type === 'ready') {
      // Open the Ready Action modal (handled by showReadyModal state)
      setShowReadyModal(true)
    } else if (type === 'ready-confirm') {
      // payload = { trigger, response, weapon }
      const { useAction: consumeAction, setReadiedAction } = useStore.getState()
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active) return
      consumeAction(active.id)
      setReadiedAction(active.id, payload)
      const triggerLabel = payload.trigger.replace(/-/g, ' ')
      const responseLabel = payload.response.replace(/-/g, ' ')
      addNarratorMessage({ role: 'dm', speaker: 'Combat',
        text: `${active.name} readies an action: ${responseLabel}${payload.weapon ? ` (${payload.weapon.name})` : ''} — trigger: ${triggerLabel}.`,
      })
      broadcastEncounterAction({ type: 'ready-action', id: active.id, readiedAction: payload })
      setShowReadyModal(false)
    } else if (type === 'spell-confirm') {
      // payload = { spell, position, targets }
      const { useSpellSlot, useAction: consumeAction } = useStore.getState()
      const active = encounter.combatants?.[encounter.currentTurn]
      if (!active) return

      const spell = payload.spell
      const selectedTargets = payload.targets || []

      // Consume spell slot
      if (spell.castLevel > 0) {
        useSpellSlot(active.id, spell.castLevel)
      }

      // Consume action
      consumeAction(active.id)

      // Calculate damage and apply to targets
      let damageRolls = []
      for (const targetId of selectedTargets) {
        const target = encounter.combatants?.find(c => c.id === targetId)
        if (!target) continue

        const dmgResult = rollDamage(spell.damage?.dice || '1d6')
        const damage = dmgResult.total ?? dmgResult
        const currentHp = (target.currentHp ?? target.hp) - damage

        useStore.setState(state => ({
          encounter: {
            ...state.encounter,
            combatants: state.encounter.combatants.map(c =>
              c.id === targetId ? { ...c, currentHp: Math.max(0, currentHp) } : c
            ),
          },
        }))

        damageRolls.push(`${target.name}: ${damage} damage`)
      }

      const resultText = damageRolls.length > 0
        ? `${active.name} casts ${spell.name}! Affected: ${damageRolls.join(', ')}`
        : `${active.name} casts ${spell.name}!`

      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: resultText })
      broadcastEncounterAction({ type: 'spell-cast', id: active.id, spell: spell.name, targets: selectedTargets, damage: damageRolls })
    }
  }, [addNarratorMessage, encounter])

  // --- Execute movement after OA confirmation ---
  const executeMoveWithOA = useCallback(({ triggers, path, active, x, y }) => {
    const tileSize = zone?.tileSize || 200
    const cost = path.length - 1
    const { moveToken, applyEncounterDamage: applyDmg } = useStore.getState()

    triggers.forEach(({ enemy }) => {
      useStore.setState(state => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === enemy.id ? { ...c, reactionUsed: true } : c
          ),
        },
      }))
    })

    let playerDied = false
    triggers.forEach(({ enemy }) => {
      const result = resolveOA(enemy, active)
      const hitStr = result.hit
        ? `hits for ${result.damage} damage${result.isCrit ? ' (CRIT!)' : ''}`
        : 'misses'
      addNarratorMessage({
        role: 'dm',
        speaker: 'Combat',
        text: `Opportunity Attack: ${enemy.name} attacks ${active.name} — ${hitStr} (d20: ${result.d20}, total: ${result.total})`,
      })
      broadcastEncounterAction({
        type: 'opportunity-attack',
        attackerId: enemy.id,
        targetId: active.id,
        hit: result.hit,
        damage: result.damage,
        log: `Opportunity Attack: ${enemy.name} attacks ${active.name} — ${hitStr} (d20: ${result.d20}, total: ${result.total})`,
      })
      if (result.hit && result.damage > 0) {
        applyDmg(active.id, result.damage)
        const currentHp = (active.currentHp ?? active.hp) - result.damage
        if (currentHp <= 0) playerDied = true
      }
    })

    if (playerDied) {
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} drops to 0 HP!` })
      return
    }

    moveToken(active.id, x, y, cost)
    animateTokenAlongPath(active.id, path, (stepPos) => {
      if (cameraRef.current) cameraRef.current.centerOn(stepPos.x, stepPos.y, tileSize)
    }, () => {
      if (cameraRef.current) cameraRef.current.centerOn(x, y, tileSize)
    }, tileSize)
    broadcastEncounterAction({ type: 'move-token', id: active.id, position: { x, y }, cost })
  }, [zone, addNarratorMessage, cameraRef])

  // --- Spell selection handler ---
  const handleSpellSelected = useCallback((spell, castLevel) => {
    setShowSpellPicker(false)
    const active = encounter.combatants?.[encounter.currentTurn]
    if (!active) return

    // PHB p.202: If you cast a leveled spell as a bonus action, you can only
    // cast a cantrip with your action this turn (and vice versa).
    // Mark the flag so SpellPickerModal can filter to cantrips only.
    if (castLevel > 0) {
      useStore.setState(state => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === active.id ? { ...c, leveledSpellCastThisTurn: true } : c
          ),
        },
      }))
    }

    // Enter targeting based on spell type
    if (spell.areaType) {
      // AoE spell — PixiJS targeting overlay
      const casterPos = active.position || { x: 5, y: 5 }
      const tileSize = zone?.tileSize || 200
      const fullSpell = { ...spell, castLevel }
      pixiRef.current?.startSpellTargeting(
        fullSpell,
        casterPos,
        tileSize,
        ({ position, affectedTiles }) => {
          // Use fresh state — targeting callback fires asynchronously
          const currentEncounter = useStore.getState().encounter
          const casterId = active.id
          const targetIds = affectedTiles
            .map(tile => currentEncounter?.combatants?.find(c =>
              c.position?.x === tile.x && c.position?.y === tile.y && c.id !== casterId
            ))
            .filter(Boolean)
            .map(c => c.id)
          handleCombatAction('spell-confirm', { spell: fullSpell, position, targets: targetIds })
        },
        () => {
          addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Spell targeting cancelled.' })
        }
      )
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `Targeting ${spell.name}. Click to place. Press Escape to cancel.` })
    } else if (spell.attack) {
      // Ranged/melee spell attack — same as weapon attack targeting
      setTargetingMode('attack')
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `Cast ${spell.name}. Click a target. Press Escape to cancel.` })
    } else if (spell.save && !spell.areaType) {
      // Single-target save spell (Sacred Flame, Poison Spray, etc.)
      // Store the spell for resolution when target is clicked
      setSelectedWeapon({
        name: spell.name,
        isSaveSpell: true,
        save: spell.save,
        damage: spell.damage?.dice || '1d8',
        damageType: spell.damage?.type || 'radiant',
        range: spell.range || 60,
        level: spell.level,
        castLevel: castLevel,
      });
      setTargetingMode('attack');
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `Cast ${spell.name}. Click a target. Press Escape to cancel.` });
    } else {
      // Self/utility spell — cast immediately, consume slot
      if (castLevel > 0) {
        const { useSpellSlot } = useStore.getState()
        useSpellSlot(active.id, castLevel)
      }
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} casts ${spell.name}!` })
    }
  }, [encounter, addNarratorMessage])

  // --- Weapon selection handler ---
  const handleWeaponSelected = useCallback((weapon) => {
    setShowWeaponPicker(false)
    setSelectedWeapon(weapon)
    setTargetingMode('attack')
    addNarratorMessage({ role: 'dm', speaker: 'System', text: `Attack with ${weapon.name}. Click a target. Press Escape to cancel.` })
  }, [addNarratorMessage])

  // --- Consumable item used from picker ---
  const handleConsumableUsed = useCallback((item) => {
    setShowConsumablePicker(false)
    const active = encounter.combatants?.[encounter.currentTurn]
    if (!active) return

    const { useAction: consumeAction } = useStore.getState()
    consumeAction(active.id)

    // Apply the item effect via the store
    const { useItem } = useStore.getState()
    const effect = useItem(item.instanceId)

    let narration = `${active.name} uses ${item.name}.`
    if (effect?.type === 'heal') {
      // Re-read to get updated HP
      const updated = useStore.getState().encounter.combatants?.find(c => c.id === active.id)
      const hpNow = updated?.currentHp ?? active.currentHp
      narration = `${active.name} drinks a ${item.name} and recovers HP! (now ${hpNow} HP)`
    } else if (effect?.type === 'condition') {
      narration = `${active.name} uses ${item.name} — ${effect.condition}!`
    }
    addNarratorMessage({ role: 'dm', speaker: 'Combat', text: narration })
    broadcastEncounterAction({ type: 'use-item', id: active.id, itemName: item.name, effect })
  }, [encounter, addNarratorMessage])

  // --- Readied action trigger check ---
  // Called after enemy moves/attacks/casts to see if any player has a readied action that fires
  const checkReadiedTriggers = useCallback((eventType, eventData) => {
    if (!inCombat) return
    const combatants = useStore.getState().encounter.combatants || []
    const myChar = useStore.getState().myCharacter
    for (const c of combatants) {
      if (!c.readiedAction || c.reactionUsed) continue
      if ((c.currentHp ?? 1) <= 0) continue
      // Only prompt for local player's readied action
      if (c.id !== myChar?.id) continue
      if (checkTrigger(c.readiedAction, eventType, eventData, c)) {
        setReadyTriggerPrompt({
          combatantId: c.id,
          readiedAction: c.readiedAction,
          triggerDescription: `${eventData.moverName || 'A creature'} triggered your readied action!`,
          targetId: eventData.moverId,
        })
        break
      }
    }
  }, [inCombat])

  // --- Execute a readied action (player chose "Execute!") ---
  const executeReadiedAction = useCallback(() => {
    if (!readyTriggerPrompt) return
    const { combatantId, readiedAction, targetId } = readyTriggerPrompt
    const combatants = useStore.getState().encounter.combatants || []
    const holder = combatants.find(c => c.id === combatantId)
    if (!holder) { setReadyTriggerPrompt(null); return }

    // Mark reaction used
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === combatantId ? { ...c, reactionUsed: true, readiedAction: null } : c
        ),
      },
    }))

    const response = readiedAction.response
    if (response === 'melee-attack' || response === 'ranged-attack') {
      const target = combatants.find(c => c.id === targetId)
      if (!target) {
        addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${holder.name}'s readied attack has no valid target.` })
      } else {
        const result = resolveReady(holder, target, readiedAction.weapon)
        const hitStr = result.hit
          ? `hits for ${result.damage} damage${result.crit ? ' (CRIT!)' : ''}`
          : 'misses'
        addNarratorMessage({ role: 'dm', speaker: 'Combat',
          text: `Readied Attack: ${holder.name} attacks ${target.name} — ${hitStr} (d20: ${result.d20}, total: ${result.total} vs AC ${result.ac})`,
        })
        if (result.hit && result.damage > 0) {
          const { applyEncounterDamage } = useStore.getState()
          applyEncounterDamage(target.id, result.damage)
        }
        broadcastEncounterAction({
          type: 'readied-attack-resolve',
          attackerId: combatantId,
          targetId: target.id,
          result,
        })
      }
    } else if (response === 'move' || response === 'dash') {
      addNarratorMessage({ role: 'dm', speaker: 'Combat',
        text: `${holder.name} executes readied ${response === 'dash' ? 'Dash' : 'movement'}.`,
      })
      broadcastEncounterAction({ type: 'readied-move', id: combatantId, response })
    }
    setReadyTriggerPrompt(null)
  }, [readyTriggerPrompt, addNarratorMessage])

  // --- Pass on readied action ---
  const passReadiedAction = useCallback(() => {
    setReadyTriggerPrompt(null)
  }, [])

  return {
    targetingMode,
    setTargetingMode,
    pendingOA,
    setPendingOA,
    handleCombatTileClick,
    handleCombatAction,
    executeMoveWithOA,
    reachableTilesRef,
    propCoverRef,
    showWeaponPicker, setShowWeaponPicker,
    showSpellPicker, setShowSpellPicker,
    showConsumablePicker, setShowConsumablePicker,
    showReadyModal, setShowReadyModal,
    readyTriggerPrompt,
    checkReadiedTriggers,
    executeReadiedAction,
    passReadiedAction,
    handleSpellSelected,
    handleWeaponSelected,
    handleConsumableUsed,
    selectedWeapon,
  }
}
