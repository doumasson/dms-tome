import { findPathEdge } from './pathfinding.js'
import { rollDamage } from './dice.js'

const NARRATOR_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Manhattan distance on the grid
function gridDist(a, b) {
  if (!a || !b) return 999;
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Find the closest living player to this enemy
function findClosestPlayer(enemy, combatants) {
  const players = combatants.filter(c => c.type === 'player' && c.currentHp > 0 && c.position);
  if (!players.length) return null;
  return players.reduce((best, p) =>
    gridDist(enemy.position, p.position) < gridDist(enemy.position, best.position) ? p : best
  );
}

// Move towards a target using simple pathfinding (no obstacle avoidance for now)
function stepTowards(from, to, maxSteps, combatants) {
  if (!from || !to) return null;
  let { x, y } = from;
  let stepsLeft = maxSteps;

  while (stepsLeft > 0) {
    const dx = to.x - x;
    const dy = to.y - y;
    if (dx === 0 && dy === 0) break;

    // Prefer the axis with larger gap to avoid getting stuck
    let nx = x, ny = y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      nx = x + Math.sign(dx);
    } else {
      ny = y + Math.sign(dy);
    }

    // Check if cell is occupied
    const occupied = combatants.some(c => c.id !== combatants.find(e => e.position?.x === from.x && e.position?.y === from.y)?.id
      && c.position?.x === nx && c.position?.y === ny && c.currentHp > 0
    );
    if (occupied) break;

    x = nx; y = ny;
    stepsLeft--;
  }

  return (x === from.x && y === from.y) ? null : { x, y };
}

// Build a compact prompt for the AI describing the combat state
function buildEnemyTurnPrompt(enemy, encounter) {
  const players = encounter.combatants.filter(c => c.type === 'player' && c.currentHp > 0);
  const otherEnemies = encounter.combatants.filter(c => c.type === 'enemy' && c.id !== enemy.id && c.currentHp > 0);

  const partyLines = players.map(p =>
    `- ${p.name}: HP ${p.currentHp}/${p.maxHp}, AC ${p.ac}, pos (${p.position?.x ?? '?'},${p.position?.y ?? '?'}), conditions: ${p.conditions?.join(',') || 'none'}`
  ).join('\n');

  const alliesLines = otherEnemies.length
    ? otherEnemies.map(e => `- ${e.name}: HP ${e.currentHp}/${e.maxHp}, pos (${e.position?.x ?? '?'},${e.position?.y ?? '?'})`).join('\n')
    : 'None';

  const attacks = enemy.attacks?.map(a => `${a.name} (${a.bonus}, ${a.damage})`).join(', ') || 'Unarmed Strike (+0, 1d4)';
  const pos = enemy.position ? `(${enemy.position.x},${enemy.position.y})` : 'unplaced';
  const moveSquares = enemy.remainingMove ?? Math.floor((enemy.speed || 30) / 5);

  return `You are a tactical D&D 5e Dungeon Master controlling ${enemy.name} in combat.

ENEMY: ${enemy.name}
- HP: ${enemy.currentHp}/${enemy.maxHp}, AC: ${enemy.ac}, Position: ${pos}
- Speed: ${enemy.speed || 30}ft (${moveSquares} squares remaining)
- Attacks: ${attacks}
- Conditions: ${enemy.conditions?.join(', ') || 'none'}

PARTY (enemies to ${enemy.name}):
${partyLines || 'No players visible'}

ALLIES:
${alliesLines}

GRID: 10x8 (0-9 x-axis, 0-7 y-axis). Each square = 5ft. Grid uses (x,y) coords.

Decide ${enemy.name}'s turn. Respond ONLY with this exact JSON — no markdown, no extra text:
{"action":"attack","targetId":"<player_id>","attackRoll":<d20_total>,"hit":<true|false>,"damage":<number>,"damageType":"<type>","moveToPosition":{"x":<0-9>,"y":<0-7>},"appliedConditions":[],"narrative":"<1-2 sentence vivid narration of what the enemy does>","logEntry":"<short combat log line>"}

Rules:
- Pick the most tactically sound action (attack nearest player, move to flank, etc.)
- If the enemy can reach a player, attack. If not, move toward the nearest player.
- attackRoll = d20 roll + attack bonus total. Set hit=true if attackRoll >= target AC.
- If no attack this turn, set targetId to null and damage to 0.
- moveToPosition: choose a valid grid cell to move to (within movement range), or omit if not moving.
- narrative: write as the DM narrating to players — present tense, immersive, 1-2 sentences.`;
}

/**
 * Compute grunt enemy action — move toward nearest target, attack if adjacent.
 * Uses edge-based pathfinding for collision-aware movement.
 */
export function computeGruntAction(enemy, combatants, collisionData, width, height) {
  if (!enemy.position) return { action: 'wait', narrative: `${enemy.name} waits.` }
  const targets = combatants.filter(c => !c.isEnemy && c.type !== 'enemy' && c.currentHp > 0 && c.position)
  if (!targets.length) return { action: 'wait', narrative: `${enemy.name} waits.` }

  // Find nearest target (Chebyshev distance)
  let nearest = null, minDist = Infinity
  for (const t of targets) {
    const dx = Math.abs(t.position.x - enemy.position.x)
    const dy = Math.abs(t.position.y - enemy.position.y)
    const dist = Math.max(dx, dy)
    if (dist < minDist) { minDist = dist; nearest = t }
  }

  if (!nearest) return { action: 'wait', narrative: `${enemy.name} waits.` }

  const weapon = enemy.attacks?.[0] || { name: 'Attack', bonus: '+3', damage: '1d6+1' }
  const bonus = parseInt(weapon.bonus) || 0

  // Adjacent? Attack immediately.
  if (minDist <= 1) {
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus
    const isCrit = d20 === 20
    const hit = isCrit || total >= (nearest.ac || 10)
    const damage = hit ? (isCrit ? rollDamage(weapon.damage).total * 2 : rollDamage(weapon.damage).total) : 0
    return {
      action: 'attack',
      targetId: nearest.id,
      targetName: nearest.name,
      hit, damage, d20, bonus, total, isCrit,
      weapon: weapon.name,
      narrative: hit
        ? `${enemy.name} strikes ${nearest.name} with ${weapon.name} for ${damage} damage${isCrit ? ' (CRITICAL!)' : ''}!`
        : `${enemy.name} swings at ${nearest.name} with ${weapon.name} but misses!`,
    }
  }

  // Not adjacent — pathfind toward target
  const maxTiles = Math.floor((enemy.speed || 30) / 5)
  const path = collisionData
    ? findPathEdge(collisionData, width, height, enemy.position, nearest.position)
    : null
  if (!path || path.length <= 1) {
    // No pathfinding data — use simple step-toward fallback
    const fallback = stepTowards(enemy.position, nearest.position, maxTiles, combatants)
    if (!fallback) return { action: 'wait', narrative: `${enemy.name} cannot reach any target.` }
    const fbDist = Math.max(Math.abs(fallback.x - nearest.position.x), Math.abs(fallback.y - nearest.position.y))
    if (fbDist <= 1) {
      const d20 = Math.floor(Math.random() * 20) + 1
      const total = d20 + bonus
      const isCrit = d20 === 20
      const hit = isCrit || total >= (nearest.ac || 10)
      const damage = hit ? (isCrit ? rollDamage(weapon.damage).total * 2 : rollDamage(weapon.damage).total) : 0
      return {
        action: 'move-attack', moveTo: fallback, moveCost: Math.max(Math.abs(fallback.x - enemy.position.x), Math.abs(fallback.y - enemy.position.y)),
        targetId: nearest.id, targetName: nearest.name, hit, damage, d20, bonus, total, isCrit, weapon: weapon.name,
        narrative: `${enemy.name} charges toward ${nearest.name}! ${hit ? `${damage} damage${isCrit ? ' (CRITICAL!)' : ''}!` : 'But misses!'}`,
      }
    }
    return { action: 'move', moveTo: fallback, moveCost: Math.max(Math.abs(fallback.x - enemy.position.x), Math.abs(fallback.y - enemy.position.y)), narrative: `${enemy.name} advances toward the party.` }
  }

  // Stop one tile short of the target (don't land on their tile)
  const maxPathIdx = path.length >= 2 ? path.length - 2 : path.length - 1
  const moveIdx = Math.min(maxTiles, maxPathIdx)
  const moveEnd = path[moveIdx]
  const movePath = path.slice(0, moveIdx + 1)
  const moveCost = moveIdx

  // Check if adjacent after moving
  const distAfterMove = Math.max(
    Math.abs(moveEnd.x - nearest.position.x),
    Math.abs(moveEnd.y - nearest.position.y)
  )

  if (distAfterMove <= 1) {
    // Move + attack
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus
    const isCrit = d20 === 20
    const hit = isCrit || total >= (nearest.ac || 10)
    const damage = hit ? (isCrit ? rollDamage(weapon.damage).total * 2 : rollDamage(weapon.damage).total) : 0
    return {
      action: 'move-attack',
      moveTo: moveEnd, movePath, moveCost,
      targetId: nearest.id, targetName: nearest.name,
      hit, damage, d20, bonus, total, isCrit,
      weapon: weapon.name,
      narrative: `${enemy.name} charges toward ${nearest.name}! ${hit ? `${damage} damage${isCrit ? ' (CRITICAL!)' : ''}!` : 'But misses!'}`,
    }
  }

  return {
    action: 'move',
    moveTo: moveEnd, movePath, moveCost,
    narrative: `${enemy.name} advances toward the party.`,
  }
}

export async function triggerEnemyTurn(enemy, encounter, apiKey) {
  if (!apiKey) throw new Error('No API key available');

  // Fast path: if no players alive, return do-nothing
  const alivePlayers = encounter.combatants.filter(c => c.type === 'player' && c.currentHp > 0);
  if (!alivePlayers.length) {
    return { action: 'idle', narrative: `${enemy.name} surveys the battlefield.`, targetId: null, damage: 0 };
  }

  // Try to do a basic local attack first (fallback if AI fails)
  const closestPlayer = findClosestPlayer(enemy, encounter.combatants);
  const moveSquares = enemy.remainingMove ?? Math.floor((enemy.speed || 30) / 5);
  const canReach = closestPlayer && gridDist(enemy.position, closestPlayer.position) <= 1;
  const canMoveAndReach = closestPlayer && gridDist(enemy.position, closestPlayer.position) <= moveSquares + 1;

  // Ask the AI for the enemy's turn decision
  const prompt = buildEnemyTurnPrompt(enemy, encounter);

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: NARRATOR_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    // Fallback: do a local attack roll without AI
    return localEnemyTurn(enemy, encounter, closestPlayer, canReach, canMoveAndReach, moveSquares);
  }

  const data = await response.json();
  const raw = data.content[0].text.trim();

  // Parse the JSON response
  let text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) text = text.slice(jsonStart, jsonEnd + 1);

  try {
    const result = JSON.parse(text);
    // Validate targetId is a real combatant
    if (result.targetId) {
      const target = encounter.combatants.find(c => c.id === result.targetId);
      if (!target) result.targetId = closestPlayer?.id || null;
    }
    return result;
  } catch {
    // JSON parse failed — fall back to local roll
    return localEnemyTurn(enemy, encounter, closestPlayer, canReach, canMoveAndReach, moveSquares);
  }
}

// Fallback local computation if AI call fails
function localEnemyTurn(enemy, encounter, target, canReach, canMoveAndReach, moveSquares) {
  const attacks = enemy.attacks || [];
  const attack = attacks[0] || { name: 'Strike', bonus: '+0', damage: '1d6' };

  // Compute move position
  let moveToPosition = null;
  if (!canReach && target && canMoveAndReach) {
    moveToPosition = stepTowards(enemy.position, target.position, moveSquares - 1, encounter.combatants);
  }

  if (!target) {
    return { action: 'idle', narrative: `${enemy.name} holds its ground, watching warily.`, targetId: null, damage: 0, moveToPosition };
  }

  if (!canReach && !canMoveAndReach) {
    return { action: 'move', narrative: `${enemy.name} advances toward ${target.name}.`, targetId: null, damage: 0, moveToPosition };
  }

  // Roll attack
  const bonusNum = parseInt((attack.bonus || '+0').replace('+', '')) || 0;
  const d20 = Math.floor(Math.random() * 20) + 1;
  const total = d20 + bonusNum;
  const hit = d20 === 20 || (d20 !== 1 && total >= (target.ac || 10));

  let damage = 0;
  let damageDisplay = '';
  if (hit) {
    const diceMatch = (attack.damage || '1d6').match(/(\d+)d(\d+)([+-]\d+)?/);
    if (diceMatch) {
      const count = parseInt(diceMatch[1]);
      const sides = parseInt(diceMatch[2]);
      const bonus = parseInt(diceMatch[3] || '0');
      damage = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1).reduce((a, b) => a + b, 0) + bonus;
      damageDisplay = `${damage} damage`;
    }
  }

  const narrative = hit
    ? `${enemy.name} lunges at ${target.name} with its ${attack.name}, ${d20 === 20 ? 'landing a critical blow' : 'connecting for ' + damageDisplay}!`
    : `${enemy.name} swings at ${target.name} with its ${attack.name}, but the attack goes wide.`;

  return {
    action: 'attack',
    targetId: target.id,
    attackRoll: total,
    hit,
    damage: hit ? damage : 0,
    damageType: 'bludgeoning',
    moveToPosition,
    appliedConditions: [],
    narrative,
    logEntry: hit
      ? `${enemy.name} → ${target.name}: HIT d20(${d20})+${bonusNum}=${total} vs AC${target.ac} — ${damage} dmg`
      : `${enemy.name} → ${target.name}: MISS d20(${d20})+${bonusNum}=${total} vs AC${target.ac}`,
  };
}
