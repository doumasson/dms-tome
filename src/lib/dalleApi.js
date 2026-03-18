const DALLE_URL = 'https://api.openai.com/v1/images/generations';

// Free image generation via Pollinations.ai — no API key required
// Uses fetch() with retry so we control the timeout (browser <img> gives up too early)
// Returns a blob: URL so the image displays instantly once downloaded
export async function generateSceneImageFree(title, signal) {
  const safeTitle = (title || 'fantasy scene').slice(0, 60).replace(/[^\w\s,'-]/g, '').trim();
  const seed = Math.floor(Math.random() * 99999);

  // Try models in priority order; flux is higher quality but slower
  const models = ['turbo', 'flux'];

  for (const model of models) {
    const prompt = `dark fantasy RPG, ${safeTitle}, atmospheric, cinematic, digital art`;
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=1024&height=576&nologo=true&seed=${seed}&model=${model}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 50000);
        // Combine with caller's signal so scene-change cancels the fetch
        const onAbort = () => controller.abort();
        signal?.addEventListener('abort', onAbort);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) throw new Error('Not an image');
        const blob = await res.blob();
        if (blob.size < 8000) throw new Error('Response too small — likely an error page');
        return URL.createObjectURL(blob);
      } catch (e) {
        if (signal?.aborted) return null; // scene changed — abort silently
        if (attempt === 0) await new Promise(r => setTimeout(r, 4000)); // wait before retry
      }
    }
  }
  return null; // all attempts exhausted
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
