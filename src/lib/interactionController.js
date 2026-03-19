/**
 * Determines what the player can interact with at their current position.
 */

export function getAdjacentNpc(playerPos, zone) {
  if (!zone?.npcs) return null
  for (const npc of zone.npcs) {
    if (!npc.position) continue
    const dx = Math.abs(playerPos.x - npc.position.x)
    const dy = Math.abs(playerPos.y - npc.position.y)
    if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
      return npc
    }
  }
  return null
}

export function getAdjacentExit(playerPos, zone) {
  if (!zone?.exits) return null
  for (const exit of zone.exits) {
    if (!exit.position) continue
    const w = exit.width || 1
    for (let i = 0; i < w; i++) {
      const ex = exit.position.x + i
      const ey = exit.position.y
      const dx = Math.abs(playerPos.x - ex)
      const dy = Math.abs(playerPos.y - ey)
      if (dx <= 1 && dy <= 1) {
        return exit
      }
    }
  }
  return null
}

export function resolveHint(npc, storyFlags) {
  if (!npc.hints || npc.hints.length === 0) {
    return npc.personality || ''
  }
  for (let i = npc.hints.length - 1; i >= 0; i--) {
    const hint = npc.hints[i]
    if (hint.after === null || hint.after === undefined) {
      return hint.text
    }
    if (storyFlags.has(hint.after)) {
      return hint.text
    }
  }
  return npc.hints[0]?.text || npc.personality || ''
}

export function handleInteract(playerPos, zone) {
  const npc = getAdjacentNpc(playerPos, zone)
  if (npc) return { type: 'npc', target: npc }
  const exit = getAdjacentExit(playerPos, zone)
  if (exit) return { type: 'exit', target: exit }
  return null
}
