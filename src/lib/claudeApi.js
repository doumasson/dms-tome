const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
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

export async function generateCampaignJSON(prompt, apiKey) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.content[0].text;
}
