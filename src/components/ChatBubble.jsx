import { resolveHint } from '../lib/interactionController'
import useStore from '../store/useStore'

export default function ChatBubble({ npc, tileSize, worldTransform }) {
  const storyFlags = useStore(s => s.storyFlags)
  const hint = resolveHint(npc, storyFlags)
  if (!hint || !npc.position || !worldTransform) return null

  const screenX = npc.position.x * tileSize * worldTransform.scale + worldTransform.x + (tileSize * worldTransform.scale) / 2
  const screenY = npc.position.y * tileSize * worldTransform.scale + worldTransform.y - 8

  const displayText = hint.length > 60 ? hint.slice(0, 57) + '...' : hint

  return (
    <div
      className="chat-bubble"
      style={{
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <span className="chat-bubble-text">{displayText}</span>
      <div className="chat-bubble-tail" />
    </div>
  )
}
