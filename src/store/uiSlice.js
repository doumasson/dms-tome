/**
 * UI slice — narrator/chat, session log, dice roller.
 */

import { v4 as uuidv4 } from 'uuid';

export function createUiSlice(set, get) {
  return {
    // === Narrator (AI DM) ===
    narrator: {
      history: [], // { id, role: 'player'|'dm', speaker, text, rollRequest, timestamp }
      open: false,
    },
    addNarratorMessage: (msg) =>
      set((state) => {
        const logEntry = msg.role === 'player'
          ? {
              id: uuidv4(), timestamp: Date.now(),
              type: 'narrator', icon: '\ud83d\udde3',
              title: msg.speaker || 'Player',
              detail: msg.text?.slice(0, 100),
            }
          : msg.rollRequest
            ? {
                id: uuidv4(), timestamp: Date.now(),
                type: 'roll-request', icon: '\ud83c\udfb2',
                title: `Roll ${msg.rollRequest.skill} \u2014 DC ${msg.rollRequest.dc}`,
                detail: msg.rollRequest.character ? `For ${msg.rollRequest.character}` : null,
              }
            : null;
        return {
          narrator: {
            ...state.narrator,
            history: [
              ...state.narrator.history,
              { id: uuidv4(), timestamp: Date.now(), ...msg },
            ].slice(-50),
          },
          sessionLog: logEntry
            ? [logEntry, ...state.sessionLog].slice(0, 120)
            : state.sessionLog,
        };
      }),
    setNarratorOpen: (open) =>
      set((state) => ({ narrator: { ...state.narrator, open } })),
    clearNarratorHistory: () =>
      set((state) => ({ narrator: { ...state.narrator, history: [] } })),

    // === Session Log (unified activity feed) ===
    sessionLog: [], // { id, type, icon, title, detail, timestamp }
    addSessionEntry: (entry) =>
      set((state) => ({
        sessionLog: [
          { id: uuidv4(), timestamp: Date.now(), ...entry },
          ...state.sessionLog,
        ].slice(0, 120),
      })),
    clearSessionLog: () => set({ sessionLog: [] }),

    // === Dice ===
    dice: {
      rollHistory: [],
    },
    addRoll: (rollEntry) =>
      set((state) => {
        const mod = rollEntry.modifier !== 0 ? ` ${rollEntry.modifier > 0 ? '+' : ''}${rollEntry.modifier}` : '';
        const label = `${rollEntry.count}d${rollEntry.die}${mod}`;
        const detail = rollEntry.advantageRolls
          ? `[${rollEntry.advantageRolls.join(', ')}] (${rollEntry.advantage})`
          : rollEntry.rolls.length > 1
            ? `[${rollEntry.rolls.join(', ')}]`
            : null;
        const isNat = rollEntry.die === 20 && rollEntry.rolls[0] === 20;
        const isFail = rollEntry.die === 20 && rollEntry.rolls[0] === 1;
        return {
          dice: {
            rollHistory: [rollEntry, ...state.dice.rollHistory].slice(0, 10),
          },
          sessionLog: [
            {
              id: uuidv4(),
              timestamp: Date.now(),
              type: 'roll',
              icon: isNat ? '\u2b50' : isFail ? '\ud83d\udc80' : '\ud83c\udfb2',
              title: `${rollEntry.rolledBy ? `${rollEntry.rolledBy}: ` : ''}${label} = ${rollEntry.total}${isNat ? ' \u2014 NAT 20!' : isFail ? ' \u2014 NAT 1!' : ''}`,
              detail,
            },
            ...state.sessionLog,
          ].slice(0, 120),
        };
      }),
    clearHistory: () =>
      set({
        dice: { rollHistory: [] },
      }),
  };
}
