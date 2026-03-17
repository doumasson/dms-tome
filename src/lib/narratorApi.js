const NARRATOR_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export function buildSystemPrompt(campaignData, characters, currentScene) {
  const title = campaignData?.title || 'an unnamed campaign';

  const partyLines = (characters || [])
    .map(c =>
      `- ${c.name}, Level ${c.level || 1} ${c.class || 'Adventurer'} (${c.race || 'Unknown'}) — HP: ${c.currentHp ?? c.maxHp}/${c.maxHp}, AC: ${c.ac || 10}`
    )
    .join('\n');

  const sceneText = currentScene
    ? `Current Scene: "${currentScene.title}"\n${currentScene.text || ''}`
    : 'The party is between scenes.';

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
- React to creative, unexpected actions with "yes, and" energy

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "narrative": "Your DM narration here.",
  "rollRequest": { "character": "CharacterName", "skill": "Stealth", "dc": 14 } or null,
  "stateHint": "Brief internal note for DM awareness, or null"
}`;
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
      max_tokens: 512,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text.trim();

  try {
    return JSON.parse(text);
  } catch {
    // Fallback: treat full response as narrative if JSON parse fails
    return { narrative: text, rollRequest: null, stateHint: null };
  }
}
