const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  // Require auth — supabase.functions.invoke sends the user's JWT automatically
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  }

  try {
    const { model, messages, system, maxTokens } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not set — run: npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...' }),
        { status: 500, headers: { ...CORS, 'content-type': 'application/json' } }
      )
    }

    const body: Record<string, unknown> = {
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens || 1024,
      messages,
    }
    if (system) body.system = system

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || `Claude API error ${upstream.status}` }),
        { status: upstream.status, headers: { ...CORS, 'content-type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify(data), {
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
      { status: 500, headers: { ...CORS, 'content-type': 'application/json' } }
    )
  }
})
