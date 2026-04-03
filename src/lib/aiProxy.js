import { supabase } from './supabase'

/**
 * Proxy all Claude API calls through the Supabase Edge Function.
 * API key lives in Supabase Vault — never touches the browser.
 *
 * Returns the full Claude API response object: { content: [{ text }], ... }
 */
export async function callClaude({ model, messages, system, maxTokens }) {
  const { data, error } = await supabase.functions.invoke('ai-narrator', {
    body: { model, messages, system, maxTokens },
  })

  if (error) throw new Error(error.message || 'Edge function error')
  if (data?.error) throw new Error(data.error)

  return data
}
