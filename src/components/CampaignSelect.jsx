import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { styles } from './campaignSelect/campaignSelectStyles';

export default function CampaignSelect({ user, pendingInvite, onSelectCampaign, onCreateCampaign, onSignOut, onOpenSettings }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(null); // campaign id that was just copied

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
          <span style={styles.logo}>DungeonMind</span>
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
          <div style={styles.onboarding}>
            <div style={styles.onboardingD20}>⚔</div>
            <h3 style={styles.onboardingTitle}>Your adventure awaits.</h3>
            <p style={styles.onboardingSubtitle}>
              DungeonMind is a real SRD 5.1 game — played with friends, run by The Narrator.
              No human Narrator needed.
            </p>

            <div style={styles.onboardingSteps}>
              {[
                { n: '1', head: 'Create a campaign', body: 'Set the tone, world, and villain. The AI builds the story.' },
                { n: '2', head: 'Invite your party', body: 'Share a code. Friends join on any device — phone, tablet, laptop.' },
                { n: '3', head: 'Play', body: 'The Narrator narrates, runs enemies, calls for rolls. You just play.' },
              ].map(({ n, head, body }) => (
                <div key={n} style={styles.onboardingStep}>
                  <div style={styles.onboardingStepNum}>{n}</div>
                  <div>
                    <div style={styles.onboardingStepHead}>{head}</div>
                    <div style={styles.onboardingStepBody}>{body}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.onboardingNote}>
              <strong style={{ color: '#d4af37' }}>You'll need a Claude API key</strong> to power The Narrator.
              Get one free at{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: '#d4af37' }}>
                console.anthropic.com
              </a>
              {' '}— add it in ⚙ Settings after creating your first campaign.
            </div>
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
                      <div
                        onClick={e => {
                          e.stopPropagation();
                          const link = `${window.location.origin}${window.location.pathname}?invite=${campaign.invite_code}`;
                          navigator.clipboard.writeText(link).catch(() => navigator.clipboard.writeText(campaign.invite_code));
                          setCopiedCode(campaign.id);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        style={{ ...styles.inviteCopyBtn, cursor: 'pointer' }}
                        title="Copy invite link"
                      >
                        {copiedCode === campaign.id ? '✓ Copied!' : `📋 ${campaign.invite_code}`}
                      </div>
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

