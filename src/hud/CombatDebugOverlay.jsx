import { useState } from 'react'
import useStore from '../store/useStore'

/**
 * Combat debug overlay — toggled with ?debug URL param or Ctrl+D.
 * Shows live encounter state, turn tracking, AI execution status.
 * Screenshot this when reporting bugs.
 */
export default function CombatDebugOverlay() {
  const encounter = useStore(s => s.encounter)
  const isDM = useStore(s => s.isDM)
  const activeCampaign = useStore(s => s.activeCampaign)
  const sessionApiKey = useStore(s => s.sessionApiKey)
  const currentAreaId = useStore(s => s.currentAreaId)
  const areas = useStore(s => s.areas)
  const myCharacter = useStore(s => s.myCharacter)

  const [expanded, setExpanded] = useState(true)

  const area = areas?.[currentAreaId]
  const { phase, combatants, currentTurn, round } = encounter
  const active = combatants?.[currentTurn]
  const inCombat = phase === 'combat'
  const shouldRunAI = isDM || !activeCampaign

  const pill = (val, trueColor = '#2ecc71', falseColor = '#cc3333') => (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 10,
      background: val ? trueColor + '33' : falseColor + '33',
      color: val ? trueColor : falseColor,
      border: `1px solid ${val ? trueColor : falseColor}`,
      fontWeight: 700,
    }}>{val ? 'YES' : 'NO'}</span>
  )

  return (
    <div style={{
      position: 'absolute', top: 50, left: 8, zIndex: 999,
      background: 'rgba(0,0,0,0.85)', border: '1px solid #c9a84c',
      borderRadius: 6, padding: expanded ? 10 : 4,
      pointerEvents: 'all', fontFamily: 'monospace', fontSize: 11,
      color: '#e8d5a3', maxWidth: 340, minWidth: expanded ? 280 : 60,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{ color: '#c9a84c', fontWeight: 700, fontSize: 12 }}>
          DEBUG {inCombat ? '⚔ COMBAT' : '🌍 EXPLORE'}
        </span>
        <span style={{ color: '#8a7a52' }}>{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 6 }}>
          {/* Flags */}
          <div style={{ marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span>isDM: {pill(isDM)}</span>
            <span>campaign: {pill(!!activeCampaign)}</span>
            <span>apiKey: {pill(!!sessionApiKey)}</span>
            <span>runAI: {pill(shouldRunAI)}</span>
          </div>

          {/* Area info */}
          <div style={{ color: '#8a7a52', marginBottom: 4 }}>
            area: {currentAreaId || 'none'} ({area?.width}x{area?.height})
            {area?.wallEdges ? ' ✓walls' : ' ✗NO WALLS'}
            {area?.enemies?.length ? ` ${area.enemies.length}e` : ' 0e'}
            {area?.encounterZones?.length ? ` ${area.encounterZones.length}ez` : ' 0ez'}
          </div>

          {/* Character */}
          <div style={{ color: '#8a7a52', marginBottom: 6 }}>
            char: {myCharacter ? `${myCharacter.name} (${myCharacter.class} L${myCharacter.level})` : 'NONE ⚠'}
          </div>

          {/* Encounter state */}
          <div style={{ borderTop: '1px solid #332a1e', paddingTop: 6 }}>
            <div style={{ marginBottom: 4 }}>
              phase: <span style={{ color: inCombat ? '#ff6633' : '#66cc66' }}>{phase}</span>
              {inCombat && <> | R{round} T{currentTurn}/{combatants.length}</>}
            </div>

            {inCombat && active && (
              <div style={{
                background: active.type === 'enemy' ? 'rgba(200,50,50,0.15)' : 'rgba(50,150,200,0.15)',
                border: `1px solid ${active.type === 'enemy' ? '#cc3333' : '#4499dd'}`,
                borderRadius: 4, padding: 6, marginBottom: 6,
              }}>
                <div style={{ fontWeight: 700, color: active.type === 'enemy' ? '#ff6666' : '#66aaff' }}>
                  ► {active.name} ({active.type})
                </div>
                <div>HP: {active.currentHp}/{active.maxHp} | AC: {active.ac} | Spd: {active.speed}</div>
                <div>Pos: ({active.position?.x}, {active.position?.y}) | Move: {active.remainingMove}</div>
                <div>Act: {active.actionsUsed ? '✗' : '✓'} Bonus: {active.bonusActionsUsed ? '✗' : '✓'}</div>
                {active.conditions?.length > 0 && (
                  <div style={{ color: '#cc6633' }}>Conditions: {active.conditions.join(', ')}</div>
                )}
                {active.attacks?.length > 0 && (
                  <div style={{ color: '#8a7a52' }}>
                    Atk: {active.attacks.map(a => `${a.name} ${a.bonus} ${a.damage}`).join('; ')}
                  </div>
                )}
              </div>
            )}

            {/* All combatants summary */}
            {inCombat && combatants.length > 0 && (
              <div style={{ fontSize: 10, color: '#8a7a52' }}>
                {combatants.map((c, i) => (
                  <div key={c.id || i} style={{
                    opacity: (c.currentHp ?? 0) <= 0 ? 0.4 : 1,
                    fontWeight: i === currentTurn ? 700 : 400,
                    color: i === currentTurn ? '#e8d5a3' : '#8a7a52',
                  }}>
                    {i === currentTurn ? '►' : ' '} [{i}] {c.name} ({c.type})
                    HP:{c.currentHp}/{c.maxHp} AC:{c.ac}
                    @({c.position?.x},{c.position?.y})
                    init:{c.initiative || '?'}
                  </div>
                ))}
              </div>
            )}

            {/* Last 5 combat log entries */}
            {encounter.log?.length > 0 && (
              <div style={{ borderTop: '1px solid #332a1e', paddingTop: 4, marginTop: 4, fontSize: 10, color: '#8a7a52' }}>
                {encounter.log.slice(0, 5).map((entry, i) => (
                  <div key={i} style={{ opacity: 1 - i * 0.15 }}>{entry}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
