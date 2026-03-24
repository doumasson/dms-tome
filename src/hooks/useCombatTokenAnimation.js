/**
 * Hook for smooth combat token movement animation.
 * Animates tokens to target positions using the tween engine.
 */

import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

export function useCombatTokenAnimation(pixiAppRef) {
  const encounter = useStore(s => s.encounter);
  const sceneTokenPositions = useStore(s => s.sceneTokenPositions);
  const activeCampaign = useStore(s => s.activeCampaign);
  const campaign = useStore(s => s.campaign);
  const setSceneTokenPosition = useStore(s => s.setSceneTokenPosition);

  const tokenPositionsRef = useRef({});
  const sceneKeyRef = useRef(null);

  // Update scene key when campaign/scene changes
  useEffect(() => {
    const idx = campaign?.currentSceneIndex || 0;
    sceneKeyRef.current = `${activeCampaign?.id ?? 'local'}:${idx}`;
  }, [activeCampaign?.id, campaign?.currentSceneIndex]);

  // Track combat token positions and animate them
  useEffect(() => {
    if (!encounter || !encounter.combatants || !pixiAppRef?.current) return;

    const tweenEngine = pixiAppRef.current.getTweenEngine?.();
    if (!tweenEngine) return;

    const sceneKey = sceneKeyRef.current;
    if (!sceneKey) return;

    // Build target positions map from combat state
    const targetPositions = {};
    encounter.combatants.forEach(combatant => {
      if (combatant.position) {
        targetPositions[combatant.id] = combatant.position;
      }
    });

    // Check which tokens need animation
    for (const [tokenId, targetPos] of Object.entries(targetPositions)) {
      const currentPos = tokenPositionsRef.current[tokenId] || sceneTokenPositions[sceneKey]?.[tokenId] || { x: 0, y: 0 };

      // If position hasn't changed, skip animation
      if (currentPos.x === targetPos.x && currentPos.y === targetPos.y) {
        continue;
      }

      // Calculate distance and duration (faster for shorter distances)
      const dist = Math.sqrt((targetPos.x - currentPos.x) ** 2 + (targetPos.y - currentPos.y) ** 2);
      const duration = Math.max(150, Math.min(400, dist * 50)); // 150-400ms based on distance

      // Start animation
      tweenEngine.to(
        `combat-token-${tokenId}`,
        { x: currentPos.x, y: currentPos.y },
        { x: targetPos.x, y: targetPos.y },
        duration,
        'easeInOutQuad',
        (pos) => {
          // Update position in store during animation
          tokenPositionsRef.current[tokenId] = pos;
          setSceneTokenPosition(sceneKey, tokenId, { x: Math.round(pos.x), y: Math.round(pos.y) });
        },
        () => {
          // Ensure final position is exact
          tokenPositionsRef.current[tokenId] = targetPos;
          setSceneTokenPosition(sceneKey, tokenId, targetPos);
        }
      );
    }
  }, [encounter?.combatants, pixiAppRef, sceneTokenPositions, setSceneTokenPosition]);

  return {
    isAnimating: useCallback((tokenId) => {
      const tweenEngine = pixiAppRef?.current?.getTweenEngine?.();
      return tweenEngine?.isAnimating(`combat-token-${tokenId}`) || false;
    }, [pixiAppRef]),
  };
}
