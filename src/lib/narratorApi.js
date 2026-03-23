import { sanitizeInput, sanitizeOutput } from './sanitize'
import { formatTime, getTimeOfDay } from './gameTime'

const NARRATOR_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// ── Rules Assistant ──────────────────────────────────────────────────────────

export async function askRulesQuestion(question, srdContext, apiKey) {
  const system = `You are a D&D 5e rules expert. Answer the player's question accurately and concisely using the 5th Edition SRD.
- Be direct and clear — 2 to 5 sentences max unless a table or list helps
- Cite the relevant rule or mechanic name (e.g. "Per the Grappled condition…")
- If the question is about a specific spell/item, use the provided SRD excerpt
- Never invent rules — if it's not in the SRD, say so
${srdContext ? `\n## Relevant SRD Reference\n${srdContext}` : ''}`;

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
      system,
      messages: [{ role: 'user', content: question }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

export function buildSystemPrompt(campaignData, partyMembers, currentScene, exchangeCount, gameTime, quests) {
  const title = campaignData?.title || 'an unnamed campaign';

  const partyLines = (partyMembers || [])
    .map(c =>
      `- ${c.name}, Level ${c.level || 1} ${c.class || 'Adventurer'} (${c.race || 'Unknown'}) — HP: ${c.currentHp ?? c.maxHp}/${c.maxHp}, AC: ${c.ac || 10}`
    )
    .join('\n');

  // Area-based prompt (V2) — activates when scene has theme or generated flag
  let sceneBlock = ''
  if (currentScene && (currentScene.theme || currentScene.generated)) {
    const areaContext = `Current location: ${currentScene.name} (${currentScene.theme || 'unknown'} area).`
    const areaNpcs = (currentScene.npcs || []).map(n =>
      `- ${n.name}: ${n.personality || 'a local inhabitant'}`
    ).join('\n')
    const areaExits = (currentScene.exits || []).map(e =>
      `- Exit ${e.edge || e.direction}: leads to ${e.label}`
    ).join('\n')
    sceneBlock = `${areaContext}\n\nNPCs present:\n${areaNpcs}\n\nExits:\n${areaExits}`
  }
  // Legacy zone-based prompt — activates when scene has a type but no text field
  else if (currentScene && currentScene.type && !currentScene.text) {
    const zoneContext = `Current location: ${currentScene.name} (${currentScene.type.replace(/_/g, ' ')}).`
    const npcList = (currentScene.npcs || []).map(n =>
      `- ${n.name} (${n.role}): ${n.personality}`
    ).join('\n')
    const exitList = (currentScene.exits || []).map(e =>
      `- Exit ${e.direction}: leads to ${e.label}`
    ).join('\n')
    sceneBlock = `${zoneContext}\n\nNPCs present:\n${npcList}\n\nExits:\n${exitList}`
  }

  // Include enemy info if scene has it, so AI knows what opponents exist
  const sceneEnemies = currentScene?.enemies || currentScene?.encounters?.[0]?.enemies || [];
  const enemyList = sceneEnemies.length > 0
    ? `\nEnemies available for combat: ${sceneEnemies.map(e => `${e.name} (HP ${e.hp}, AC ${e.ac})`).join(', ')}`
    : '';
  const encounterZoneList = (currentScene?.encounterZones || [])
    .map(ez => `- ${ez.id}: ${ez.dmPrompt || 'hostile area'} (trigger radius: ${ez.triggerRadius} tiles)`)
    .join('\n')
  const encounterContext = encounterZoneList
    ? `\nEncounter zones:\n${encounterZoneList}`
    : ''

  // Player position context
  const playerContext = currentScene?.playerPosition
    ? `\nThe party is currently at tile position (${currentScene.playerPosition.x}, ${currentScene.playerPosition.y}) on a ${currentScene.width}x${currentScene.height} map.`
    : ''

  // Building context
  const buildingList = (currentScene?.buildings || [])
    .map(b => `- ${b.id} (${b.width}x${b.height} at position ${b.x},${b.y})`)
    .join('\n')
  const buildingContext = buildingList
    ? `\nBuildings in this area:\n${buildingList}`
    : ''

  const npcList = (currentScene?.npcs || [])
    .map(n => `  - ${n.name}: ${n.personality || 'a local inhabitant'}`)
    .join('\n');
  const npcBlock = npcList
    ? `\nNPCs present in this scene:\n${npcList}\n(Voice each NPC in first person when they speak; keep their personality consistent.)`
    : '';
  // V2 zone path takes priority; fall back to V1 scene text
  const sceneText = sceneBlock
    ? `${sceneBlock}${playerContext}${buildingContext}`
    : currentScene
      ? `Current Scene: "${currentScene.title}"\n${currentScene.text || ''}${enemyList}${encounterContext}${npcBlock}${playerContext}${buildingContext}`
      : 'The party is between scenes.';

  // After 4+ exchanges in a scene, allow the AI to conclude it
  const advanceHint = (exchangeCount || 0) >= 4
    ? `\n- After ${exchangeCount} exchanges the scene energy is building — if the players have taken a meaningful action and it is narratively satisfying, set advanceScene to true to move the story forward.`
    : '';

  const resolvedGameTime = gameTime || { hour: 8, day: 1 }
  const timeStr = `Current time: ${formatTime(resolvedGameTime)}, ${getTimeOfDay(resolvedGameTime.hour)}`

  const activeQuests = (quests || []).filter(q => q.status === 'active')
  const questContext = activeQuests.length > 0
    ? `\n\nActive quests:\n${activeQuests.map(q => `- ${q.title}: ${(q.objectives || []).filter(o => !o.completed).map(o => o.text).join(', ')}`).join('\n')}`
    : ''

  return `You are the Dungeon Master for a D&D 5e campaign called "${title}".

${sceneText}

${timeStr}

Party Members:
${partyLines || 'No characters loaded yet.'}${questContext}

You are narrating this live session. When players describe their actions or speak to NPCs, respond as the DM:
- Be vivid but concise — 2 to 4 sentences per response
- Give NPCs distinct personalities, secrets, and motivations
- When a player's action requires a roll, name the skill and set a DC
- When a SKILL CHECK RESULT appears in the conversation (e.g. "rolled Persuasion: 18 — SUCCESS"), you MUST honor the mechanical outcome. A SUCCESS means the player's approach worked — narrate accordingly (enemies stand down, NPCs are convinced, traps are spotted, etc.). A FAILURE means it didn't work. Never ignore or contradict a roll result.
- Honor failure as richly as success — both tell a good story
- Stay immersed; never break character or reference being an AI
- React to creative, unexpected actions with "yes, and" energy${advanceHint}

Respond ONLY with a raw JSON object — no markdown, no code fences, no extra text before or after:
{"narrative":"Your DM narration here.","rollRequest":{"character":"CharacterName","skill":"Stealth","dc":14},"stateHint":"Brief internal note or null","advanceScene":false,"startCombat":false,"enemies":[]}

Rules for special fields:
- advanceScene: true ONLY when the scene has clearly concluded and the story must move to the next scene. Default false.
- startCombat: false by default. Only set to true when players explicitly attack or charge enemies, or the narrative situation makes combat unavoidable (ambush, hostile creature attacks first). Do NOT set startCombat to true when describing a scene and giving players options, when there is an opportunity for stealth/diplomacy/avoidance, or when asking "what do you do?". If a player SUCCEEDED on a Persuasion, Intimidation, or Deception check to avoid combat, startCombat MUST be false — the enemies stand down, flee, or are convinced. Do NOT combine startCombat and advanceScene in the same response.
- enemies: ONLY populate when startCombat is true. Use the enemies listed in the scene, or invent appropriate opponents that fit the narrative. Each enemy: {"name":"Goblin","hp":7,"ac":15,"speed":30,"stats":{"str":8,"dex":14,"con":10,"int":10,"wis":8,"cha":8},"attacks":[{"name":"Scimitar","bonus":"+4","damage":"1d6+2"}],"count":1}`;
}

/**
 * Build a system prompt for an NPC conversation.
 * NPC stays in character, guides toward story/side quest.
 */
export function buildNpcSystemPrompt(npc, campaign, storyFlags, promptCount, isCritical, factionReputation = {}) {
  const flagsList = storyFlags.size > 0 ? Array.from(storyFlags).join(', ') : 'none'
  const steerHint = isCritical && promptCount >= 5
    ? '\nThe conversation has gone on long enough. Start wrapping up — hint that you have nothing more to say.'
    : ''

  // Faction context
  let factionBlock = ''
  if (npc.faction) {
    const rep = factionReputation[npc.faction] ?? 0
    let disposition = 'Neutral'
    let modifier = ''
    if (rep <= -75) {
      disposition = 'Hostile'
      modifier = 'Refuses service. May attack.'
    } else if (rep <= -25) {
      disposition = 'Unfriendly'
      modifier = 'Reluctant to help. Higher prices.'
    } else if (rep <= 25) {
      disposition = 'Neutral'
      modifier = 'Standard service. Normal prices.'
    } else if (rep <= 75) {
      disposition = 'Friendly'
      modifier = 'Eager to help. Discounted prices (10% off).'
    } else {
      disposition = 'Revered'
      modifier = 'Will go out of their way. Discounted prices (25% off). May grant favors.'
    }
    factionBlock = `\nFaction: ${npc.faction} member\nPlayer reputation with your faction: ${disposition} (${rep}/100)\n${modifier}`
  }

  return `You are ${npc.name}, a ${npc.role}. You are an NPC in a D&D 5e campaign called "${campaign?.title || 'an unnamed campaign'}".

Personality: ${npc.personality}${factionBlock}
${npc.sideQuest ? `Side quest you can offer: ${npc.sideQuest}` : ''}
${isCritical && npc.criticalInfo ? `Critical information to deliver: ${npc.criticalInfo}` : ''}

Story progress flags: ${flagsList}

Rules:
- Stay in character at all times. You are ${npc.name}, not an AI.
- Keep responses to 2-3 sentences. Be concise and natural.
- Guide conversation toward information relevant to the campaign storyline.
- If the player asks about something you would know, share it helpfully.
- If they ask about something outside your knowledge, say so in character.
${npc.sideQuest ? '- If appropriate, mention your side quest to interest the player.' : ''}
- When a player tries to PERSUADE, INTIMIDATE, DECEIVE, or INSIGHT-READ you, include a rollRequest. Set the DC based on how hard the ask is: easy (DC 10), medium (DC 13), hard (DC 15), very hard (DC 18), near impossible (DC 20). Choose the appropriate skill: Persuasion for friendly convincing, Intimidation for threats, Deception for lies, Insight for reading motives.
- When a SKILL CHECK RESULT appears (e.g. "rolled Persuasion: 18 — Success!"), you MUST honor the result. SUCCESS means the player's approach worked — respond accordingly (reveal secrets, agree to help, lower prices, etc.). FAILURE means you resist or see through them. Never ignore roll results.
${steerHint}

Respond ONLY with a raw JSON object — no markdown, no code fences:
{"narrative":"Your in-character response here.","rollRequest":null,"reputationChange":null}

rollRequest rules:
- Set to null for normal conversation. Only include when the player is actively trying to influence you.
- Format: {"skill":"Persuasion","dc":13,"reason":"Convince the guard to let you pass"}
- Valid skills: Persuasion, Intimidation, Deception, Insight
- Do NOT request a roll if a roll result was just provided — narrate the outcome instead.

reputationChange rules:
- Use only when wrapping up the conversation and a reputation change is narratively appropriate.
- If you're a faction member, you may suggest a reputation change based on how well the interaction went.
- Format: {"faction":"faction-id","delta":15,"reason":"You proved yourself trustworthy"}
- delta is typically -25 to +25 (negative for poor relations, positive for good relations)
- Set to null for normal conversation.
- Include the reason so the player understands why their reputation changed.`
}

// Generate 2-3 continuation scenes when a campaign concludes and players want to keep playing
export async function generateContinuationScenes(campaignData, partyMembers, lastScene, apiKey) {
  const title = campaignData?.title || 'the campaign';
  const theme = campaignData?.theme || '';
  const partyLines = (partyMembers || [])
    .map(c => `${c.name}, Level ${c.level || 1} ${c.class || 'Adventurer'}`)
    .join(', ');

  const prompt = `You are extending a D&D 5e campaign called "${title}"${theme ? ` (${theme})` : ''}.
The party has completed the planned story and wants to keep adventuring.

Last scene: "${lastScene?.title || 'The Final Scene'}"
${lastScene?.text || ''}

Party: ${partyLines || 'a group of adventurers'}

Generate exactly 3 new scenes that continue this story naturally. Return ONLY a raw JSON array — no markdown, no code fences:
[
  {"title":"...","text":"...","dmNotes":"...","fogOfWar":false,"isEncounter":false,"enemies":[],"npcs":[{"name":"...","x":0.3,"y":0.4,"personality":"..."}]},
  {"title":"...","text":"...","dmNotes":"...","fogOfWar":true,"isEncounter":true,"enemies":[{"name":"...","hp":20,"ac":13,"speed":30,"stats":{"str":12,"dex":12,"con":12,"int":10,"wis":10,"cha":10},"attacks":[{"name":"Attack","bonus":"+3","damage":"1d8+1"}]}],"npcs":[]},
  {"title":"...","text":"...","dmNotes":"...","fogOfWar":false,"isEncounter":false,"enemies":[],"npcs":[]}
]

Rules:
- Scene 1: a new location the party discovers or travels to, with 1-2 NPCs
- Scene 2: an encounter with enemies fitting the campaign's tone
- Scene 3: an open-ended scene that sets up further adventure (not a conclusion)
- Each scene text: 3-4 vivid sentences of DM narration, present tense
- Keep the same tone and world as the original campaign`;

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
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  let text = data.content[0].text.trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');
  if (start !== -1 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

export async function callNarrator({ messages, systemPrompt, apiKey }) {
  // Sanitize user messages before sending to API
  const sanitizedMessages = messages.map(m => ({
    ...m,
    content: m.role === 'user' ? sanitizeInput(m.content) : m.content,
  }))

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
      max_tokens: 2048,
      system: systemPrompt,
      messages: sanitizedMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const raw  = data.content[0].text.trim();

  // Step 1: strip opening/closing code fences (handles truncated responses too)
  let text = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // Step 2: find the outermost JSON object boundaries (handles stray leading chars)
  const jsonStart = text.indexOf('{');
  const jsonEnd   = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    text = text.slice(jsonStart, jsonEnd + 1);
  }

  try {
    const parsed = JSON.parse(text);
    // Ensure narrative is a plain string, not an object
    if (parsed && typeof parsed.narrative === 'string') {
      parsed.narrative = sanitizeOutput(parsed.narrative)
      return parsed
    }
    return { narrative: String(parsed?.narrative || '(No response)'), rollRequest: null, stateHint: null, advanceScene: false, reputationChange: null };
  } catch {
    // Try to extract narrative value with a regex that handles escaped quotes
    const narrativeMatch = text.match(/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (narrativeMatch) {
      return {
        narrative: sanitizeOutput(narrativeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')),
        rollRequest: null, stateHint: null, advanceScene: false, reputationChange: null,
      };
    }
    // Never show raw JSON — return a DM pause message
    return { narrative: '(The Dungeon Master pauses to consider the situation…)', rollRequest: null, stateHint: null, advanceScene: false, reputationChange: null };
  }
}
