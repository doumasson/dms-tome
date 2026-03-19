import { useState } from 'react'
import { encryptApiKey, saveApiKeyToSupabase } from '../lib/apiKeyVault'
import { broadcastApiKeySync } from '../lib/liveChannel'
import useStore from '../store/useStore'

/**
 * Full-screen gate shown when no API key is available.
 * DM: sees input field to enter key.
 * Non-DM: sees waiting message (key comes via broadcast from DM).
 */
export default function ApiKeyGate({ campaignId, userId, onKeyReady }) {
  const isDM = useStore(s => s.isDM)
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      const encrypted = await encryptApiKey(trimmed, campaignId, userId)
      await saveApiKeyToSupabase(campaignId, encrypted)
      broadcastApiKeySync(trimmed)
      useStore.getState().setSessionApiKey(trimmed)
      onKeyReady?.(trimmed)
    } catch (err) {
      console.error('[ApiKeyGate] Save failed:', err)
      setError('Failed to save key. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.gate}>
        {/* Ornate corner filigree */}
        <svg style={styles.cornerTL} width="60" height="60" viewBox="0 0 60 60">
          <path d="M0,20 L0,6 Q0,0 6,0 L20,0" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
          <path d="M0,14 L0,4 Q0,0 4,0 L14,0" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>
        <svg style={styles.cornerTR} width="60" height="60" viewBox="0 0 60 60">
          <path d="M40,0 L54,0 Q60,0 60,6 L60,20" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
          <path d="M46,0 L56,0 Q60,0 60,4 L60,14" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
        </svg>
        <svg style={styles.cornerBL} width="60" height="60" viewBox="0 0 60 60">
          <path d="M0,40 L0,54 Q0,60 6,60 L20,60" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
        </svg>
        <svg style={styles.cornerBR} width="60" height="60" viewBox="0 0 60 60">
          <path d="M40,60 L54,60 Q60,60 60,54 L60,40" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.6"/>
        </svg>

        {/* Decorative divider */}
        <svg width="200" height="12" viewBox="0 0 200 12" style={{ margin: '0 auto 16px', display: 'block' }}>
          <path d="M0,6 L70,6 Q85,0 100,6 Q115,12 130,6 L200,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.4"/>
          <circle cx="100" cy="6" r="3" fill="#c9a84c" opacity="0.3"/>
        </svg>

        <h1 style={styles.title}>
          {isDM ? 'The Dungeon Master Awaits' : 'Awaiting the Dungeon Master'}
        </h1>
        <p style={styles.subtitle}>
          {isDM
            ? 'An API key is required to summon the AI Dungeon Master.'
            : 'Waiting for the Dungeon Master to share the realm key...'}
        </p>

        {isDM ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Claude API Key
              <span style={styles.labelHint}> — console.anthropic.com</span>
            </label>
            <div style={styles.inputRow}>
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="sk-ant-..."
                style={styles.input}
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              <button type="button" onClick={() => setShow(!show)} style={styles.toggleBtn}>
                {show ? '◉' : '○'}
              </button>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={saving || !key.trim()} style={styles.enterBtn}>
              {saving ? 'Entering...' : 'Enter the Realm'}
            </button>
          </form>
        ) : (
          <div style={styles.waitingDots}>
            <span style={styles.dot}>◆</span>
            <span style={{ ...styles.dot, animationDelay: '0.3s' }}>◆</span>
            <span style={{ ...styles.dot, animationDelay: '0.6s' }}>◆</span>
          </div>
        )}

        {/* Bottom divider */}
        <svg width="200" height="12" viewBox="0 0 200 12" style={{ margin: '16px auto 0', display: 'block' }}>
          <path d="M0,6 L70,6 Q85,12 100,6 Q115,0 130,6 L200,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.4"/>
          <circle cx="100" cy="6" r="3" fill="#c9a84c" opacity="0.3"/>
        </svg>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'radial-gradient(ellipse at center, #14101c 0%, #08060c 70%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  gate: {
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(20,16,28,0.98) 0%, rgba(8,6,12,0.98) 100%)',
    border: '1px solid rgba(201,168,76,0.25)',
    padding: '48px 56px',
    maxWidth: 480, width: '90%',
    textAlign: 'center',
  },
  cornerTL: { position: 'absolute', top: -2, left: -2 },
  cornerTR: { position: 'absolute', top: -2, right: -2 },
  cornerBL: { position: 'absolute', bottom: -2, left: -2 },
  cornerBR: { position: 'absolute', bottom: -2, right: -2 },
  title: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
    color: '#eedd88', fontSize: 22, fontWeight: 700,
    letterSpacing: 3, margin: '0 0 12px',
    textShadow: '0 0 20px rgba(201,168,76,0.3)',
  },
  subtitle: {
    fontFamily: "'Cinzel', serif",
    color: '#8a7a52', fontSize: 13, lineHeight: 1.7,
    margin: '0 0 28px', letterSpacing: 1,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: {
    fontFamily: "'Cinzel', serif", color: '#bba878',
    fontSize: 11, fontWeight: 700, letterSpacing: 2,
    textTransform: 'uppercase', textAlign: 'left',
  },
  labelHint: {
    color: '#5a4a30', fontSize: 9, fontFamily: 'monospace',
    fontWeight: 400, letterSpacing: 0, textTransform: 'none',
  },
  inputRow: { display: 'flex', gap: 4 },
  input: {
    flex: 1,
    background: 'rgba(10,8,14,0.95)',
    border: '1px solid rgba(201,168,76,0.2)',
    padding: '14px 16px', color: '#bba878', fontSize: 14,
    fontFamily: 'monospace', letterSpacing: 1,
    outline: 'none', borderRadius: 0,
  },
  toggleBtn: {
    width: 42, background: 'rgba(10,8,14,0.95)',
    border: '1px solid rgba(201,168,76,0.15)',
    color: '#8a7a52', cursor: 'pointer', fontSize: 16,
    borderRadius: 0, padding: 0, minHeight: 0,
  },
  error: { color: '#cc3333', fontSize: 11, margin: 0, textAlign: 'left' },
  enterBtn: {
    background: 'linear-gradient(135deg, #d4b85c, #9a7a30)',
    border: 'none', padding: '14px 24px',
    fontFamily: "'Cinzel', serif", fontSize: 13,
    fontWeight: 900, letterSpacing: 3, color: '#08060c',
    cursor: 'pointer', textTransform: 'uppercase',
    marginTop: 8, borderRadius: 0, minHeight: 0,
  },
  waitingDots: {
    display: 'flex', justifyContent: 'center', gap: 12, padding: '20px 0',
  },
  dot: {
    color: '#c9a84c', fontSize: 10, opacity: 0.4,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
}
