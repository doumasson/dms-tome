import { useState, useEffect } from 'react'
import { encryptApiKey, saveApiKeyToSupabase, loadApiKeyFromSupabase } from '../lib/apiKeyVault'
import { broadcastApiKeySync } from '../lib/liveChannel'
import useStore from '../store/useStore'

export default function ApiKeySettings({ userId, onClose }) {
  const activeCampaign = useStore(s => s.activeCampaign)
  const campaign = useStore(s => s.campaign)
  const isDM = useStore(s => s.isDM)
  const campaignId = activeCampaign?.id || campaign?.id

  const [claudeKey, setClaudeKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  // Load existing key on mount
  useEffect(() => {
    if (!campaignId || !userId) return
    loadApiKeyFromSupabase(campaignId, userId).then(key => {
      if (key) {
        setClaudeKey(key)
        setHasExisting(true)
      }
    }).catch(() => {})
  }, [campaignId, userId])

  async function handleSave() {
    const ck = claudeKey.trim()
    if (!ck || !campaignId || !userId) return

    try {
      const encrypted = await encryptApiKey(ck, campaignId, userId)
      await saveApiKeyToSupabase(campaignId, encrypted)

      // Update session and broadcast to players
      useStore.getState().setSessionApiKey(ck)
      if (isDM) broadcastApiKeySync(ck)

      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    } catch (err) {
      console.error('[ApiKeySettings] Save failed:', err)
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
        <h2 style={styles.title}>API Key Settings</h2>
        <p style={styles.hint}>
          The DM's Claude key powers the AI Dungeon Master for all players.
          Keys are encrypted and stored in your campaign record.
        </p>

        <label style={styles.label}>Claude API Key <span style={styles.labelHint}>(console.anthropic.com)</span></label>
        <input
          type="password"
          value={claudeKey}
          onChange={e => setClaudeKey(e.target.value)}
          placeholder="sk-ant-..."
          style={styles.input}
          autoComplete="off"
          spellCheck={false}
        />
        {hasExisting && <p style={styles.savedNote}>✓ Key loaded from campaign</p>}

        <div style={styles.btnRow}>
          <button onClick={handleSave} disabled={saved} style={styles.saveBtn}>
            {saved ? '✓ Saved!' : 'Save Key'}
          </button>
          <button onClick={onClose} style={styles.clearBtn}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px', boxSizing: 'border-box',
  },
  modal: {
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
    border: '1px solid rgba(201,168,76,0.25)',
    padding: '32px 36px', maxWidth: 480, width: '100%',
    boxShadow: '0 12px 48px rgba(0,0,0,0.8)', position: 'relative',
    borderRadius: 0,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 16,
    background: 'transparent', border: 'none',
    color: '#5a4a30', cursor: 'pointer', fontSize: '1rem',
    padding: 4, lineHeight: 1,
  },
  title: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
    color: '#c9a84c', fontSize: '1.2rem', fontWeight: 700,
    margin: '0 0 10px', letterSpacing: 2,
  },
  hint: {
    color: '#5a4a30', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 20px',
  },
  label: {
    color: '#bba878', fontSize: '0.8rem', fontWeight: 600,
    letterSpacing: 2, fontFamily: "'Cinzel', serif",
    display: 'block', marginBottom: 6, textTransform: 'uppercase',
  },
  labelHint: {
    color: '#5a4a30', fontSize: '0.72rem', fontFamily: 'monospace',
    fontWeight: 400, letterSpacing: 0, textTransform: 'none',
  },
  input: {
    background: 'rgba(10,8,14,0.95)', border: '1px solid rgba(201,168,76,0.2)',
    padding: '12px 14px', color: '#bba878', fontSize: '0.9rem',
    width: '100%', boxSizing: 'border-box', fontFamily: 'monospace',
    outline: 'none', letterSpacing: 1, borderRadius: 0,
  },
  savedNote: { color: '#44aa66', fontSize: '0.78rem', margin: '6px 0 0' },
  btnRow: { display: 'flex', gap: 10, marginTop: 18 },
  saveBtn: {
    flex: 1, background: 'linear-gradient(135deg, #d4b85c, #9a7a30)',
    color: '#08060c', border: 'none', padding: '12px 20px',
    fontSize: '0.9rem', fontWeight: 700, fontFamily: "'Cinzel', serif",
    cursor: 'pointer', minHeight: 46, borderRadius: 0, letterSpacing: 1,
  },
  clearBtn: {
    background: 'transparent', border: '1px solid rgba(201,168,76,0.15)',
    color: '#5a4a30', padding: '12px 16px', fontSize: '0.82rem',
    fontFamily: "'Cinzel', serif", cursor: 'pointer', minHeight: 46, borderRadius: 0,
  },
}
