import { useState, useEffect, useRef } from 'react'
import useStore from '../../store/useStore'
import { broadcastSpeakerVoteCast, broadcastSpeakerDecided } from '../../lib/liveChannel'

const VOTE_TIMEOUT = 15000 // 15 seconds

/**
 * Inline vote panel — appears in the chat area when the DM narrator
 * addresses the party. Players vote on who speaks for the group.
 * Majority wins. If tie or timeout, first voter wins.
 */
export default function SpeakerVote() {
  const user = useStore(s => s.user)
  const myCharacter = useStore(s => s.myCharacter)
  const partyMembers = useStore(s => s.partyMembers)
  const partySpeaker = useStore(s => s.partySpeaker)
  const decideSpeaker = useStore(s => s.decideSpeaker)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef()
  const decidedRef = useRef(false)

  // Build candidate list
  const candidates = []
  if (myCharacter) candidates.push({ id: user?.id, name: myCharacter.name, isMe: true })
  if (partyMembers?.length) {
    partyMembers.forEach(m => {
      if (m.name !== myCharacter?.name && m.id !== myCharacter?.id) {
        candidates.push({ id: m.userId || m.id, name: m.name, isMe: false })
      }
    })
  }

  if (!partySpeaker || partySpeaker.phase !== 'voting') return null

  const votes = partySpeaker.votes || {}
  const myVote = user ? votes[user.id] : null
  const totalPlayers = candidates.length
  const majority = Math.floor(totalPlayers / 2) + 1

  // Count votes per nominee
  const tallies = {}
  Object.values(votes).forEach(nomineeId => {
    tallies[nomineeId] = (tallies[nomineeId] || 0) + 1
  })

  // Check for winner
  useEffect(() => {
    if (decidedRef.current) return
    for (const [nomineeId, count] of Object.entries(tallies)) {
      if (count >= majority) {
        decidedRef.current = true
        const winner = candidates.find(c => c.id === nomineeId)
        decideSpeaker(nomineeId, winner?.name || 'Unknown')
        broadcastSpeakerDecided(nomineeId, winner?.name || 'Unknown')
        return
      }
    }
  }, [votes])

  // Timeout — first voter wins
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 1000
        if (next >= VOTE_TIMEOUT && !decidedRef.current) {
          decidedRef.current = true
          // First vote cast wins on timeout
          const firstVoterId = Object.keys(votes)[0]
          const firstNomineeId = firstVoterId ? votes[firstVoterId] : user?.id
          const winner = candidates.find(c => c.id === firstNomineeId) || candidates[0]
          if (winner) {
            decideSpeaker(winner.id, winner.name)
            broadcastSpeakerDecided(winner.id, winner.name)
          }
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  function handleVote(nomineeId) {
    if (!user?.id || myVote) return
    useStore.getState().castSpeakerVote(user.id, nomineeId)
    broadcastSpeakerVoteCast(user.id, myCharacter?.name, nomineeId, candidates.find(c => c.id === nomineeId)?.name)
  }

  const timeLeft = Math.max(0, Math.ceil((VOTE_TIMEOUT - elapsed) / 1000))

  return (
    <div style={{
      padding: '8px 10px',
      background: 'rgba(20,16,12,0.95)',
      borderTop: '2px solid rgba(212,175,55,0.4)',
      fontFamily: "'Cinzel', serif",
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 11, color: '#d4af37', fontWeight: 700, letterSpacing: '0.05em' }}>
          WHO SPEAKS?
        </span>
        <span style={{ fontSize: 9, color: timeLeft <= 5 ? '#e74c3c' : '#8a7a5a' }}>
          {timeLeft}s
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {candidates.map(c => {
          const voteCount = tallies[c.id] || 0
          const isVoted = myVote === c.id
          return (
            <button
              key={c.id}
              onClick={() => handleVote(c.id)}
              disabled={!!myVote}
              style={{
                flex: '1 1 auto',
                padding: '6px 10px',
                background: isVoted ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.08)',
                border: `1px solid ${isVoted ? 'rgba(212,175,55,0.6)' : 'rgba(212,175,55,0.2)'}`,
                borderRadius: 4,
                color: isVoted ? '#d4af37' : '#c8b890',
                cursor: myVote ? 'default' : 'pointer',
                fontFamily: "'Cinzel', serif",
                fontSize: 11,
                fontWeight: isVoted ? 700 : 400,
                transition: 'all 0.15s',
                opacity: myVote && !isVoted ? 0.5 : 1,
              }}
            >
              {c.isMe ? 'I speak' : c.name}
              {voteCount > 0 && <span style={{ marginLeft: 4, color: '#d4af37', fontWeight: 700 }}>({voteCount})</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
