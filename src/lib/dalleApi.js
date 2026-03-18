const DALLE_URL = 'https://api.openai.com/v1/images/generations';

// Free image generation via Pollinations.ai — no API key required
// model=turbo is fastest and most stable; keep prompt short to avoid URL length issues
export function generateSceneImageFree(title) {
  const safeTitle = (title || 'fantasy scene').slice(0, 60).replace(/[^\w\s,'-]/g, '').trim();
  const prompt = `dark fantasy RPG, ${safeTitle}, atmospheric lighting, cinematic, digital art`;
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=576&nologo=true&seed=${seed}&model=turbo`;
}

export function getOpenAiKey(userId) {
  return localStorage.getItem(`openai-api-key-${userId}`) || '';
}

export function setOpenAiKey(userId, key) {
  if (key) {
    localStorage.setItem(`openai-api-key-${userId}`, key);
  } else {
    localStorage.removeItem(`openai-api-key-${userId}`);
  }
}

export async function generateSceneImage(title, text, apiKey) {
  const excerpt = (text || '').slice(0, 220).replace(/\n/g, ' ');
  const prompt = `Fantasy tabletop RPG scene: "${title}". ${excerpt}. Dark fantasy digital illustration, dramatic atmospheric lighting, detailed environment, cinematic mood, no UI elements, no text overlays, no characters in foreground.`;

  const response = await fetch(DALLE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Image API error ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].url;
}
