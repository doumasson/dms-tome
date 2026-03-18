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
