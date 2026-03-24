import useStore from '../store/useStore'
import { broadcastEncounterAction } from './liveChannel'

/**
 * Handles all class ability activations during combat.
 * Returns true if the ability was handled, false otherwise.
 */
export function handleClassAbility(
  payload,
  encounter,
  addNarratorMessage,
  setSelectedWeapon,
  setTargetingMode
) {
  const active = encounter.combatants?.[encounter.currentTurn]
  if (!active) return false

  // Deduct resource if applicable
  if (payload?.resourceName && payload?.resourceCost) {
    const { useClassResource } = useStore.getState()
    useClassResource(active.id, payload.resourceName, payload.resourceCost)
  }

  // --- Monk: Martial Arts (bonus action unarmed strike)
  if (payload?.name === 'Martial Arts') {
    const { useBonusAction } = useStore.getState()
    useBonusAction(active.id)
    const dexMod = Math.floor(((active.stats?.dex || 10) - 10) / 2)
    const profBonus = Math.ceil((active.level || 1) / 4) + 1
    const bonus = dexMod + profBonus
    const martialArtsDie = (active.level || 1) >= 17 ? '1d10' : (active.level || 1) >= 11 ? '1d8' : (active.level || 1) >= 5 ? '1d6' : '1d4'
    setSelectedWeapon({ name: 'Unarmed Strike (Martial Arts)', bonus: `+${bonus}`, damage: `${martialArtsDie}+${dexMod}` })
    setTargetingMode('attack')
    addNarratorMessage({ role: 'dm', speaker: 'System', text: `${active.name} uses Martial Arts! Select a target for a bonus unarmed strike.` })
    return true
  }

  // --- Monk: Flurry of Blows (two bonus action unarmed strikes)
  if (payload?.name === 'Flurry of Blows') {
    const { useBonusAction } = useStore.getState()
    useBonusAction(active.id)
    const dexMod = Math.floor(((active.stats?.dex || 10) - 10) / 2)
    const profBonus = Math.ceil((active.level || 1) / 4) + 1
    const bonus = dexMod + profBonus
    const martialArtsDie = (active.level || 1) >= 17 ? '1d10' : (active.level || 1) >= 11 ? '1d8' : (active.level || 1) >= 5 ? '1d6' : '1d4'
    setSelectedWeapon({ name: 'Unarmed Strike (Flurry)', bonus: `+${bonus}`, damage: `${martialArtsDie}+${dexMod}`, flurryHits: 2 })
    setTargetingMode('attack')
    addNarratorMessage({ role: 'dm', speaker: 'System', text: `${active.name} uses Flurry of Blows! Select a target for two unarmed strikes.` })
    return true
  }

  // --- Monk: Patient Defense (Dodge as bonus action)
  if (payload?.name === 'Patient Defense') {
    const { useBonusAction, addEncounterCondition } = useStore.getState()
    useBonusAction(active.id)
    addEncounterCondition(active.id, 'Dodging')
    addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} uses Patient Defense (Dodge). Attacks against have disadvantage until next turn.` })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Patient Defense' })
    return true
  }

  // --- Monk: Step of the Wind (Dash/Disengage as bonus action)
  if (payload?.name === 'Step of the Wind') {
    const { useBonusAction } = useStore.getState()
    useBonusAction(active.id)
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, remainingMove: (c.remainingMove || 0) + Math.floor((c.speed || 30) / 5), disengaged: true } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} uses Step of the Wind (Dash + Disengage as bonus action).` })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Step of the Wind' })
    return true
  }

  // --- Fighter: Second Wind (heal 1d10 + level, bonus action)
  if (payload?.name === 'Second Wind') {
    const { useBonusAction, applyEncounterHeal } = useStore.getState()
    useBonusAction(active.id)
    const d10 = Math.floor(Math.random() * 10) + 1
    const healed = d10 + (active.level || 1)
    applyEncounterHeal(active.id, healed)
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} uses Second Wind, recovering ${healed} HP! (1d10+${active.level || 1})`,
    })
    broadcastEncounterAction({ type: 'heal', targetId: active.id, amount: healed })
    return true
  }

  // --- Fighter: Action Surge (regain action this turn)
  if (payload?.name === 'Action Surge') {
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, actionsUsed: false } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} uses Action Surge — an additional action this turn!`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Action Surge' })
    return true
  }

  // --- Barbarian: Rage (+damage, resistance to B/P/S)
  if (payload?.name === 'Rage') {
    const { useBonusAction, addEncounterCondition } = useStore.getState()
    useBonusAction(active.id)
    addEncounterCondition(active.id, 'Raging')
    const rageBonus = (active.level || 1) >= 16 ? 4 : (active.level || 1) >= 9 ? 3 : 2
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, rageBonus, rageTurns: 10 } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} enters a RAGE! +${rageBonus} melee damage, resistance to bludgeoning/piercing/slashing.`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Rage', rageBonus })
    return true
  }

  // --- Barbarian: Reckless Attack (advantage on attacks, enemies have advantage on you)
  if (payload?.name === 'Reckless Attack') {
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, recklessAttack: true } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} attacks recklessly! Advantage on STR attacks this turn, but enemies have advantage against you.`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Reckless Attack' })
    return true
  }

  // --- Rogue: Cunning Action (Dash/Disengage as bonus action)
  if (payload?.name === 'Cunning Action') {
    const { useBonusAction } = useStore.getState()
    useBonusAction(active.id)
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, disengaged: true, remainingMove: (c.remainingMove || 0) + Math.floor((c.speed || 30) / 5) } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} uses Cunning Action (Dash + Disengage as bonus action).`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Cunning Action' })
    return true
  }

  // --- Paladin: Divine Smite (extra 2d8+ radiant on next hit)
  if (payload?.name === 'Divine Smite') {
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, divineSmiteReady: true } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} channels Divine Smite! Extra 2d8 radiant damage on the next hit.`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Divine Smite' })
    return true
  }

  // --- Paladin: Lay on Hands (heal from pool)
  if (payload?.name === 'Lay on Hands') {
    const { useAction: consumeAction, applyEncounterHeal } = useStore.getState()
    consumeAction(active.id)
    const pool = active.resourcesUsed?.['Lay on Hands'] || 0
    const maxPool = (active.level || 1) * 5
    const remaining = maxPool - pool
    const healAmount = Math.min(remaining, (active.maxHp || 20) - (active.currentHp || 0))
    if (healAmount > 0) {
      useStore.setState(state => ({
        encounter: {
          ...state.encounter,
          combatants: state.encounter.combatants.map(c =>
            c.id === active.id ? {
              ...c,
              resourcesUsed: { ...c.resourcesUsed, 'Lay on Hands': (c.resourcesUsed?.['Lay on Hands'] || 0) + healAmount - 1 },
            } : c
          ),
        },
      }))
      applyEncounterHeal(active.id, healAmount)
      addNarratorMessage({ role: 'dm', speaker: 'Combat',
        text: `${active.name} uses Lay on Hands, healing ${healAmount} HP! (${remaining - healAmount} pool remaining)`,
      })
      broadcastEncounterAction({ type: 'heal', targetId: active.id, amount: healAmount })
    } else {
      addNarratorMessage({ role: 'dm', speaker: 'Combat',
        text: `${active.name} has no Lay on Hands pool remaining.`,
      })
    }
    return true
  }

  // --- Bard: Bardic Inspiration (give ally an inspiration die)
  if (payload?.name === 'Bardic Inspiration') {
    const { useBonusAction } = useStore.getState()
    useBonusAction(active.id)
    const allies = encounter.combatants.filter(c => !c.isEnemy && c.id !== active.id && (c.currentHp ?? 1) > 0 && !c.bardicInspiration)
    if (allies.length === 0) {
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} has no valid allies to inspire.` })
      return true
    }
    const target = allies[0]
    const lvl = active.level || 1
    const dieSize = lvl >= 15 ? 'd12' : lvl >= 10 ? 'd10' : lvl >= 5 ? 'd8' : 'd6'
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === target.id ? { ...c, bardicInspiration: dieSize } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} inspires ${target.name} with a 1${dieSize} Bardic Inspiration die!`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Bardic Inspiration', targetId: target.id, dieSize })
    return true
  }

  // --- Cleric: Channel Divinity (Turn Undead)
  if (payload?.name === 'Channel Divinity') {
    const { useAction: consumeAction, addEncounterCondition } = useStore.getState()
    consumeAction(active.id)
    const wisMod = Math.floor(((active.stats?.wis || 10) - 10) / 2)
    const prof = Math.ceil((active.level || 1) / 4) + 1
    const dc = 8 + prof + wisMod
    const results = []
    const turnedIds = []
    for (const c of encounter.combatants) {
      if (!c.isEnemy || (c.currentHp ?? 0) <= 0) continue
      if (!active.position || !c.position) continue
      const dist = Math.max(Math.abs(c.position.x - active.position.x), Math.abs(c.position.y - active.position.y))
      if (dist > 6) continue
      const nameLC = (c.name || '').toLowerCase()
      const typeLC = (c.creatureType || '').toLowerCase()
      const isUndead = typeLC.includes('undead') || nameLC.includes('skeleton') || nameLC.includes('zombie') || nameLC.includes('ghoul') || nameLC.includes('wight') || nameLC.includes('wraith') || nameLC.includes('vampire') || nameLC.includes('lich') || nameLC.includes('specter')
      if (!isUndead) continue
      const wisSave = Math.floor(Math.random() * 20) + 1 + Math.floor(((c.stats?.wis || 10) - 10) / 2)
      if (wisSave < dc) {
        addEncounterCondition(c.id, 'Turned')
        turnedIds.push(c.id)
        results.push(`${c.name}: FAIL (${wisSave})`)
      } else {
        results.push(`${c.name}: PASS (${wisSave})`)
      }
    }
    if (results.length > 0) {
      addNarratorMessage({ role: 'dm', speaker: 'Combat',
        text: `${active.name} channels divinity — Turn Undead! (DC ${dc})\n${results.join(', ')}`,
      })
    } else {
      addNarratorMessage({ role: 'dm', speaker: 'Combat',
        text: `${active.name} channels divinity — Turn Undead! No undead within range.`,
      })
    }
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Channel Divinity', turnedIds, dc })
    return true
  }

  // --- Druid: Wild Shape (transform into beast form)
  if (payload?.name === 'Wild Shape') {
    const { useAction: consumeAction } = useStore.getState()
    consumeAction(active.id)
    const lvl = active.level || 2
    const maxCR = lvl >= 8 ? 1 : lvl >= 4 ? 0.5 : 0.25
    const forms = [
      { name: 'Wolf', cr: 0.25, hp: 11, ac: 13, speed: 40, attack: { name: 'Bite', bonus: '+4', damage: '2d4+2' } },
      { name: 'Giant Spider', cr: 1, hp: 26, ac: 14, speed: 30, attack: { name: 'Bite', bonus: '+5', damage: '1d8+3' } },
      { name: 'Brown Bear', cr: 1, hp: 34, ac: 11, speed: 40, attack: { name: 'Claws', bonus: '+5', damage: '2d6+4' } },
      { name: 'Dire Wolf', cr: 1, hp: 37, ac: 14, speed: 50, attack: { name: 'Bite', bonus: '+5', damage: '2d6+3' } },
      { name: 'Giant Toad', cr: 1, hp: 39, ac: 11, speed: 20, attack: { name: 'Bite', bonus: '+4', damage: '1d10+2' } },
      { name: 'Cat', cr: 0, hp: 2, ac: 12, speed: 40, attack: { name: 'Claws', bonus: '+0', damage: '1' } },
      { name: 'Giant Badger', cr: 0.25, hp: 13, ac: 10, speed: 30, attack: { name: 'Bite', bonus: '+3', damage: '1d6+1' } },
    ]
    const eligible = forms.filter(f => f.cr <= maxCR)
    const chosen = eligible[Math.floor(Math.random() * eligible.length)] || forms[0]
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? {
            ...c,
            wildShape: {
              formName: chosen.name,
              formHp: chosen.hp,
              formAc: chosen.ac,
              formSpeed: chosen.speed,
              formAttack: chosen.attack,
              originalHp: c.currentHp,
              originalMaxHp: c.maxHp,
              originalAc: c.ac,
              originalSpeed: c.speed,
            },
            currentHp: chosen.hp,
            maxHp: chosen.hp,
            ac: chosen.ac,
            speed: chosen.speed,
            remainingMove: Math.floor(chosen.speed / 5),
          } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} transforms into a ${chosen.name}! (${chosen.hp} HP, AC ${chosen.ac}, ${chosen.attack.name} ${chosen.attack.bonus} for ${chosen.attack.damage})`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Wild Shape', form: chosen })
    return true
  }

  // --- Ranger: Hunter's Mark (mark target for extra 1d6 damage)
  if (payload?.name === "Hunter's Mark") {
    const { useBonusAction } = useStore.getState()
    useBonusAction(active.id)
    let closestEnemy = null
    let closestDist = Infinity
    for (const c of encounter.combatants) {
      if (!c.isEnemy || (c.currentHp ?? 0) <= 0) continue
      if (active.position && c.position) {
        const d = Math.max(Math.abs(c.position.x - active.position.x), Math.abs(c.position.y - active.position.y))
        if (d < closestDist) { closestDist = d; closestEnemy = c }
      }
    }
    if (!closestEnemy) {
      addNarratorMessage({ role: 'dm', speaker: 'Combat', text: `${active.name} has no valid target for Hunter's Mark.` })
      return true
    }
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, huntersMarkTarget: closestEnemy.id, concentrating: "Hunter's Mark" } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} marks ${closestEnemy.name} with Hunter's Mark! Extra 1d6 damage on each hit. (Concentration)`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: "Hunter's Mark", targetId: closestEnemy.id })
    return true
  }

  // --- Monk: Stunning Strike (CON save or Stunned on next hit)
  if (payload?.name === 'Stunning Strike') {
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, stunningStrikeReady: true } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} prepares a Stunning Strike! The next hit forces a CON save or the target is Stunned.`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Stunning Strike' })
    return true
  }

  // --- Sorcerer: Quickened Spell (next spell costs bonus action instead of action)
  if (payload?.name === 'Quickened Spell') {
    useStore.setState(state => ({
      encounter: {
        ...state.encounter,
        combatants: state.encounter.combatants.map(c =>
          c.id === active.id ? { ...c, quickenedSpell: true } : c
        ),
      },
    }))
    addNarratorMessage({ role: 'dm', speaker: 'Combat',
      text: `${active.name} uses Metamagic: Quickened Spell! The next spell is cast as a bonus action.`,
    })
    broadcastEncounterAction({ type: 'class-ability', id: active.id, ability: 'Quickened Spell' })
    return true
  }

  // Unknown ability — default handler will announce it
  return false
}
