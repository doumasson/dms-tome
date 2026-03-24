import { useMemo } from 'react'
import useStore from '../../store/useStore'

/**
 * InteractionPrompt — shows "E — Talk to [NPC]" or "E — Enter [Exit]"
 * when the player is adjacent to an interactable. Positioned at screen center-bottom
 * above the HUD bar. Only shows during exploration (not combat).
 */
export default function InteractionPrompt({ playerPos, zone }) {
  const inCombat = useStore(s => s.encounter?.phase === 'combat')

  const prompt = useMemo(() => {
    if (inCombat || !zone || !playerPos) return null
    const { x, y } = playerPos

    // Check NPCs within 2 tiles
    const npcs = zone.npcs || []
    for (const npc of npcs) {
      const nx = npc.position?.x ?? npc.x
      const ny = npc.position?.y ?? npc.y
      if (nx == null || ny == null) continue
      const dist = Math.abs(x - nx) + Math.abs(y - ny)
      if (dist <= 2) return { type: 'npc', label: npc.name || 'NPC' }
    }

    // Check exits within 2 tiles
    const exits = zone.exits || []
    for (const exit of exits) {
      const ex = exit.x ?? exit.position?.x
      const ey = exit.y ?? exit.position?.y
      if (ex == null || ey == null) continue
      const dist = Math.abs(x - ex) + Math.abs(y - ey)
      if (dist <= 2) return { type: 'exit', label: exit.label || exit.targetName || 'Exit' }
    }

    return null
  }, [playerPos?.x, playerPos?.y, zone, inCombat])

  if (!prompt) return null

  const verb = prompt.type === 'npc' ? 'Talk to' : 'Enter'

  return (
    <div style={{
      position: 'absolute',
      bottom: 232,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 18,
      pointerEvents: 'none',
      animation: 'promptFadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'rgba(10, 8, 6, 0.85)',
        border: '1px solid rgba(201, 168, 76, 0.35)',
        borderRadius: 4,
        padding: '4px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backdropFilter: 'blur(3px)',
      }}>
        <kbd style={{
          display: 'inline-block',
          padding: '2px 6px',
          background: 'rgba(201, 168, 76, 0.15)',
          border: '1px solid rgba(201, 168, 76, 0.35)',
          borderRadius: 3,
          fontFamily: "'Cinzel', serif",
          fontSize: 11,
          fontWeight: 700,
          color: '#d4af37',
          lineHeight: 1,
          minWidth: 18,
          textAlign: 'center',
        }}>
          E
        </kbd>
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 11,
          color: '#a89060',
          letterSpacing: '0.5px',
        }}>
          {verb} <span style={{ color: '#d4af37' }}>{prompt.label}</span>
        </span>
      </div>

      <style>{`
        @keyframes promptFadeIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(4px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
