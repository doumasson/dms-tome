import useStore from '../../store/useStore'

/**
 * LowHpOverlay — red vignette pulse when player HP is below 25%.
 * Creates urgency during combat without blocking gameplay.
 */
export default function LowHpOverlay() {
  const myCharacter = useStore(s => s.myCharacter)
  const encounter = useStore(s => s.encounter)
  const inCombat = encounter?.phase === 'combat'

  if (!myCharacter) return null

  // Get live HP from combat or character
  const combatant = inCombat
    ? encounter.combatants?.find(c => c.id === myCharacter.id || c.name === myCharacter.name)
    : null
  const hp = combatant?.currentHp ?? myCharacter.currentHp ?? myCharacter.hp ?? 10
  const maxHp = combatant?.maxHp ?? myCharacter.maxHp ?? 10
  const hpPct = maxHp > 0 ? hp / maxHp : 1

  if (hpPct > 0.25 || hp <= 0) return null

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 12,
      pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 50%, rgba(180,30,30,0.15) 100%)',
      animation: 'lowHpPulse 2s ease-in-out infinite',
    }}>
      <style>{`
        @keyframes lowHpPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
