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

/**
 * Encapsulates all combat-specific logic: attack targeting, spell AoE,
 * combat movement (with opportunity attacks), movement range rendering,
 * cover calculation, enemy auto-turns, and combat camera lock.
 */
export function useCombatActions({ zone, encounter, pixiRef, cameraRef, sessionApiKey, addNarratorMessage, narrateCombatAction, inCombat, isDM }) {
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
  const reachableTilesRef = useRef(new Set())
  const propCoverRef = useRef(new Set())

  // --- Escape to cancel targeting mode or close pickers ---
  useEffect(() => {
    if (!targetingMode && !showWeaponPicker && !showSpellPicker) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showWeaponPicker) { setShowWeaponPicker(false); return }
        if (showSpellPicker) { setShowSpellPicker(false); return }
        setTargetingMode(null)
        const layer = pixiRef.current?.getMovementRangeLayer?.()
        if (layer) clearAoEPreview(layer)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [targetingMode, showWeaponPicker, showSpellPicker])

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

  // --- Auto-run enemy turns (DM/host only to prevent duplicate execution) ---
  useEffect(() => {
    console.log('[CombatAI] useEffect fired:', { inCombat, shouldRunEnemyAI, currentTurn: encounter.currentTurn, phase: encounter.phase })
    if (!inCombat || !shouldRunEnemyAI) {
      console.log('[CombatAI] Skipped — inCombat:', inCombat, 'shouldRunAI:', shouldRunEnemyAI)
      return
    }
    const active = encounter.combatants?.[encounter.currentTurn]
    if (!active || !active.isEnemy) {
      console.log('[CombatAI] Not enemy turn:', active?.name, active?.type)
      return
    }

    console.log('[CombatAI] Enemy turn detected:', active.name, 'HP:', active.currentHp, 'Pos:', active.position)

    // Skip dead enemies — advance turn immediately
    if ((active.currentHp ?? 0) <= 0) {
      console.log('[CombatAI] Dead enemy, skipping:', active.name)
      const t = setTimeout(() => {
        nextEncounterTurn()
        broadcastEncounterAction({ type: 'next-turn', userId: 'system' })
      }, 600)
      return () => clearTimeout(t)
    }

    const apiKey = sessionApiKey
    console.log('[CombatAI] Setting 1s timeout for:', active.name)
    const timer = setTimeout(() => {
      console.log('[CombatAI] Timeout fired — running enemy turn for:', active.name, 'apiKey:', !!apiKey)
      try {
        const result = runEnemyTurn(apiKey || '')
        Promise.resolve(result).then(() => {
          console.log('[CombatAI] Enemy turn completed:', active.name)
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

      const dist = Math.max(Math.abs(active.position.x - x), Math.abs(active.position.y - y))
      const weapon = active.attacks?.[0] || { name: 'Unarmed Strike', bonus: '+0', damage: '1' }
      const isRanged = weapon.range != null
      const maxRange = isRanged ? Math.floor((weapon.range || 80) / 5) : 1

      if (dist > maxRange) {
        addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Target out of range.' })
        return true
      }

      const coverType = calculateCover(active.position, { x, y }, zone.wallEdges, propCoverRef.current, zone.width)
      const coverBonus = COVER_BONUS[coverType] || 0
      const effectiveAC = (target.ac || 10) + coverBonus

      const bonus = parseInt(weapon.bonus) || 0
      const d20 = Math.floor(Math.random() * 20) + 1
      const total = d20 + bonus
      const isCrit = d20 === 20
      const hit = isCrit || total >= effectiveAC

      let damage = 0
      if (hit) {
        const dmgResult = rollDamage(weapon.damage || '1')
        damage = isCrit ? dmgResult.total * 2 : dmgResult.total
      }

      if (hit && damage > 0) {
        const { applyEncounterDamage: applyDmg } = useStore.getState()
        applyDmg(target.id || target.name, damage)
      }

      const { useAction: consumeAction } = useStore.getState()
      consumeAction(active.id)
      setTargetingMode(null)

      const coverNote = coverBonus > 0 ? ` (${coverType} cover +${coverBonus})` : ''
      const entry = hit
        ? `${active.name} → ${target.name}: HIT! d20(${d20})+${bonus}=${total} vs AC ${effectiveAC}${coverNote}. ${damage} damage${isCrit ? ' (CRITICAL!)' : ''}.`
        : `${active.name} → ${target.name}: MISS. d20(${d20})+${bonus}=${total} vs AC ${effectiveAC}${coverNote}.`
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: entry })
      broadcastEncounterAction({ type: 'attack-result', attackerId: active.id, targetId: target.id, hit, damage, log: entry })

      const apiKey = sessionApiKey
      if (apiKey) {
        const resultDesc = hit ? `Hit! ${damage} damage${isCrit ? ' (CRITICAL!)' : ''}` : 'Miss!'
        narrateCombatAction(active.name, 'Attack', target.name, resultDesc, apiKey)
      }
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

      const { useAction: consumeAction } = useStore.getState()
      consumeAction(active.id)
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
      animateTokenAlongPath(active.id, path, null, () => {
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
      setShowWeaponPicker(true)
      return
    } else if (type === 'class-ability') {
      // payload is { name, resourceName, resourceCost }
      if (payload?.resourceName && payload?.resourceCost) {
        const { useClassResource } = useStore.getState()
        const active = encounter.combatants?.[encounter.currentTurn]
        if (active) {
          useClassResource(active.id, payload.resourceName, payload.resourceCost)
          addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} uses ${payload.name}!` })
        }
      }
      return
    } else if (type === 'move') {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Click a tile to move during combat.' })
    } else if (type === 'say') {
      addNarratorMessage({ role: 'dm', speaker: 'System', text: 'Type your message in the chat and press enter.' })
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
      broadcastEncounterAction({ type: 'oa-resolve', attackerId: enemy.id, targetId: active.id, result })
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
    animateTokenAlongPath(active.id, path, null, () => {
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
      // AoE spell — use existing spell targeting mode
      setTargetingMode({ type: 'spell', spell: {
        ...spell,
        damage: spell.damage?.dice || '1d6',
        saveAbility: (spell.save || 'dex').toLowerCase(),
        halfOnSave: spell.save != null,
        castingAbility: null,
      }, castLevel })
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `Targeting ${spell.name}. Click to place. Press Escape to cancel.` })
    } else if (spell.attack) {
      // Ranged/melee spell attack — same as weapon attack targeting
      setTargetingMode('attack')
      addNarratorMessage({ role: 'dm', speaker: 'System', text: `Cast ${spell.name}. Click a target. Press Escape to cancel.` })
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
    handleSpellSelected,
    handleWeaponSelected,
    selectedWeapon,
  }
}
