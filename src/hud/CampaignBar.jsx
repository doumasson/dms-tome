import { useState } from 'react'
import useStore from '../store/useStore'

export default function CampaignBar({ onSettings, onLeave }) {
  const campaign = useStore(s => s.campaign)
  const activeCampaign = useStore(s => s.activeCampaign)
  const partyMembers = useStore(s => s.partyMembers)
  const [copied, setCopied] = useState(false)

  const title = campaign?.title || activeCampaign?.name || 'Untitled Campaign'
  const inviteCode = activeCampaign?.invite_code
  const playerCount = (partyMembers?.length || 0) + 1

  function handleCopyInvite() {
    if (!inviteCode) return
    const url = `${window.location.origin}?invite=${inviteCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="hud-campaign-bar stone-panel">
      <span className="hud-campaign-name">{title}</span>
      <span className="hud-campaign-players">
        ⚔ {playerCount} {playerCount === 1 ? 'Adventurer' : 'Adventurers'}
      </span>
      <svg width="1" height="20" style={{ opacity: 0.2 }}>
        <line x1="0" y1="0" x2="0" y2="20" stroke="#c9a84c" strokeWidth="1"/>
      </svg>
      <button className="hud-campaign-btn" onClick={handleCopyInvite} title="Copy invite link">
        <span>{copied ? '✓' : '📋'}</span>
        <span className="hud-campaign-btn-label">{copied ? 'COPIED' : 'INVITE'}</span>
        <svg className="hud-btn-filigree" width="100%" height="100%" viewBox="0 0 44 34" preserveAspectRatio="none">
          <path d="M0,6 L0,3 Q0,0 3,0 L6,0" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,0 L41,0 Q44,0 44,3 L44,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M0,28 L0,31 Q0,34 3,34 L6,34" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,34 L41,34 Q44,34 44,31 L44,28" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
        </svg>
      </button>
      <button className="hud-campaign-btn" onClick={onSettings} title="API Key Settings">
        <span>⚙</span>
        <span className="hud-campaign-btn-label">SETTINGS</span>
        <svg className="hud-btn-filigree" width="100%" height="100%" viewBox="0 0 44 34" preserveAspectRatio="none">
          <path d="M0,6 L0,3 Q0,0 3,0 L6,0" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,0 L41,0 Q44,0 44,3 L44,6" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M0,28 L0,31 Q0,34 3,34 L6,34" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,34 L41,34 Q44,34 44,31 L44,28" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.3"/>
        </svg>
      </button>
      <button className="hud-campaign-btn hud-campaign-btn-danger" onClick={onLeave} title="Leave campaign">
        <span>🚪</span>
        <span className="hud-campaign-btn-label">LEAVE</span>
        <svg className="hud-btn-filigree" width="100%" height="100%" viewBox="0 0 44 34" preserveAspectRatio="none">
          <path d="M0,6 L0,3 Q0,0 3,0 L6,0" fill="none" stroke="#cc3333" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,0 L41,0 Q44,0 44,3 L44,6" fill="none" stroke="#cc3333" strokeWidth="1.2" opacity="0.3"/>
          <path d="M0,28 L0,31 Q0,34 3,34 L6,34" fill="none" stroke="#cc3333" strokeWidth="1.2" opacity="0.3"/>
          <path d="M38,34 L41,34 Q44,34 44,31 L44,28" fill="none" stroke="#cc3333" strokeWidth="1.2" opacity="0.3"/>
        </svg>
      </button>
    </div>
  )
}
