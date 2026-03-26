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
    // Support both { position: {x,y} } and flat { x, y } format
    const ex0 = exit.position?.x ?? exit.x
    const ey0 = exit.position?.y ?? exit.y
    if (ex0 == null || ey0 == null) continue
    const w = exit.width || 1
    const h = exit.height || 1
    for (let ix = 0; ix < w; ix++) {
      for (let iy = 0; iy < h; iy++) {
        const dx = Math.abs(playerPos.x - (ex0 + ix))
        const dy = Math.abs(playerPos.y - (ey0 + iy))
        if (dx <= 1 && dy <= 1) {
          return exit
        }
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

export function getAdjacentInteractable(playerPos, zone) {
  if (!zone?.interactables) return null
  for (const obj of zone.interactables) {
    if (obj.opened) continue
    const dx = Math.abs(playerPos.x - obj.position.x)
    const dy = Math.abs(playerPos.y - obj.position.y)
    if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
      return obj
    }
  }
  return null
}

/**
 * Get all available interactions at player position.
 * Returns an array of { type, target } for the interaction menu.
 */
export function getAvailableInteractions(playerPos, zone) {
  const results = []
  const npc = getAdjacentNpc(playerPos, zone)
  if (npc) {
    results.push({ type: 'talk', target: npc })
  }
  const interactable = getAdjacentInteractable(playerPos, zone)
  if (interactable) {
    if (interactable.type === 'chest') {
      if (interactable.locked) {
        results.push({ type: 'lockpick', target: interactable })
        results.push({ type: 'force_open', target: interactable })
      } else {
        results.push({ type: 'open_chest', target: interactable })
      }
    } else if (interactable.type === 'searchable' && !interactable.opened) {
      results.push({ type: 'search', target: interactable })
    }
  }
  const exit = getAdjacentExit(playerPos, zone)
  if (exit) results.push({ type: 'exit', target: exit })
  // No blanket "search area" — search is only available near interactable objects
  // Players must find specific searchable spots, chests, or containers
  return results
}


export function handleInteract(playerPos, zone) {
  const npc = getAdjacentNpc(playerPos, zone)
  if (npc) return { type: 'npc', target: npc }
  const interactable = getAdjacentInteractable(playerPos, zone)
  if (interactable) return { type: 'interactable', target: interactable }
  const exit = getAdjacentExit(playerPos, zone)
  if (exit) return { type: 'exit', target: exit }
  return null
}
