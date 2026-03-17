import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CampaignSelect({ user, pendingInvite, onSelectCampaign, onCreateCampaign, onSignOut, onOpenSettings }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  useEffect(() => {
    fetchCampaigns();
    if (pendingInvite) {
      handleJoinByCode(pendingInvite, true);
    }
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaign_members')
      .select('role, campaigns(id, name, dm_user_id, invite_code, campaign_data, updated_at, profiles!dm_user_id(name, avatar_url))')
      .eq('user_id', user.id);

    if (!error && data) {
      setCampaigns(
        data
          .map(m => ({ ...m.campaigns, userRole: m.role }))
          .filter(Boolean)
          // sort: drafts last, then by updated_at desc
          .sort((a, b) => {
            const aDraft = !!a.campaign_data?.__draft;
            const bDraft = !!b.campaign_data?.__draft;
            if (aDraft !== bDraft) return aDraft ? 1 : -1;
            return new Date(b.updated_at) - new Date(a.updated_at);
          })
      );
    }
    setLoading(false);
  }

  async function handleJoinByCode(code, auto = false) {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) return;

    setJoining(true);
    setJoinError('');
    setJoinSuccess('');

    // Find campaign by invite code
    const { data: campaign, error: findError } = await supabase
      .from('campaigns')
      .select('id, name, dm_user_id')
      .eq('invite_code', trimmed)
      .single();

    if (findError || !campaign) {
      setJoinError('Invalid invite code. Please check and try again.');
      setJoining(false);
      localStorage.removeItem('pendingInvite');
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('campaign_members')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      // Join as player
      const { error: joinError } = await supabase
        .from('campaign_members')
        .insert({ campaign_id: campaign.id, user_id: user.id, role: 'player' });

      if (joinError) {
        setJoinError('Failed to join campaign. Please try again.');
        setJoining(false);
        localStorage.removeItem('pendingInvite');
        return;
      }
    }

    localStorage.removeItem('pendingInvite');
    setJoinSuccess(`Joined "${campaign.name}"!`);
    setJoining(false);
    setJoinCode('');
    await fetchCampaigns();
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>DM's Tome</span>
        </div>
        <div style={styles.userInfo}>
          {user.avatar_url && (
            <img src={user.avatar_url} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
          )}
          <span style={styles.userName}>{user.name}</span>
          <button onClick={onOpenSettings} style={styles.settingsBtn} title="API Key Settings">⚙</button>
          <button onClick={onSignOut} style={styles.signOutBtn}>Sign Out</button>
        </div>
      </header>

      <div style={styles.content}>
        <h2 style={styles.heading}>Your Campaigns</h2>

        {/* Join by code */}
        <div style={styles.joinSection}>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code..."
            style={styles.joinInput}
            maxLength={12}
          />
          <button
            onClick={() => handleJoinByCode(joinCode)}
            disabled={joining || !joinCode.trim()}
            style={styles.joinBtn}
          >
            {joining ? 'Joining...' : 'Join Campaign'}
          </button>
        </div>
        {joinError && <p style={styles.errorMsg}>{joinError}</p>}
        {joinSuccess && <p style={styles.successMsg}>✓ {joinSuccess}</p>}

        {/* Campaign list */}
        {loading ? (
          <div style={styles.loadingMsg}>Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>You haven't joined any campaigns yet.</p>
            <p style={styles.emptyHint}>Create a new one or enter an invite code above.</p>
          </div>
        ) : (
          <div style={styles.campaignList}>
            {campaigns.map(campaign => {
              const isDraft = !!campaign.campaign_data?.__draft;
              const draftStep = campaign.campaign_data?.__step || 1;
              return (
                <button
                  key={campaign.id}
                  onClick={() => onSelectCampaign(campaign)}
                  style={{
                    ...styles.campaignCard,
                    ...(isDraft ? styles.campaignCardDraft : {}),
                  }}
                >
                  <div style={styles.cardLeft}>
                    <div style={styles.campaignName}>
                      {campaign.name}
                      {isDraft && <span style={styles.draftBadge}>DRAFT</span>}
                    </div>
                    <div style={styles.campaignMeta}>
                      {campaign.userRole === 'dm' ? (
                        <span style={styles.dmTag}>DM</span>
                      ) : (
                        <span style={styles.playerTag}>Player</span>
                      )}
                      {campaign.profiles && (
                        <span style={styles.dmName}>DM: {campaign.profiles.name}</span>
                      )}
                      {isDraft && (
                        <span style={styles.draftHint}>Step {draftStep} of 5 — tap to continue</span>
                      )}
                    </div>
                  </div>
                  <div style={styles.cardRight}>
                    {!isDraft && campaign.updated_at && (
                      <span style={styles.lastPlayed}>Last played {formatDate(campaign.updated_at)}</span>
                    )}
                    {!isDraft && campaign.userRole === 'dm' && campaign.invite_code && (
                      <span style={styles.inviteCode}>Code: {campaign.invite_code}</span>
                    )}
                    <span style={styles.enterArrow}>{isDraft ? '✏' : '→'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Create button */}
        <button onClick={onCreateCampaign} style={styles.createBtn}>
          + Create New Campaign
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
    borderBottom: '2px solid',
    borderImage: 'linear-gradient(90deg, transparent, var(--gold-dark), var(--gold), var(--gold-dark), transparent) 1',
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerLeft: {},
  logo: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--gold)',
    letterSpacing: '0.06em',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '2px solid var(--border-gold)',
    objectFit: 'cover',
  },
  userName: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  settingsBtn: {
    background: 'transparent',
    border: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
  },
  signOutBtn: {
    background: 'transparent',
    border: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  content: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '40px 24px',
    width: '100%',
    boxSizing: 'border-box',
  },
  heading: {
    fontFamily: "'Cinzel', Georgia, serif",
    color: 'var(--gold)',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 28px',
    letterSpacing: '0.04em',
  },
  joinSection: {
    display: 'flex',
    gap: 10,
    marginBottom: 8,
  },
  joinInput: {
    flex: 1,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.08em',
    outline: 'none',
  },
  joinBtn: {
    background: 'linear-gradient(160deg, #3a2412, #2e1e0e)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    borderRadius: 8,
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.88rem',
    whiteSpace: 'nowrap',
    minHeight: 48,
  },
  errorMsg: {
    color: 'var(--danger-light)',
    fontSize: '0.85rem',
    margin: '4px 0 16px',
  },
  successMsg: {
    color: 'var(--success-light)',
    fontSize: '0.85rem',
    margin: '4px 0 16px',
  },
  loadingMsg: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '40px 0',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 0',
    borderTop: '1px solid var(--border-color)',
    borderBottom: '1px solid var(--border-color)',
    margin: '16px 0',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
    margin: '0 0 8px',
  },
  emptyHint: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    margin: 0,
  },
  campaignList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    margin: '16px 0',
  },
  campaignCard: {
    background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
    border: '1px solid var(--border-color)',
    borderRadius: 10,
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, transform 0.1s',
    width: '100%',
  },
  cardLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 0,
  },
  campaignName: {
    color: 'var(--parchment)',
    fontSize: '1.05rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  campaignMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  dmTag: {
    background: 'rgba(212,175,55,0.15)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.1em',
  },
  playerTag: {
    background: 'rgba(46,204,113,0.1)',
    border: '1px solid rgba(46,204,113,0.3)',
    color: 'var(--success-light)',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.1em',
  },
  dmName: {
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
  },
  cardRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  lastPlayed: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
  },
  inviteCode: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  },
  enterArrow: {
    color: 'var(--gold)',
    fontSize: '1.1rem',
    fontWeight: 700,
    marginTop: 4,
  },
  campaignCardDraft: {
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  draftBadge: {
    marginLeft: 10,
    background: 'rgba(139, 0, 0, 0.15)',
    border: '1px dashed rgba(139,0,0,0.5)',
    color: '#c0392b',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 4,
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.1em',
    verticalAlign: 'middle',
  },
  draftHint: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontStyle: 'italic',
  },
  createBtn: {
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00',
    border: 'none',
    borderRadius: 10,
    padding: '16px 28px',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    cursor: 'pointer',
    width: '100%',
    minHeight: 54,
    marginTop: 12,
    letterSpacing: '0.04em',
    boxShadow: '0 0 20px rgba(212,175,55,0.2)',
  },
};
