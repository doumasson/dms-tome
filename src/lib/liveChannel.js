// Module-level singleton — lets DiceTray broadcast without prop drilling
let _channel = null;

export function setLiveChannel(ch) {
  _channel = ch;
}

export function broadcastDiceRoll(entry) {
  _channel?.send({ type: 'broadcast', event: 'dice-roll', payload: entry });
}

export function broadcastSceneChange(sceneIndex) {
  _channel?.send({ type: 'broadcast', event: 'scene-sync', payload: { sceneIndex } });
}

export function broadcastStartCombat(payload) {
  _channel?.send({ type: 'broadcast', event: 'combat-start', payload });
}

export function broadcastPlayerMove(tokenId, x, y, cost, userId) {
  _channel?.send({ type: 'broadcast', event: 'player-move', payload: { tokenId, x, y, cost, userId } });
}

// Broadcast any encounter state change from any player to all other clients
export function broadcastEncounterAction(action) {
  _channel?.send({ type: 'broadcast', event: 'encounter-action', payload: action });
}

// DM shares their Claude API key with all players in the session
export function broadcastApiKeySync(apiKey) {
  _channel?.send({ type: 'broadcast', event: 'api-key-sync', payload: { apiKey } });
}

// Scene token position sync (free movement outside combat)
export function broadcastSceneTokenMove(memberId, x, y, sceneKey) {
  _channel?.send({ type: 'broadcast', event: 'scene-token-move', payload: { memberId, x, y, sceneKey } });
}

// Fog of war: reveal cells (sceneKey + array of "x,y" cell keys)
export function broadcastFogReveal(sceneKey, cells) {
  _channel?.send({ type: 'broadcast', event: 'fog-reveal', payload: { sceneKey, cells } });
}

// Fog toggle (DM enables/disables fog for a scene)
export function broadcastFogToggle(sceneKey, enabled) {
  _channel?.send({ type: 'broadcast', event: 'fog-toggle', payload: { sceneKey, enabled } });
}

// Narrator message from DM AI (enemy turns, auto-events) → all players
export function broadcastNarratorMessage(msg) {
  _channel?.send({ type: 'broadcast', event: 'narrator-message', payload: msg });
}

// DM appended AI-generated continuation scenes → all players
export function broadcastAppendScenes(scenes, nextSceneIndex) {
  _channel?.send({ type: 'broadcast', event: 'append-scenes', payload: { scenes, nextSceneIndex } });
}
