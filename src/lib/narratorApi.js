const NARRATOR_MODEL = 'claude-haiku-4-5-20251001';

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
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export function buildSystemPrompt(campaignData, partyMembers, currentScene, exchangeCount) {
  const title = campaignData?.title || 'an unnamed campaign';

  const partyLines = (partyMembers || [])
    .map(c =>
      `- ${c.name}, Level ${c.level || 1} ${c.class || 'Adventurer'} (${c.race || 'Unknown'}) — HP: ${c.currentHp ?? c.maxHp}/${c.maxHp}, AC: ${c.ac || 10}`
    )
    .join('\n');

  // Include enemy info if scene has it, so AI knows what opponents exist
  const sceneEnemies = currentScene?.enemies || currentScene?.encounters?.[0]?.enemies || [];
  const enemyList = sceneEnemies.length > 0
    ? `\nEnemies available for combat: ${sceneEnemies.map(e => `${e.name} (HP ${e.hp}, AC ${e.ac})`).join(', ')}`
    : '';
  const sceneText = currentScene
    ? `Current Scene: "${currentScene.title}"\n${currentScene.text || ''}${enemyList}`
    : 'The party is between scenes.';

  // After 4+ exchanges in a scene, allow the AI to conclude it
  const advanceHint = (exchangeCount || 0) >= 4
    ? `\n- After ${exchangeCount} exchanges the scene energy is building — if the players have taken a meaningful action and it is narratively satisfying, set advanceScene to true to move the story forward.`
    : '';

  return `You are the Dungeon Master for a D&D 5e campaign called "${title}".

${sceneText}

Party Members:
${partyLines || 'No characters loaded yet.'}

You are narrating this live session. When players describe their actions or speak to NPCs, respond as the DM:
- Be vivid but concise — 2 to 4 sentences per response
- Give NPCs distinct personalities, secrets, and motivations
- When a player's action requires a roll, name the skill and set a DC
- Honor failure as richly as success — both tell a good story
- Stay immersed; never break character or reference being an AI
- React to creative, unexpected actions with "yes, and" energy${advanceHint}

Respond ONLY with a raw JSON object — no markdown, no code fences, no extra text before or after:
{"narrative":"Your DM narration here.","rollRequest":{"character":"CharacterName","skill":"Stealth","dc":14},"stateHint":"Brief internal note or null","advanceScene":false,"startCombat":false,"enemies":[]}

Rules for special fields:
- advanceScene: true ONLY when the scene has clearly concluded and the story must move to the next scene. Default false.
- startCombat: true ONLY when the players are clearly initiating combat (charging, attacking, drawing weapons aggressively). This triggers the battle map. Default false. Do NOT combine startCombat and advanceScene in the same response.
- enemies: ONLY populate when startCombat is true. Use the enemies listed in the scene, or invent appropriate opponents that fit the narrative. Each enemy: {"name":"Goblin","hp":7,"ac":15,"speed":30,"stats":{"str":8,"dex":14,"con":10,"int":10,"wis":8,"cha":8},"attacks":[{"name":"Scimitar","bonus":"+4","damage":"1d6+2"}],"count":1}`;
}

export async function callNarrator({ messages, systemPrompt, apiKey }) {
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
      messages,
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
    if (parsed && typeof parsed.narrative === 'string') return parsed;
    return { narrative: String(parsed?.narrative || '(No response)'), rollRequest: null, stateHint: null, advanceScene: false };
  } catch {
    // Try to extract narrative value with a regex that handles escaped quotes
    const narrativeMatch = text.match(/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (narrativeMatch) {
      return {
        narrative: narrativeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
        rollRequest: null, stateHint: null, advanceScene: false,
      };
    }
    // Never show raw JSON — return a DM pause message
    return { narrative: '(The Dungeon Master pauses to consider the situation…)', rollRequest: null, stateHint: null, advanceScene: false };
  }
}
