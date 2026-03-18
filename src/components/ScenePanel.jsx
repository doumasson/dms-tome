import { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { generateSceneImage, generateSceneImageFree, getOpenAiKey, generateNpcPortrait } from '../lib/dalleApi';
import { broadcastFogReveal, broadcastFogToggle, broadcastSceneTokenMove } from '../lib/liveChannel';
import SceneTitleCard from './SceneTitleCard';
import InteractionZone from './InteractionZone';
import NpcToken from './NpcToken';

// Fog grid dimensions (cols × rows)
const FOG_COLS = 12;
const FOG_ROWS = 9;
const FOG_REVEAL_RADIUS = 2; // cells — ~10ft radius

function cellsInRadius(cx, cy, radius) {
  const cells = [];
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      if (x >= 0 && x < FOG_COLS && y >= 0 && y < FOG_ROWS) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= radius) cells.push(`${x},${y}`);
      }
    }
  }
  return cells;
}

export default function ScenePanel() {
  const user           = useStore(s => s.user);
  const activeCampaign = useStore(s => s.activeCampaign);
  const campaign       = useStore(s => s.campaign);
  const dmMode         = useStore(s => s.dmMode);
  const isDM           = useStore(s => s.isDM);
  const myCharacter    = useStore(s => s.myCharacter);
  const setPendingDmTrigger = useStore(s => s.setPendingDmTrigger);
  const setCurrentScene = useStore(s => s.setCurrentScene);
  const startEncounter  = useStore(s => s.startEncounter);
  const sceneImages     = useStore(s => s.sceneImages);
  const setSceneImage   = useStore(s => s.setSceneImage);
  const npcPortraits    = useStore(s => s.npcPortraits);
  const setNpcPortrait  = useStore(s => s.setNpcPortrait);
  const partyMembers    = useStore(s => s.partyMembers);
  const fogEnabled           = useStore(s => s.fogEnabled);
  const fogRevealed          = useStore(s => s.fogRevealed);
  const initFogForScene      = useStore(s => s.initFogForScene);
  const revealFogCells       = useStore(s => s.revealFogCells);
  const toggleFog            = useStore(s => s.toggleFog);
  const sceneTokenPositions  = useStore(s => s.sceneTokenPositions);
  const setSceneTokenPosition = useStore(s => s.setSceneTokenPosition);

  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError]     = useState(false);
  const [imgReady, setImgReady]     = useState(false);
  const [imgAttempt, setImgAttempt] = useState(0);

  // Crossfade state
  const [prevImageUrl, setPrevImageUrl] = useState(null);
  const [crossfading, setCrossfading]   = useState(false);
  const crossfadeTimer   = useRef(null);
  const prevSceneKeyRef  = useRef(null);

  // Draggable tokens — local state while dragging, synced to store on drop
  const [localPositions, setLocalPositions] = useState({});
  const [dragging, setDragging]             = useState(null); // { memberId, offsetX, offsetY }

  const containerRef = useRef(null);
  const imgAbortRef  = useRef(null);

  const scenes   = campaign.scenes || [];
  const idx      = campaign.currentSceneIndex || 0;
  const scene    = scenes[idx] || null;
  const imageKey = `${activeCampaign?.id}:${idx}`;
  const imageUrl = sceneImages[imageKey];

  // Fog + token state for current scene (sceneKey must be declared before use)
  const sceneKey = `${activeCampaign?.id ?? 'local'}:${idx}`;

  // Merged positions: store (remote) positions merged with local overrides
  const remotePositions = sceneTokenPositions[sceneKey] || {};
  const tokenPositions  = { ...remotePositions, ...localPositions };
  const isFogOn  = fogEnabled[sceneKey] ?? false;
  const revealed = fogRevealed[sceneKey] || {};

  // Init fog when scene changes; reveal around default token positions
  useEffect(() => {
    if (!campaign.loaded) return;
    const defaultFog = scene?.fogOfWar === true;
    initFogForScene(sceneKey, defaultFog);

    // If fog is on and no cells revealed yet, reveal starting positions for all tokens
    if (defaultFog && partyMembers.length > 0) {
      const allCells = new Set();
      partyMembers.forEach((member, i) => {
        const memberId = member.id || member.name;
        const pos = tokenPositions[memberId] || getDefaultTokenPos(i, partyMembers.length);
        const cx = Math.floor((pos.x / 100) * FOG_COLS);
        const cy = Math.floor((pos.y / 100) * FOG_ROWS);
        cellsInRadius(cx, cy, FOG_REVEAL_RADIUS).forEach(c => allCells.add(c));
      });
      if (allCells.size > 0) revealFogCells(sceneKey, [...allCells]);
    }
  }, [sceneKey]);

  // Cancel in-flight image fetch and reset state when scene changes
  useEffect(() => {
    imgAbortRef.current?.abort();
    imgAbortRef.current = null;
    setImgReady(false);
    setImgError(false);
    setImgAttempt(0);
  }, [idx, activeCampaign?.id]);

  // Capture outgoing image URL for crossfade when scene changes
  useEffect(() => {
    if (prevSceneKeyRef.current && prevSceneKeyRef.current !== imageKey) {
      const outgoing = sceneImages[prevSceneKeyRef.current];
      if (outgoing) {
        clearTimeout(crossfadeTimer.current);
        setPrevImageUrl(outgoing);
        setCrossfading(false);
      }
    }
    prevSceneKeyRef.current = imageKey;
  }, [imageKey]);

  // Generate NPC portraits when scene loads (lazy, Pollinations free)
  useEffect(() => {
    if (!scene?.npcs?.length || !activeCampaign?.id) return;
    scene.npcs.forEach(npc => {
      const key = `${activeCampaign.id}:${idx}:${npc.name}`;
      if (npcPortraits[key]) return;
      generateNpcPortrait(npc.name, npc.personality).then(url => {
        if (url) setNpcPortrait(key, url);
      });
    });
  }, [imageKey]);

  // Generate scene image
  useEffect(() => {
    if (!campaign.loaded || !scene || imageUrl) return;

    imgAbortRef.current?.abort();
    const abort = new AbortController();
    imgAbortRef.current = abort;

    setImgLoading(true);
    setImgError(false);

    const openAiKey = getOpenAiKey(user?.id);
    const promise = openAiKey
      ? generateSceneImage(scene.title, scene.text, openAiKey)
      : generateSceneImageFree(scene.title, abort.signal);

    promise
      .then(url => {
        if (abort.signal.aborted) return;
        if (url) { setSceneImage(imageKey, url); } else { setImgError(true); }
      })
      .catch(() => { if (!abort.signal.aborted) setImgError(true); })
      .finally(() => { if (!abort.signal.aborted) setImgLoading(false); });

    return () => abort.abort();
  }, [idx, activeCampaign?.id, imgAttempt, campaign.loaded]);

  // ── Token drag handlers ──────────────────────────────────────────────────
  function getDefaultTokenPos(index, total) {
    const spacing = 90 / (total + 1);
    return { x: 5 + spacing * (index + 1), y: 72 };
  }

  function startDrag(e, memberId) {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos  = tokenPositions[memberId] || getDefaultTokenPos(
      partyMembers.findIndex(m => (m.id || m.name) === memberId),
      partyMembers.length
    );
    const tokenPixelX = (pos.x / 100) * rect.width;
    const tokenPixelY = (pos.y / 100) * rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragging({
      memberId,
      offsetX: clientX - rect.left - tokenPixelX,
      offsetY: clientY - rect.top  - tokenPixelY,
    });
    containerRef.current.setPointerCapture?.(e.pointerId);
  }

  function onDrag(e) {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left - dragging.offsetX) / rect.width)  * 100));
    const y = Math.max(2, Math.min(96, ((e.clientY - rect.top  - dragging.offsetY) / rect.height) * 100));
    setLocalPositions(prev => ({ ...prev, [dragging.memberId]: { x, y } }));
  }

  function stopDrag() {
    if (dragging) {
      const memberId = dragging.memberId;
      const pos = localPositions[memberId] || tokenPositions[memberId];
      if (pos) {
        // Persist final position to store + broadcast to other clients
        setSceneTokenPosition(sceneKey, memberId, pos);
        broadcastSceneTokenMove(memberId, pos.x, pos.y, sceneKey);

        // Fog of war reveal
        if (isFogOn) {
          const cx = Math.floor((pos.x / 100) * FOG_COLS);
          const cy = Math.floor((pos.y / 100) * FOG_ROWS);
          const cells = cellsInRadius(cx, cy, FOG_REVEAL_RADIUS);
          revealFogCells(sceneKey, cells);
          broadcastFogReveal(sceneKey, cells);
        }
      }
      setLocalPositions({});
    }
    setDragging(null);
  }

  function handleStartCombat() {
    if (!scene?.enemies?.length) return;
    startEncounter(scene.enemies, partyMembers.length > 0 ? partyMembers : []);
  }

  // ── NPC Proximity interaction zones ─────────────────────────────────────────
  // If scene defines npcs[], use them as named interaction zones.
  // Otherwise fall back to scene.interactionPoints[], or a single generic Explore zone.
  const interactionZones = scene?.npcs?.length > 0
    ? scene.npcs.map(npc => ({
        id: `npc-${npc.name}`,
        x: (npc.x ?? 0.5) * 100,
        y: (npc.y ?? 0.38) * 100,
        label: npc.name,
        prompt: `You approach ${npc.name}. ${npc.personality || ''}`.trim(),
      }))
    : (scene?.interactionPoints || (scene ? [
        { id: 'explore', x: 50, y: 38, label: scene.title },
      ] : []));

  // Find zones a party member is within 20% of
  const nearbyZones = interactionZones.filter(zone =>
    partyMembers.some(member => {
      const memberId = member.id || member.name;
      const pos = tokenPositions[memberId] || getDefaultTokenPos(
        partyMembers.findIndex(m => (m.id || m.name) === memberId),
        partyMembers.length
      );
      const dx = pos.x - zone.x;
      const dy = pos.y - zone.y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    })
  );

  function handleInteract(zone) {
    const speaker = myCharacter?.name || user?.name || 'The party';
    const text = zone.prompt || `${speaker} looks around the area.`;
    setPendingDmTrigger(text);
  }

  if (!campaign.loaded) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📜</div>
        <h2 style={styles.emptyTitle}>No Campaign Loaded</h2>
        <p style={styles.emptyText}>Import a campaign JSON to begin your adventure.</p>
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
      <div
        ref={containerRef}
        style={styles.imageContainer}
        onPointerMove={onDrag}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
      >
        {/* Skeleton while loading */}
        {(imgLoading || (imageUrl && !imgReady && !imgError)) && (
          <div style={styles.imageSkeleton}>
            <div style={styles.skeletonShimmer} />
            <span style={styles.skeletonLabel}>✦ Painting the scene…</span>
            <span style={styles.skeletonHint}>generating scene — up to 30s</span>
          </div>
        )}

        {/* Previous scene image — fades out during crossfade */}
        {prevImageUrl && (
          <img
            src={prevImageUrl}
            alt="previous scene"
            style={{ ...styles.sceneImage, ...styles.sceneImageLayer, zIndex: 1, opacity: crossfading ? 0 : 1 }}
          />
        )}

        {/* Current scene image — fades in when ready */}
        {imageUrl && !imgError && (
          <img
            src={imageUrl}
            alt={scene.title}
            style={{ ...styles.sceneImage, ...styles.sceneImageLayer, zIndex: 2, opacity: imgReady ? 1 : 0 }}
            onLoad={() => {
              setImgReady(true);
              setImgLoading(false);
              setCrossfading(true);
              clearTimeout(crossfadeTimer.current);
              crossfadeTimer.current = setTimeout(() => {
                setPrevImageUrl(null);
                setCrossfading(false);
              }, 900);
            }}
            onError={() => { setImgError(true); setImgLoading(false); }}
          />
        )}

        {((!imageUrl && !imgLoading) || imgError) && (
          <div style={styles.imagePlaceholder}>
            <span style={styles.placeholderGlyph}>⚔</span>
            {imgError && (
              <>
                <span style={styles.imgErrorNote}>Image failed to load</span>
                <button
                  onClick={() => { setImgError(false); setSceneImage(imageKey, null); setImgAttempt(a => a + 1); }}
                  style={styles.retryBtn}
                >
                  ↺ Retry
                </button>
              </>
            )}
          </div>
        )}

        {/* Bottom gradient + scene title */}
        <div style={styles.titleOverlay}>
          <h2 style={styles.sceneTitle}>{scene.title}</h2>
        </div>

        {/* Cinematic title card on scene change */}
        {campaign.loaded && scene && (
          <SceneTitleCard title={scene.title} sceneIndex={idx} />
        )}

        {/* NPC proximity interaction zones — only when image is loaded and not loading */}
        {imgReady && nearbyZones.map(zone => (
          <InteractionZone key={zone.id} zone={zone} onClick={() => handleInteract(zone)} />
        ))}

        {/* Scene badge */}
        <div style={styles.sceneBadge}>
          Scene {idx + 1} / {scenes.length}
        </div>

        {/* DM Navigation overlay — top-left */}
        {isDM && (
          <div style={styles.dmOverlay}>
            <button
              onClick={() => setCurrentScene(Math.max(0, idx - 1))}
              disabled={idx === 0}
              style={styles.navBtn}
            >◀ Prev</button>

            <button
              onClick={() => setCurrentScene(Math.min(scenes.length - 1, idx + 1))}
              disabled={idx >= scenes.length - 1}
              style={styles.navBtn}
            >Next ▶</button>

            {scene.isEncounter && scene.enemies?.length > 0 && (
              <button onClick={handleStartCombat} style={styles.combatBtn}>
                ⚔ Combat
              </button>
            )}

            <button
              onClick={() => {
                toggleFog(sceneKey);
                broadcastFogToggle(sceneKey, !isFogOn);
              }}
              style={{
                ...styles.navBtn,
                background: isFogOn ? 'rgba(20,12,5,0.85)' : 'rgba(60,40,10,0.85)',
                borderColor: isFogOn ? 'rgba(212,175,55,0.6)' : 'rgba(212,175,55,0.2)',
                color: isFogOn ? '#d4af37' : 'rgba(212,175,55,0.4)',
              }}
              title={isFogOn ? 'Fog of War: ON (click to disable)' : 'Fog of War: OFF (click to enable)'}
            >
              {isFogOn ? '🌫 Fog ON' : '☀ Fog OFF'}
            </button>
          </div>
        )}

        {/* Fog of War overlay */}
        {isFogOn && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 5,
            display: 'grid',
            gridTemplateColumns: `repeat(${FOG_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${FOG_ROWS}, 1fr)`,
            pointerEvents: 'none',
          }}>
            {Array.from({ length: FOG_COLS * FOG_ROWS }).map((_, i) => {
              const x = i % FOG_COLS;
              const y = Math.floor(i / FOG_COLS);
              const key = `${x},${y}`;
              const isRevealed = !!revealed[key];
              return (
                <div
                  key={key}
                  style={{
                    background: isRevealed ? 'transparent' : 'rgba(5,3,1,0.88)',
                    transition: 'background 0.6s ease',
                    // Slight blur on the boundary cells for soft fog edge
                    backdropFilter: isRevealed ? 'none' : 'blur(1px)',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* NPC tokens — stationary, defined in scene.npcs[] */}
        {imgReady && scene?.npcs?.map(npc => (
          <NpcToken
            key={npc.name}
            npc={npc}
            portrait={npcPortraits[`${activeCampaign?.id}:${idx}:${npc.name}`]}
          />
        ))}

        {/* Draggable player tokens */}
        {partyMembers.map((member, i) => {
          const memberId = member.id || member.name;
          const pos = tokenPositions[memberId] || getDefaultTokenPos(i, partyMembers.length);
          return (
            <div
              key={memberId}
              style={{
                ...styles.token,
                left: `${pos.x}%`,
                top:  `${pos.y}%`,
                cursor: dragging?.memberId === memberId ? 'grabbing' : 'grab',
                boxShadow: dragging?.memberId === memberId
                  ? '0 0 0 3px #d4af37, 0 4px 16px rgba(0,0,0,0.8)'
                  : '0 2px 8px rgba(0,0,0,0.7)',
              }}
              onPointerDown={e => startDrag(e, memberId)}
              title={member.name}
            >
              <span style={styles.tokenInitials}>
                {(member.name || '?').slice(0, 2).toUpperCase()}
              </span>
              <span style={styles.tokenName}>{member.name?.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0a0705',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: '#0a0705',
    userSelect: 'none',
  },
  sceneImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transition: 'opacity 0.8s ease',
  },
  // Applied on top of sceneImage when two layers are needed for crossfade
  sceneImageLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageSkeleton: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, #1a1008 0%, #0e0b07 50%, #1a1008 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
  skeletonHint: {
    color: 'rgba(212,175,55,0.25)',
    fontSize: '0.65rem',
    fontFamily: 'monospace',
    zIndex: 1,
  },
  imagePlaceholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: 'linear-gradient(160deg, #1a1008, #0e0b07)',
  },
  placeholderGlyph: { fontSize: '3rem', opacity: 0.12 },
  imgErrorNote: {
    color: 'rgba(200,180,140,0.4)',
    fontSize: '0.72rem',
    fontStyle: 'italic',
  },
  retryBtn: {
    background: 'rgba(212,175,55,0.12)',
    border: '1px solid rgba(212,175,55,0.3)',
    color: 'rgba(212,175,55,0.7)',
    borderRadius: 6,
    padding: '5px 14px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.04em',
  },
  // Bottom gradient overlay — title
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '40px 18px 14px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  sceneTitle: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--gold-light, #f0d060)',
    letterSpacing: '0.05em',
    margin: 0,
    textShadow: '0 1px 6px rgba(0,0,0,0.9)',
  },
  dmNotesText: {
    color: 'rgba(240,200,200,0.75)',
    fontSize: '0.78rem',
    lineHeight: 1.5,
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  sceneBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    background: 'rgba(0,0,0,0.65)',
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 4,
    color: 'rgba(212,175,55,0.7)',
    fontSize: '0.68rem',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.06em',
    padding: '3px 9px',
    pointerEvents: 'none',
  },
  // DM controls — top-left overlay
  dmOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    display: 'flex',
    gap: 6,
    zIndex: 10,
  },
  navBtn: {
    background: 'rgba(0,0,0,0.7)',
    border: '1px solid rgba(212,175,55,0.35)',
    color: 'rgba(212,175,55,0.85)',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: '0.75rem',
    fontFamily: "'Cinzel', Georgia, serif",
    cursor: 'pointer',
    minHeight: 32,
    backdropFilter: 'blur(4px)',
  },
  combatBtn: {
    background: 'rgba(139,0,0,0.8)',
    border: '1px solid rgba(200,50,50,0.5)',
    color: '#ffd0cc',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: '0.75rem',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: 32,
    backdropFilter: 'blur(4px)',
  },
  // Player tokens
  token: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2c1a0e, #1a0e05)',
    border: '2px solid #d4af37',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    touchAction: 'none',
    userSelect: 'none',
  },
  tokenInitials: {
    color: '#d4af37',
    fontFamily: "'Cinzel', Georgia, serif",
    fontWeight: 700,
    fontSize: '0.72rem',
    lineHeight: 1,
  },
  tokenName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.5rem',
    lineHeight: 1,
    marginTop: 1,
    maxWidth: 40,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
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
    background: 'var(--bg-primary)',
  },
  emptyIcon: { fontSize: '3rem', opacity: 0.3 },
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
