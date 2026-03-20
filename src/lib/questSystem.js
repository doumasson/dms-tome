/**
 * Quest system logic — pure functions for quest creation and objective tracking.
 */

let _nextId = 1
function uid() {
  return `q_${_nextId++}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Create a new quest object.
 * @param {string} title
 * @param {{ text: string }[]} objectives
 * @param {object} [opts] — optional overrides (id, description, etc.)
 * @returns {object} quest
 */
export function createQuest(title, objectives, opts = {}) {
  return {
    id: uid(),
    title,
    description: '',
    objectives: objectives.map(obj => ({
      id: uid(),
      text: obj.text,
      completed: false,
    })),
    status: 'active',
    createdAt: Date.now(),
    ...opts,
  }
}

/**
 * Return a new quest with the given objective marked as completed.
 * @param {object} quest
 * @param {string} objectiveId
 * @returns {object} updated quest (immutable)
 */
export function completeObjective(quest, objectiveId) {
  return {
    ...quest,
    objectives: quest.objectives.map(obj =>
      obj.id === objectiveId ? { ...obj, completed: true } : obj
    ),
  }
}

/**
 * Returns true if every objective in the quest is completed.
 * @param {object} quest
 * @returns {boolean}
 */
export function isQuestComplete(quest) {
  return quest.objectives.every(obj => obj.completed)
}
