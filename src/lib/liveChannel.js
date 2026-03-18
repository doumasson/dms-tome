// Module-level singleton — lets DiceTray broadcast without prop drilling
let _channel = null;

export function setLiveChannel(ch) {
  _channel = ch;
}

export function broadcastDiceRoll(entry) {
  _channel?.send({ type: 'broadcast', event: 'dice-roll', payload: entry });
}
