import { supabase } from './supabase'

let cachedKey = null

/**
 * Load the platform default API key from Supabase app_config table.
 * Only authenticated users can read it (RLS enforced).
 * Returns null if no default key is configured (BYOK mode).
 */
export async function loadDefaultApiKey() {
  if (cachedKey) return cachedKey

  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'default_claude_api_key')
      .maybeSingle()

    if (error) {
      console.warn('[defaultApiKey] Failed to load:', error.message)
      return null
    }

    if (data?.value) {
      cachedKey = data.value
      return cachedKey
    }
  } catch (e) {
    console.warn('[defaultApiKey] Error:', e.message)
  }

  return null
}

/**
 * Clear the cached key (e.g., on sign out).
 */
export function clearDefaultApiKeyCache() {
  cachedKey = null
}
