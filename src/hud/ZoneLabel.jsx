import OrnateFrame from './OrnateFrame'
import useStore from '../store/useStore'
import { getTimeOfDay, formatTime } from '../lib/gameTime'

export default function ZoneLabel({ zone }) {
  const gameTime = useStore(s => s.gameTime)

  if (!zone) return null

  const npcCount = zone.npcs?.length || 0
  const tags = zone.tags || []
  const isSafe = tags.includes('safe')

  const timeOfDay = getTimeOfDay(gameTime?.hour ?? 8)
  const timeIcon = timeOfDay === 'night' ? '🌙' : (timeOfDay === 'dawn' || timeOfDay === 'dusk') ? '🌅' : '☀️'

  return (
    <div className="hud-zone-label stone-panel" style={{ position: 'relative' }}>
      <OrnateFrame size={18} stroke="#c9a84c" weight={2.5} />
      <div className="hud-zone-name">{zone.name}</div>
      <div className="hud-zone-sub">
        {isSafe ? 'Safe Zone' : 'Danger Zone'} · {npcCount} NPC{npcCount !== 1 ? 's' : ''}
      </div>
      <div style={{ color: '#c9a84c', fontSize: 10, opacity: 0.7, marginTop: 2 }}>
        {timeIcon} {formatTime(gameTime || { hour: 8, day: 1 })}
      </div>
    </div>
  )
}
