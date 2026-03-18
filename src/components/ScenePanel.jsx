import { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { generateSceneImage, generateSceneImageFree, getOpenAiKey } from '../lib/dalleApi';

export default function ScenePanel() {
  const user           = useStore(s => s.user);
  const activeCampaign = useStore(s => s.activeCampaign);
  const campaign       = useStore(s => s.campaign);
  const dmMode         = useStore(s => s.dmMode);
  const isDM           = useStore(s => s.isDM);
  const setCurrentScene = useStore(s => s.setCurrentScene);
  const startEncounter  = useStore(s => s.startEncounter);
  const sceneImages     = useStore(s => s.sceneImages);
  const setSceneImage   = useStore(s => s.setSceneImage);

  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError]     = useState(false);

  const scenes = campaign.scenes || [];
  const idx    = campaign.currentSceneIndex || 0;
  const scene  = scenes[idx] || null;
  const imageKey = `${activeCampaign?.id}:${idx}`;
  const imageUrl = sceneImages[imageKey];

  // Auto-generate scene image when scene changes and nothing cached yet
  useEffect(() => {
    if (!scene || imageUrl || imgLoading) return;
    setImgError(false);

    const openAiKey = getOpenAiKey(user?.id);
    if (openAiKey) {
      // Paid: DALL-E 3 high quality
      setImgLoading(true);
      generateSceneImage(scene.title, scene.text, openAiKey)
        .then(url => setSceneImage(imageKey, url))
        .catch(() => setImgError(true))
        .finally(() => setImgLoading(false));
    } else {
      // Free: Pollinations.ai — URL resolves in browser, no async needed
      const url = generateSceneImageFree(scene.title, scene.text);
      setSceneImage(imageKey, url);
    }
  }, [idx, activeCampaign?.id]);

  function handleStartCombat() {
    if (!scene?.enemies?.length) return;
    startEncounter(scene.enemies, campaign.characters);
  }

  if (!campaign.loaded) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📜</div>
        <h2 style={styles.emptyTitle}>No Campaign Loaded</h2>
        <p style={styles.emptyText}>
          Import a campaign JSON to begin your adventure.
        </p>
      </div>
    );
  }

  if (!scene) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🗺</div>
        <h2 style={styles.emptyTitle}>No Scenes Found</h2>
        <p style={styles.emptyText}>This campaign has no scenes yet.</p>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      {/* Scene Image */}
      <div style={styles.imageContainer}>
        {imgLoading && (
          <div style={styles.imageSkeleton}>
            <div style={styles.skeletonShimmer} />
            <span style={styles.skeletonLabel}>✦ Painting the scene…</span>
          </div>
        )}
        {imageUrl && !imgLoading && !imgError && (
          <img
            src={imageUrl}
            alt={scene.title}
            style={styles.sceneImage}
            onError={() => setImgError(true)}
          />
        )}
        {(!imageUrl || imgError) && !imgLoading && (
          <div style={styles.imagePlaceholder}>
            <span style={styles.placeholderGlyph}>⚔</span>
            {imgError && <span style={styles.imgErrorNote}>Image unavailable</span>}
          </div>
        )}
        {/* Scene index badge */}
        <div style={styles.sceneBadge}>
          Scene {idx + 1} / {scenes.length}
        </div>
      </div>

      {/* Scene Content */}
      <div style={styles.content}>
        <h2 style={styles.sceneTitle}>{scene.title}</h2>

        {scene.text && (
          <p style={styles.sceneText}>{scene.text}</p>
        )}

        {/* DM Notes */}
        {isDM && dmMode && scene.dmNotes && (
          <div className="dm-only" style={styles.dmNotes}>
            <span style={styles.dmNotesLabel}>DM Notes</span>
            <p style={styles.dmNotesText}>{scene.dmNotes}</p>
          </div>
        )}

        {/* Player choices */}
        {scene.choices?.length > 0 && (
          <div style={styles.choices}>
            <span style={styles.choicesLabel}>Choices</span>
            <ul style={styles.choiceList}>
              {scene.choices.map((c, i) => (
                <li key={i} style={styles.choiceItem}>
                  <span style={styles.choiceBullet}>▸</span> {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* DM Navigation Controls */}
        {isDM && dmMode && (
          <div style={styles.dmControls}>
            <button
              onClick={() => setCurrentScene(Math.max(0, idx - 1))}
              disabled={idx === 0}
              style={styles.navBtn}
            >
              ◀ Prev
            </button>

            <button
              onClick={() => setCurrentScene(Math.min(scenes.length - 1, idx + 1))}
              disabled={idx >= scenes.length - 1}
              style={styles.navBtn}
            >
              Next ▶
            </button>

            {scene.isEncounter && scene.enemies?.length > 0 && (
              <button onClick={handleStartCombat} style={styles.combatBtn}>
                ⚔ Start Combat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
    background: 'var(--bg-primary)',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    flexShrink: 0,
    background: '#0a0705',
    overflow: 'hidden',
  },
  sceneImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    opacity: 0.92,
  },
  imageSkeleton: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #1a1008 0%, #0e0b07 50%, #1a1008 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.04) 50%, transparent 100%)',
    animation: 'shimmer 2s infinite',
  },
  skeletonLabel: {
    color: 'rgba(212,175,55,0.4)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.8rem',
    letterSpacing: '0.12em',
    zIndex: 1,
    animation: 'goldPulse 2s infinite',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: 'linear-gradient(160deg, #1a1008, #0e0b07)',
  },
  placeholderGlyph: {
    fontSize: '3rem',
    opacity: 0.12,
  },
  imgErrorNote: {
    color: 'rgba(200,180,140,0.3)',
    fontSize: '0.72rem',
    fontStyle: 'italic',
  },
  sceneBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(0,0,0,0.65)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 4,
    color: 'rgba(212,175,55,0.7)',
    fontSize: '0.68rem',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.06em',
    padding: '3px 9px',
  },
  content: {
    padding: '24px 28px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  sceneTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--gold-light)',
    letterSpacing: '0.05em',
    margin: 0,
    textShadow: '0 0 20px rgba(212,175,55,0.3)',
  },
  sceneText: {
    color: 'var(--text-secondary)',
    fontSize: '0.97rem',
    lineHeight: 1.75,
    margin: 0,
    fontStyle: 'italic',
  },
  dmNotes: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  dmNotesLabel: {
    color: 'rgba(200,80,80,0.8)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  dmNotesText: {
    color: 'rgba(240,200,200,0.8)',
    fontSize: '0.88rem',
    lineHeight: 1.6,
    margin: 0,
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  choicesLabel: {
    color: 'var(--parchment-dim)',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  choiceList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  choiceItem: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
    lineHeight: 1.5,
  },
  choiceBullet: {
    color: 'var(--gold-dark)',
    flexShrink: 0,
    marginTop: 1,
  },
  dmControls: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTop: '1px solid rgba(212,175,55,0.1)',
  },
  navBtn: {
    background: 'linear-gradient(160deg, #3a2412, #2e1e0e)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-secondary)',
    borderRadius: 6,
    padding: '8px 18px',
    fontSize: '0.82rem',
    fontFamily: "'Cinzel', Georgia, serif",
    cursor: 'pointer',
    minHeight: 40,
  },
  combatBtn: {
    background: 'linear-gradient(135deg, #8b0000, #5a0000)',
    border: '1px solid rgba(200,50,50,0.4)',
    color: '#ffd0cc',
    borderRadius: 6,
    padding: '8px 22px',
    fontSize: '0.85rem',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: 40,
    letterSpacing: '0.04em',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
    opacity: 0.3,
  },
  emptyTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    color: 'var(--text-muted)',
    fontSize: '1.1rem',
    margin: 0,
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    maxWidth: 320,
    lineHeight: 1.6,
    margin: 0,
  },
};
