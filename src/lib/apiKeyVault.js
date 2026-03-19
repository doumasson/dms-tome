import { supabase } from './supabase'

const PBKDF2_ITERATIONS = 10000

/**
 * Derive an AES-GCM encryption key from campaign ID + user ID using PBKDF2.
 * This is obfuscation at rest — not true encryption (key material is public).
 * See spec for security tradeoff documentation.
 */
async function deriveKey(campaignId, userId) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${campaignId}:${userId}`),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('dms-tome-vault'),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function isSubtleCryptoAvailable() {
  return typeof crypto !== 'undefined' && crypto.subtle != null
}

/**
 * Encrypt an API key. Returns { iv, ciphertext } as base64 strings.
 * Falls back to plaintext wrapper if SubtleCrypto unavailable (dev HTTP).
 */
export async function encryptApiKey(key, campaignId, userId) {
  if (!isSubtleCryptoAvailable()) {
    console.warn('[apiKeyVault] SubtleCrypto unavailable (non-HTTPS?) — storing plaintext')
    return { iv: '', ciphertext: btoa(key), plaintext: true }
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(key)
  const derivedKey = await deriveKey(campaignId, userId)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encoded
  )
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  }
}

/**
 * Decrypt an API key from { iv, ciphertext } base64 strings.
 * Handles plaintext fallback for dev mode.
 */
export async function decryptApiKey(payload, campaignId, userId) {
  if (!payload) return null
  // Dev-mode plaintext fallback
  if (payload.plaintext) return atob(payload.ciphertext)
  if (!isSubtleCryptoAvailable()) {
    console.warn('[apiKeyVault] SubtleCrypto unavailable — cannot decrypt')
    return null
  }
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0))
  const data = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0))
  const derivedKey = await deriveKey(campaignId, userId)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    data
  )
  return new TextDecoder().decode(decrypted)
}

/**
 * Save encrypted API key to Supabase campaign settings.
 */
export async function saveApiKeyToSupabase(campaignId, encryptedPayload) {
  const { data: cur } = await supabase
    .from('campaigns').select('settings').eq('id', campaignId).single()
  const settings = { ...(cur?.settings || {}), encrypted_api_key: encryptedPayload }
  // Remove old plaintext key if present
  delete settings.claudeApiKey
  await supabase
    .from('campaigns')
    .update({ settings })
    .eq('id', campaignId)
}

/**
 * Load encrypted API key from Supabase campaign settings.
 * Handles backward compatibility: if old plaintext `claudeApiKey` exists,
 * migrates it to encrypted format and returns the decrypted key.
 */
export async function loadApiKeyFromSupabase(campaignId, userId) {
  const { data } = await supabase
    .from('campaigns').select('settings').eq('id', campaignId).single()
  const settings = data?.settings
  if (!settings) return null

  // New encrypted format
  if (settings.encrypted_api_key) {
    try {
      return await decryptApiKey(settings.encrypted_api_key, campaignId, userId)
    } catch (e) {
      console.error('[apiKeyVault] Decryption failed:', e)
      return null
    }
  }

  // Old plaintext format — migrate
  if (settings.claudeApiKey && typeof settings.claudeApiKey === 'string') {
    console.log('[apiKeyVault] Migrating plaintext key to encrypted format')
    const encrypted = await encryptApiKey(settings.claudeApiKey, campaignId, userId)
    await saveApiKeyToSupabase(campaignId, encrypted)
    return settings.claudeApiKey
  }

  return null
}
