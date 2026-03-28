import { useMemo } from 'react'
import useStore from '../store/useStore'
import { getDisposition } from '../lib/factionSystem'

const CLASS_COLORS = {
  Fighter: 0x4499dd, Barbarian: 0xcc5544, Paladin: 0xeedd44,
  Ranger: 0x44aa66, Rogue: 0xcc7722, Monk: 0x88bbcc,
  Wizard: 0x6644cc, Sorcerer: 0xaa55bb, Warlock: 0x885599,
  Cleric: 0x44aa66, Druid: 0x558833, Bard: 0xcc7799,
}

export function useGameTokens({
  zone, playerPos, myCharacter, inCombat, encounter, activeNpc,
  partyMembers, defeatedEnemies, currentAreaId,
}) {
  const areaTokenPositions = useStore(s => s.areaTokenPositions);
  const factionRep = useStore(s => s.factionReputation) || {};
  const tokens = useMemo(() => {
    if (!zone) return []
    const t = []

    if (inCombat && encounter.combatants?.length) {
      const activeCombatantId = encounter.combatants[encounter.currentTurn]?.id
      encounter.combatants.forEach(c => {
        if (!c.position) return
        const isEnemy = c.type === 'enemy'
        const isDead = (c.currentHp ?? 0) <= 0
        t.push({
          id: c.id, name: c.name,
          x: c.position.x, y: c.position.y,
          color: isEnemy ? 0x8b0000 : 0x0c1828,
          borderColor: isEnemy ? 0xff3333 : (CLASS_COLORS[c.class] || 0x4499dd),
          isEnemy, isNpc: false,
          isActive: c.id === activeCombatantId,
          showHpBar: true,
          currentHp: c.currentHp ?? c.maxHp,
          maxHp: c.maxHp ?? 10,
          opacity: isDead ? 0.3 : 1,
        })
      })
    } else {
      // Exploration mode — player + NPCs + area enemies
      t.push({
        id: 'player',
        name: myCharacter?.name || 'Hero',
        x: playerPos.x, y: playerPos.y,
        color: 0x0c1828,
        borderColor: CLASS_COLORS[myCharacter?.class] || 0x4499dd,
        isNpc: false,
      })
      // Render other multiplayer party members from broadcast positions
      const areaPositions = areaTokenPositions?.[currentAreaId] || {}
      const localUserId = useStore.getState().user?.id
      if (partyMembers?.length) {
        partyMembers.forEach(member => {
          // Skip self — use userId for reliable check
          if (member.userId && localUserId && member.userId === localUserId) return
          if (!member.userId && (member.name === myCharacter?.name || member.id === myCharacter?.id)) return
          const pos = areaPositions[member.userId] || areaPositions[member.id] || areaPositions[member.name]
          if (!pos) return
          t.push({
            id: member.userId || member.id || member.name,
            name: member.name,
            x: pos.x, y: pos.y,
            color: 0x0c1828,
            borderColor: CLASS_COLORS[member.class] || 0x44aa66,
            isNpc: false,
          })
        })
      }
      if (zone.npcs) {
        zone.npcs.forEach(npc => {
          if (!npc.position) return
          const npcFaction = npc.faction
          const rep = npcFaction ? (factionRep[npcFaction] ?? 0) : 0
          const disposition = npcFaction ? getDisposition(rep) : null
          t.push({
            id: npc.name, name: npc.name,
            x: npc.position.x, y: npc.position.y,
            color: 0x1a1208,
            borderColor: npc.questRelevant ? 0xc9a84c : 0x8a7a52,
            isNpc: true, questRelevant: npc.questRelevant,
            disposition,
          })
        })
      }
      if (zone.enemies) {
        const areaDefeated = defeatedEnemies?.[currentAreaId] || []
        const partySize = Math.max(1, (partyMembers?.length || 0) + (myCharacter ? 1 : 0))
        const enemyGroups = {}
        zone.enemies.forEach(e => {
          if (!e.position) return
          if (areaDefeated.includes(e.name)) return
          if (!enemyGroups[e.name]) enemyGroups[e.name] = []
          enemyGroups[e.name].push(e)
        })
        Object.values(enemyGroups).forEach(group => {
          const maxShow = partySize <= 2 ? Math.min(group.length, partySize) : Math.min(group.length, partySize + 1)
          group.slice(0, maxShow).forEach(e => {
            t.push({
              id: e.id, name: e.name,
              x: e.position.x, y: e.position.y,
              color: 0x8b0000, borderColor: 0xff3333,
              isEnemy: true, isNpc: false,
            })
          })
        })
      }
    }

    // Always include NPCs during combat
    if (inCombat && zone.npcs) {
      zone.npcs.forEach(npc => {
        if (!npc.position) return
        t.push({
          id: npc.name, name: npc.name,
          x: npc.position.x, y: npc.position.y,
          color: 0x1a1208,
          borderColor: npc.questRelevant ? 0xc9a84c : 0x8a7a52,
          isNpc: true, questRelevant: npc.questRelevant,
        })
      })
    }
    return t
  }, [playerPos, zone, myCharacter, inCombat, encounter.combatants, encounter.currentTurn, defeatedEnemies, currentAreaId, partyMembers])

  const nearbyNpcs = useMemo(() => {
    if (!zone?.npcs || inCombat || activeNpc) return []
    return zone.npcs.filter(npc => {
      if (!npc.position) return false
      const dx = Math.abs(playerPos.x - npc.position.x)
      const dy = Math.abs(playerPos.y - npc.position.y)
      return dx <= 2 && dy <= 2
    })
  }, [zone?.npcs, playerPos, inCombat, activeNpc])

  return { tokens, nearbyNpcs }
}
