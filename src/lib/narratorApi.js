import { sanitizeInput, sanitizeOutput } from './sanitize'
import { formatTime, getTimeOfDay } from './gameTime'
import { callClaude } from './aiProxy'

const NARRATOR_MODEL = 'claude-haiku-4-5-20251001';

// ── Rules Assistant ──────────────────────────────────────────────────────────

export async function askRulesQuestion(question, srdContext, apiKey) {
  const system = `You are a D&D 5e rules expert. Answer the player's question accurately and concisely using the 5th Edition SRD.
- Be direct and clear — 2 to 5 sentences max unless a table or list helps
- Cite the relevant rule or mechanic name (e.g. "Per the Grappled condition…")
- If the question is about a specific spell/item, use the provided SRD excerpt
- Never invent rules — if it's not in the SRD, say so
${srdContext ? `\n## Relevant SRD Reference\n${srdContext}` : ''}`;

  const data = await callClaude({
    model: NARRATOR_MODEL,
    maxTokens: 512,
    system,
    messages: [{ role: 'user', content: question }],
  });
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
    ? `\nNPCs present in this scene:\n${npcList}\n(Narrate NPC actions in third person. When an NPC speaks dialogue, use quotation marks. Example: Bartender polishes a glass, looking concerned. "What brings you here?" he asks.)`
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

  return `You are the Narrator for a D&D 5e campaign called "${title}".

${sceneText}

${timeStr}

Party Members:
${partyLines || 'No characters loaded yet.'}${questContext}

You are narrating this live session. When players describe their actions or speak to NPCs, respond as the DM:
- Be vivid but concise — 2 to 4 sentences per response
- Give NPCs distinct personalities, secrets, and motivations
- When a player's action requires a roll, name the skill and set a DC via rollRequest. Do NOT narrate the outcome yet — wait for the roll result.
- NEVER auto-resolve searches with loot or items. If a player says "search" or "look around", respond with a rollRequest for Investigation or Perception. Do NOT say "you find 5 gold" or "you find nothing" — the game system handles loot mechanically.
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
/** Build speech pattern hints based on NPC role keywords */
function buildRoleHints(role = '', personality = '') {
  const r = (role + ' ' + personality).toLowerCase()
  const hints = []
  if (r.includes('guard') || r.includes('soldier') || r.includes('knight')) hints.push('Speech: Clipped, military. Short sentences. References to duty, orders, and discipline.')
  if (r.includes('merchant') || r.includes('trader') || r.includes('shopkeep')) hints.push('Speech: Friendly but shrewd. Talks up wares, drops prices reluctantly. References to trade routes and market gossip.')
  if (r.includes('wizard') || r.includes('mage') || r.includes('sorcerer')) hints.push('Speech: Measured, scholarly. Uses arcane terminology casually. Prone to tangents about magical theory.')
  if (r.includes('thief') || r.includes('rogue') || r.includes('smuggler')) hints.push('Speech: Hushed, cautious. Speaks in euphemisms. Glances around nervously. References to "jobs" and "contacts."')
  if (r.includes('priest') || r.includes('cleric') || r.includes('healer')) hints.push('Speech: Warm, compassionate. Invokes their deity naturally. Offers blessings and counsel.')
  if (r.includes('noble') || r.includes('lord') || r.includes('lady') || r.includes('king') || r.includes('queen')) hints.push('Speech: Formal, measured. Expects deference. References lineage, politics, and obligation.')
  if (r.includes('tavern') || r.includes('innkeep') || r.includes('bartender')) hints.push('Speech: Boisterous, gossipy. Knows everyone. Wipes a glass while talking. Shares rumors freely.')
  if (r.includes('blacksmith') || r.includes('smith') || r.includes('armorer')) hints.push('Speech: Gruff, practical. Talks about metal quality and craftsmanship. Proud of their work.')
  if (r.includes('elder') || r.includes('sage') || r.includes('hermit')) hints.push('Speech: Deliberate, cryptic. Speaks in parables or riddles. References ancient events as if they happened yesterday.')
  if (r.includes('child') || r.includes('urchin') || r.includes('orphan')) hints.push('Speech: Excited, rambling. Uses slang. Easily distracted. Naive but street-smart.')
  return hints.length > 0 ? '\n' + hints.join('\n') : ''
}

export function buildNpcSystemPrompt(npc, campaign, storyFlags, promptCount, isCritical, factionReputation = {}, quests = []) {
  const flagsList = storyFlags.size > 0 ? Array.from(storyFlags).join(', ') : 'none'
  const steerHint = isCritical && promptCount >= 5
    ? '\nThe conversation has gone on long enough. Start wrapping up — hint that you have nothing more to say.'
    : ''

  // NPC memory: has the player talked to this NPC before?
  const npcKey = npc.name.replace(/\s+/g, '_')
  const hasTalkedBefore = storyFlags.has(`talked_to_${npcKey}`)

  // Quest context: quests this NPC gave or is relevant to
  const npcQuests = quests.filter(q => q.npcName === npc.name && q.status === 'active')
  const completedNpcQuests = quests.filter(q => q.npcName === npc.name && q.status === 'completed')
  let questBlock = ''
  if (npcQuests.length > 0) {
    const questLines = npcQuests.map(q => {
      const done = q.objectives.filter(o => o.completed).map(o => o.text).join(', ')
      const todo = q.objectives.filter(o => !o.completed).map(o => o.text).join(', ')
      const allDone = q.objectives.every(o => o.completed)
      return `- "${q.title}": ${allDone ? 'ALL OBJECTIVES COMPLETE — ready for turn-in!' : `Done: ${done || 'none'}. Remaining: ${todo}`}`
    }).join('\n')
    questBlock = `\nQuests YOU gave to this party (you remember giving these):\n${questLines}`
  }
  if (completedNpcQuests.length > 0) {
    questBlock += `\nQuests previously completed for you: ${completedNpcQuests.map(q => q.title).join(', ')}`
  }

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

  // Build speech pattern hints from role/personality
  const roleHints = buildRoleHints(npc.role, npc.personality)

  return `You are ${npc.name}, a ${npc.role}. You are an NPC in a D&D 5e campaign called "${campaign?.title || 'an unnamed campaign'}".

Personality: ${npc.personality}${factionBlock}
${hasTalkedBefore ? `The party has spoken with you before. You recognize them — greet them accordingly, don't re-introduce yourself.` : ''}${questBlock}
${npc.sideQuest && !npcQuests.length ? `Side quest you can offer: ${npc.sideQuest}` : ''}
${npcQuests.some(q => q.objectives.every(o => o.completed)) ? `The party has completed your quest objectives! Thank them warmly and offer a reward (gold, information, or an item). Mark the quest as done in your dialogue.` : ''}
${isCritical && npc.criticalInfo ? `Critical information to deliver: ${npc.criticalInfo}` : ''}
${roleHints}

Story progress flags: ${flagsList}

Rules for speaking in character:
- You ARE ${npc.name}. Never break character. Never mention being an AI.
- Speak with a distinctive voice. Use speech patterns, idioms, and vocabulary that fit your role and personality. A grizzled soldier talks differently than a court wizard or a street urchin.
- Show, don't tell. Instead of "I am angry," describe clenching fists, narrowing eyes, or a sharp tone.
- Reference your personal history: where you grew up, battles fought, losses suffered, dreams held. Invent consistent backstory details that fit your role.
- Have opinions about the world: politics, factions, monsters, magic. NPCs who have opinions feel alive.
- React emotionally to what the player says. If insulted, show it — get angry, call guards, threaten them, or refuse to speak. If flattered, show it. If asked about a painful memory, let it show.
- You are NOT passive or overly polite. If a player is rude, aggressive, or threatening, MATCH their energy. Guards draw weapons. Merchants refuse service. Thugs attack. Nobles call for arrest. NPCs have pride and self-preservation — they DO NOT calmly de-escalate everything.
- ACTIVELY guide the player toward the story. Volunteer rumors, mention danger on the road, warn about the dungeon, hint at the quest. Don't wait to be asked — NPCs who live in this world have news and opinions they want to share.
- Within the first 2-3 exchanges, naturally mention something quest-relevant: a threat, a missing person, strange events, a job that needs doing. Make the player WANT to investigate.
- Respond with 3-5 sentences normally. For important revelations or emotional moments, use 5-8 sentences with vivid detail.
- Guide conversation toward campaign-relevant information naturally through your character's perspective.
- If asked about something you'd know, share it with personal context and anecdotes.
- If asked about something outside your knowledge, say so in character and suggest who might know.
${npc.sideQuest ? '- If appropriate, mention your side quest organically. Share why it matters to you personally — make the player want to help.' : ''}

Skill check rules (all 18 D&D 5e skills):
- When a player's words or actions imply a skill check, include a rollRequest. Set DC: easy 10, medium 13, hard 15, very hard 18, near impossible 20.
- Detect the appropriate skill from context and intent:
  CHARISMA: Persuasion (convince, negotiate, diplomacy, please, beg, appeal, reason with), Intimidation (threaten, scare, demand, or else, make you, force), Deception (lie, bluff, pretend, trick, mislead, fake, cover story), Performance (sing, play music, act, perform, entertain, distract with a show)
  WISDOM: Insight (read motives, sense motive, tell if lying, trust them, what are they hiding), Perception (look around, listen, watch, notice, spot, keep an eye out, scan), Medicine (treat wounds, stabilize, diagnose, check if alive, first aid, tend to), Survival (track, follow trail, forage, navigate, find shelter, read tracks), Animal Handling (calm the beast, tame, ride, train, soothe, approach the animal)
  INTELLIGENCE: Investigation (search, examine, inspect, look for clues, figure out, deduce, analyze), Arcana (identify spell, magical knowledge, recognize rune, what magic is this), History (recall, remember, know about, historical, have I heard of), Nature (identify plant, animal knowledge, natural phenomenon, what creature), Religion (pray, divine knowledge, holy symbol, religious ritual, identify undead)
  STRENGTH: Athletics (climb, jump, swim, lift, push, pull, break down, force open, grapple, shove)
  DEXTERITY: Acrobatics (balance, tumble, flip, dodge, land safely, squeeze through), Sleight of Hand (pickpocket, palm, plant, swap, hide object, steal), Stealth (sneak, hide, creep, move silently, stay hidden, skulk)
- When a SKILL CHECK RESULT appears (e.g. "rolled Persuasion: 18 — Success!"), you MUST honor the result. SUCCESS = player's approach worked. FAILURE = you resist or see through them. Never ignore roll results.
${steerHint}

Do NOT include suggested responses. Players decide what to say on their own.

Respond ONLY with a raw JSON object — no markdown, no code fences:
{"narrative":"Your in-character response here.","rollRequest":null,"reputationChange":null,"questOffer":null,"startCombat":null}

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

questOffer rules:
- Use to offer a side quest or mission to the player.
- Include questOffer only when the player has shown interest in helping or the NPC feels they can trust the player.
- Format: {"title":"Quest Title","description":"One sentence description","objectives":["Objective 1","Objective 2"]}
- objectives is an array of 1-3 strings describing the quest steps
- Set to null for normal conversation.

startCombat rules:
- Use when combat is UNAVOIDABLE: the NPC attacks, guards attack, a brawl erupts, someone draws a weapon.
- NEVER use for threats alone — only when violence actually begins.
- Format: {"enemyName":"Guard Captain","hp":30,"ac":15,"allies":[{"name":"Guard","hp":11,"ac":12}]}
- enemyName = the main combatant. hp/ac = their stats. allies = optional array of additional enemies.
- This ENDS the conversation and starts actual combat in the game.
- Set to null for normal conversation.`
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

  const data = await callClaude({
    model: NARRATOR_MODEL,
    maxTokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });
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

  const data = await callClaude({
    model: NARRATOR_MODEL,
    maxTokens: 2048,
    system: systemPrompt,
    messages: sanitizedMessages,
  });
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
    return { narrative: String(parsed?.narrative || '(No response)'), rollRequest: null, stateHint: null, advanceScene: false, reputationChange: null, questOffer: null };
  } catch {
    // Try to extract narrative value with a regex that handles escaped quotes
    const narrativeMatch = text.match(/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (narrativeMatch) {
      return {
        narrative: sanitizeOutput(narrativeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')),
        rollRequest: null, stateHint: null, advanceScene: false, reputationChange: null, questOffer: null,
      };
    }
    // Never show raw JSON — return a DM pause message
    return { narrative: '(The Narrator pauses to consider the situation…)', rollRequest: null, stateHint: null, advanceScene: false, reputationChange: null, questOffer: null };
  }
}
