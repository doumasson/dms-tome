// Module-level singleton — lets DiceTray broadcast without prop drilling
let _channel = null;
let _localUserId = null;

export function setLiveChannel(ch) {
  _channel = ch;
}

export function setLocalUserId(id) {
  _localUserId = id;
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

// Non-DM player requests the API key from DM on refresh/rejoin
export function broadcastRequestApiKey() {
  _channel?.send({ type: 'broadcast', event: 'request-api-key', payload: {} })
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
  // Include _senderId so the receiver can skip its own echoed messages (prevents duplicates)
  _channel?.send({ type: 'broadcast', event: 'narrator-message', payload: { ...msg, _senderId: _localUserId } });
}

// DM appended AI-generated continuation scenes → all players
export function broadcastAppendScenes(scenes, nextSceneIndex) {
  _channel?.send({ type: 'broadcast', event: 'append-scenes', payload: { scenes, nextSceneIndex } });
}

// NPC dialog lock
export function broadcastNpcDialogStart(npcName, playerId, playerName, npcGender) {
  _channel?.send({ type: 'broadcast', event: 'npc-dialog-start', payload: { npcName, playerId, playerName, npcGender } })
}

export function broadcastNpcDialogEnd(npcName) {
  _channel?.send({ type: 'broadcast', event: 'npc-dialog-end', payload: { npcName } })
}

// NPC dialog conversation messages (initiator → all nearby players)
export function broadcastNpcDialogMessage(npcName, msg) {
  _channel?.send({ type: 'broadcast', event: 'npc-dialog-message', payload: { npcName, msg } })
}

// Party speaker vote — who speaks to the DM narrator
export function broadcastSpeakerVoteStart() {
  _channel?.send({ type: 'broadcast', event: 'speaker-vote-start', payload: { timestamp: Date.now() } })
}
export function broadcastSpeakerVoteCast(voterId, voterName, nomineeId, nomineeName) {
  _channel?.send({ type: 'broadcast', event: 'speaker-vote-cast', payload: { voterId, voterName, nomineeId, nomineeName } })
}
export function broadcastSpeakerDecided(speakerId, speakerName) {
  _channel?.send({ type: 'broadcast', event: 'speaker-decided', payload: { speakerId, speakerName } })
}
export function broadcastSpeakerClear() {
  _channel?.send({ type: 'broadcast', event: 'speaker-clear', payload: {} })
}

// Critical story cutscene
export function broadcastStoryCutsceneStart(npcName, initiatorId, criticalInfo) {
  _channel?.send({ type: 'broadcast', event: 'story-cutscene-start', payload: { npcName, initiatorId, criticalInfo } })
}

export function broadcastStoryCutsceneEnd(npcName, storyFlag) {
  _channel?.send({ type: 'broadcast', event: 'story-cutscene-end', payload: { npcName, storyFlag } })
}

export function broadcastCutsceneMessage(msg) {
  _channel?.send({ type: 'broadcast', event: 'cutscene-message', payload: msg })
}

export function broadcastStoryFlag(flag) {
  _channel?.send({ type: 'broadcast', event: 'story-flag', payload: { flag } })
}

export function broadcastJournalEntry(entry) {
  _channel?.send({ type: 'broadcast', event: 'journal-entry', payload: entry })
}

/* ── Area broadcasts ──────────────────────────────────────────── */

export function broadcastAreaTransition(areaId, entryPoint, isHost = false, areaData = null) {
  _channel?.send({
    type: 'broadcast',
    event: 'area-transition',
    payload: { areaId, entryPoint, isHost, areaData },
  })
}

// Request all players to re-broadcast their current position
export function broadcastRequestPositions() {
  _channel?.send({ type: 'broadcast', event: 'request-positions', payload: {} })
}

// Notify all players that a new player joined the campaign
export function broadcastPlayerJoined(userId, character) {
  _channel?.send({
    type: 'broadcast',
    event: 'player-joined',
    payload: { userId, character },
  })
}

export function broadcastTokenMove(playerId, position, path = null) {
  _channel?.send({
    type: 'broadcast',
    event: 'token-move',
    payload: { playerId, position, path },
  })
}

export function broadcastFogUpdate(areaId, base64Bitfield) {
  _channel?.send({
    type: 'broadcast',
    event: 'fog-update',
    payload: { areaId, base64Bitfield },
  })
}

export function broadcastRoofState(buildingId, revealed) {
  _channel?.send({
    type: 'broadcast',
    event: 'roof-state',
    payload: { buildingId, revealed },
  })
}

export function broadcastRoofReveal(areaId, buildingId, revealed) {
  _channel?.send({
    type: 'broadcast',
    event: 'roof-state',
    payload: { areaId, buildingId, revealed },
  })
}
