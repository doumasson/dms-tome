import { useState } from 'react';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';
import { generateContinuationScenes } from '../lib/narratorApi';
import { getClaudeApiKey } from '../lib/claudeApi';
import { broadcastAppendScenes, broadcastSceneChange } from '../lib/liveChannel';

export default function CampaignEndModal({ onWrapUp }) {
  const campaign        = useStore(s => s.campaign);
  const activeCampaign  = useStore(s => s.activeCampaign);
  const partyMembers    = useStore(s => s.partyMembers);
  const user            = useStore(s => s.user);
  const sessionApiKey   = useStore(s => s.sessionApiKey);
  const appendScenes    = useStore(s => s.appendScenes);
  const setCurrentScene = useStore(s => s.setCurrentScene);
  const setCampaignComplete = useStore(s => s.setCampaignComplete);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const lastScene = (campaign.scenes || []).at(-1);

  async function handleKeepPlaying() {
    setLoading(true);
    setError(null);
    try {
      const apiKey = getClaudeApiKey(user?.id) || sessionApiKey;
      if (!apiKey) throw new Error('No Claude API key — the DM must add one in ⚙ Settings.');

      const newScenes = await generateContinuationScenes(
        activeCampaign?.campaign_data,
        partyMembers,
        lastScene,
        apiKey,
      );

      if (!newScenes?.length) throw new Error('Failed to generate new scenes. Try again.');

      const nextSceneIndex = (campaign.scenes || []).length;

      // Update in-memory state
      appendScenes(newScenes);

      // Persist to Supabase so all future sessions have the new scenes
      const mergedData = {
        ...(activeCampaign?.campaign_data || {}),
        scenes: [...(campaign.scenes || []), ...newScenes],
      };
      await supabase
        .from('campaigns')
        .update({ campaign_data: mergedData })
        .eq('id', activeCampaign?.id);

      // Advance to the first new scene
      setCurrentScene(nextSceneIndex);

      // Broadcast new scenes + scene advance to all clients
      broadcastAppendScenes(newScenes, nextSceneIndex);
      broadcastSceneChange(nextSceneIndex);

      setCampaignComplete(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Decorative top border */}
        <div style={styles.topBorder} />

        <div style={styles.icon}>⚔</div>
        <h2 style={styles.title}>The Adventure Concludes</h2>
        <p style={styles.campaignName}>{campaign.title || 'Your Campaign'}</p>
        <p style={styles.flavor}>
          Your party's tale reaches its end… but the world keeps turning.
          New dangers stir beyond the horizon, and legends are never truly finished.
        </p>

        {error && <div style={styles.errorBar}>{error}</div>}

        <div style={styles.btnRow}>
          <button
            onClick={handleKeepPlaying}
            disabled={loading}
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.spinner} />
                Weaving new adventures…
              </span>
            ) : '✨ Keep Playing'}
          </button>
          <button
            onClick={onWrapUp}
            disabled={loading}
            style={{ ...styles.btn, ...styles.btnGhost }}
          >
            ⚔ Wrap Up
          </button>
        </div>

        {loading && (
          <p style={styles.loadingHint}>
            The Narrator is crafting new scenes for your party…
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  modal: {
    background: 'linear-gradient(160deg, #1a1008, #110b05)',
    border: '1px solid rgba(212,175,55,0.35)',
    borderRadius: 14,
    padding: '40px 36px',
    maxWidth: 480,
    width: '100%',
    textAlign: 'center',
    position: 'relative',
    boxShadow: '0 0 60px rgba(212,175,55,0.08)',
  },
  topBorder: {
    position: 'absolute', top: 0, left: '15%', right: '15%', height: 2,
    background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
    borderRadius: 2,
  },
  icon: {
    fontSize: '2.5rem', marginBottom: 16, opacity: 0.7,
  },
  title: {
    fontFamily: "'Cinzel', Georgia, serif",
    color: '#d4af37', fontSize: '1.5rem', fontWeight: 700,
    margin: '0 0 8px', letterSpacing: '0.06em',
  },
  campaignName: {
    color: 'rgba(212,175,55,0.55)', fontSize: '0.85rem',
    fontFamily: "'Cinzel', Georgia, serif", margin: '0 0 20px',
    letterSpacing: '0.04em',
  },
  flavor: {
    color: 'rgba(232,220,200,0.7)', fontSize: '0.9rem', lineHeight: 1.7,
    margin: '0 0 28px', fontStyle: 'italic',
  },
  errorBar: {
    background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)',
    color: '#e74c3c', padding: '8px 14px', borderRadius: 6,
    fontSize: '0.82rem', marginBottom: 16,
  },
  btnRow: {
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  btn: {
    width: '100%', padding: '13px 0', borderRadius: 8,
    fontSize: '0.95rem', fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
    border: 'none', transition: 'opacity 0.15s',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #d4af37, #a8841f)',
    color: '#1a0e00',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  btnGhost: {
    background: 'transparent',
    border: '1px solid rgba(212,175,55,0.25)',
    color: 'rgba(212,175,55,0.6)',
  },
  loadingHint: {
    color: 'rgba(200,180,140,0.4)', fontSize: '0.78rem',
    fontStyle: 'italic', marginTop: 16, marginBottom: 0,
  },
  spinner: {
    display: 'inline-block', width: 14, height: 14,
    border: '2px solid rgba(26,14,0,0.3)',
    borderTopColor: '#1a0e00', borderRadius: '50%',
    animation: 'spin360 0.8s linear infinite',
  },
};
