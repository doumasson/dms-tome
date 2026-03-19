import OrnateFrame from './OrnateFrame'

export default function ZoneLabel({ zone }) {
  if (!zone) return null

  const npcCount = zone.npcs?.length || 0
  const tags = zone.tags || []
  const isSafe = tags.includes('safe')

  return (
    <div className="hud-zone-label" style={{ position: 'relative' }}>
      <OrnateFrame size={18} stroke="#c9a84c" weight={2.5} />
      <div className="hud-zone-name">{zone.name}</div>
      <div className="hud-zone-sub">
        {isSafe ? 'Safe Zone' : 'Danger Zone'} · {npcCount} NPC{npcCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
