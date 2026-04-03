import { callClaude } from './aiProxy'

const CLAUDE_MODEL = 'claude-sonnet-4-6';

export function getClaudeApiKey(userId) {
  return localStorage.getItem(`claude-api-key-${userId}`) || '';
}

export function setClaudeApiKey(userId, key) {
  if (key) {
    localStorage.setItem(`claude-api-key-${userId}`, key);
  } else {
    localStorage.removeItem(`claude-api-key-${userId}`);
  }
}

export async function generateCampaignJSON(prompt, _apiKey) {
  const data = await callClaude({
    model: CLAUDE_MODEL,
    maxTokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });
  return data.content[0].text;
}
