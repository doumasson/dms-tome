import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { CLASSES } from '../data/classes';
import { broadcastEncounterAction } from '../lib/liveChannel';

const VOTE_TIMEOUT_MS = 60000; // 60 seconds

/**
 * RestModal — Majority-vote rest system.
 *
 * Props:
 *   type: 'short' | 'long'
 *   proposedBy: player name string
 *   partyMembers: array of { id, name }  — all connected players
 *   onResolve(type): called when rest is approved and executed
 *   onCancel(): called if rest is rejected or cancelled
 *   isHost: boolean — host can force the rest
 */
export default function RestModal({ type, proposedBy, partyMembers, onResolve, onCancel, isHost }) {
  const { shortRest, longRest, spendHitDie, myCharacter, user } = useStore();
  const [votes, setVotes] = useState({}); // { playerId: true | false }
  const [elapsed, setElapsed] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [hitDicePhase, setHitDicePhase] = useState(false); // short rest: spend hit dice after vote
  const [hitDiceLog, setHitDiceLog] = useState([]); // { roll, healed, remaining }
  const timerRef = useRef();
  const totalPlayers = partyMembers?.length || 1;

  // Listen for remote votes from other players
  useEffect(() => {
    const handler = (e) => {
      const { playerId, vote } = e.detail || {}
      if (playerId && playerId !== user?.id) {
        setVotes(v => ({ ...v, [playerId]: vote }))
      }
    }
    window.addEventListener('rest-vote-received', handler)
    return () => window.removeEventListener('rest-vote-received', handler)
  }, [user?.id])

  // Tick the timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        if (next >= VOTE_TIMEOUT_MS / 1000 && !resolved) {
          // AFK players auto-vote yes — just resolve
          handleForce();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Count votes
  const yesVotes = Object.values(votes).filter(v => v === true).length;
  const noVotes = Object.values(votes).filter(v => v === false).length;
  const majority = Math.floor(totalPlayers / 2) + 1;
  const approved = yesVotes >= majority;
  const rejected = noVotes >= majority;

  // Auto-resolve when majority reached
  useEffect(() => {
    if (resolved) return;
    if (approved) { executeRest(); }
    else if (rejected) { setResolved(true); setTimeout(onCancel, 1500); }
  }, [votes]);

  function castVote(yes) {
    if (!user) return;
    setVotes(v => ({ ...v, [user.id]: yes }));
    broadcastEncounterAction({ type: 'rest-vote', playerId: user.id, vote: yes });
  }

  function handleForce() {
    if (resolved) return;
    executeRest();
  }

  function executeRest() {
    if (resolved) return;
    setResolved(true);
    clearInterval(timerRef.current);
    if (type === 'long') {
      longRest();
      onResolve(type);
    } else {
      // Short rest: show hit dice spending before finalizing
      shortRest(); // restores class resources
      setHitDicePhase(true);
    }
  }

  function finishShortRest() {
    setHitDicePhase(false);
    onResolve(type);
  }

  function handleSpendHitDie() {
    if (!myCharacter) return;
    const result = spendHitDie(myCharacter.id || myCharacter.name);
    if (result) setHitDiceLog(prev => [...prev, result]);
  }

  const myVote = user ? votes[user.id] : null;
  const timeLeft = Math.max(0, Math.floor(VOTE_TIMEOUT_MS / 1000) - elapsed);
  const pct = (elapsed / (VOTE_TIMEOUT_MS / 1000)) * 100;

  const restLabel = type === 'long' ? 'Long Rest' : 'Short Rest';
  const restDesc = type === 'long'
    ? 'Full HP • All spell slots • All class resources — requires 8 hours'
    : 'Spend hit dice to recover HP • Short-rest resources recharge — requires 1 hour';

  const restIcon = type === 'long' ? '☀️' : '🌙';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#1c1208', border: '2px solid rgba(212,175,55,0.5)',
        borderRadius: 12, padding: 24, maxWidth: 420, width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>{restIcon}</div>
          <div style={{ fontSize: '1.2rem', fontFamily: "'Cinzel', Georgia, serif", color: '#d4af37', fontWeight: 700, marginBottom: 6 }}>
            {restLabel} Proposed
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>{proposedBy}</strong> wants to take a {restLabel.toLowerCase()}.
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9a8060', marginTop: 4 }}>{restDesc}</div>
        </div>

        {/* Timer bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Vote closes in</span>
            <span style={{ color: timeLeft < 15 ? '#e74c3c' : 'var(--text-secondary)', fontWeight: 700 }}>{timeLeft}s</span>
          </div>
          <div style={{ height: 4, background: '#2a1a0a', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${100 - pct}%`, background: timeLeft < 15 ? '#e74c3c' : '#d4af37', borderRadius: 2, transition: 'width 1s linear' }} />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3 }}>
            AFK players auto-vote Yes when timer ends.
          </div>
        </div>

        {/* Vote tallies */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: 'rgba(39,174,96,0.1)', border: `1px solid ${approved ? '#27ae60' : 'rgba(39,174,96,0.3)'}`, borderRadius: 6 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#2ecc71' }}>{yesVotes}</div>
            <div style={{ fontSize: '0.7rem', color: '#2ecc71' }}>Yes</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: 'rgba(231,76,60,0.08)', border: `1px solid ${rejected ? '#e74c3c' : 'rgba(231,76,60,0.25)'}`, borderRadius: 6 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e74c3c' }}>{noVotes}</div>
            <div style={{ fontSize: '0.7rem', color: '#e74c3c' }}>No</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-muted)' }}>{totalPlayers - yesVotes - noVotes}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pending</div>
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>
          Need <strong style={{ color: 'var(--text-secondary)' }}>{majority}</strong> of {totalPlayers} votes to pass
        </div>

        {/* Player vote list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
          {partyMembers?.map(p => {
            const vote = votes[p.id];
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.name}</span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: vote === true ? 'rgba(39,174,96,0.2)' : vote === false ? 'rgba(231,76,60,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${vote === true ? '#27ae60' : vote === false ? '#e74c3c' : 'rgba(255,255,255,0.1)'}`,
                  color: vote === true ? '#2ecc71' : vote === false ? '#e74c3c' : 'var(--text-muted)',
                }}>
                  {vote === true ? '✓ Yes' : vote === false ? '✗ No' : '…'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Vote buttons for current player */}
        {!resolved && (
          <div style={{ display: 'flex', gap: 8, marginBottom: isHost ? 8 : 0 }}>
            <button
              onClick={() => castVote(true)}
              disabled={myVote === true}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                background: myVote === true ? 'rgba(39,174,96,0.3)' : 'rgba(39,174,96,0.15)',
                border: `1px solid ${myVote === true ? '#27ae60' : 'rgba(39,174,96,0.4)'}`,
                color: '#2ecc71',
              }}
            >
              ✓ Yes, rest
            </button>
            <button
              onClick={() => castVote(false)}
              disabled={myVote === false}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                background: myVote === false ? 'rgba(231,76,60,0.3)' : 'rgba(231,76,60,0.08)',
                border: `1px solid ${myVote === false ? '#e74c3c' : 'rgba(231,76,60,0.25)'}`,
                color: '#e74c3c',
              }}
            >
              ✗ Keep going
            </button>
          </div>
        )}

        {/* Host force button */}
        {isHost && !resolved && (
          <button
            onClick={handleForce}
            style={{ width: '100%', marginTop: 8, padding: '6px 0', borderRadius: 5, cursor: 'pointer', fontSize: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
          >
            ⚡ Force rest (Host)
          </button>
        )}

        {/* Result message (long rest or rejection) */}
        {resolved && !hitDicePhase && (
          <div style={{ textAlign: 'center', fontSize: '0.88rem', fontWeight: 700, color: approved ? '#2ecc71' : '#e74c3c', marginTop: 8 }}>
            {approved ? `${restIcon} Rest approved! Resources restored.` : '✗ Rest rejected — adventure continues!'}
          </div>
        )}

        {/* Short rest hit dice spending */}
        {hitDicePhase && myCharacter && (() => {
          const hitDie = CLASSES[myCharacter.class]?.hitDie || 8;
          const conMod = Math.floor(((myCharacter.stats?.con || 10) - 10) / 2);
          const remaining = myCharacter.hitDiceRemaining ?? myCharacter.level ?? 1;
          const totalHpGained = hitDiceLog.reduce((s, r) => s + r.healed, 0);
          const canFinish = hitDiceLog.length > 0 || remaining <= 0;
          return (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: 14 }}>
              <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.78rem', color: '#d4af37', fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>
                🌙 Spend Hit Dice
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                <span>{myCharacter.name} — d{hitDie}{conMod >= 0 ? `+${conMod}` : conMod} CON</span>
                <span style={{ color: remaining > 0 ? 'var(--text-secondary)' : '#e74c3c' }}>
                  {remaining} dice left
                </span>
              </div>

              {/* Roll log */}
              {hitDiceLog.length > 0 && (
                <div style={{ maxHeight: 80, overflowY: 'auto', marginBottom: 8 }}>
                  {hitDiceLog.map((r, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: '#2ecc71', padding: '1px 0' }}>
                      d{hitDie}({r.roll}){conMod >= 0 ? `+${conMod}` : conMod} = +{r.healed} HP
                    </div>
                  ))}
                </div>
              )}

              {totalHpGained > 0 && (
                <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#2ecc71', fontWeight: 700, marginBottom: 10 }}>
                  Total recovered: +{totalHpGained} HP
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSpendHitDie}
                  disabled={remaining <= 0}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 6, cursor: remaining > 0 ? 'pointer' : 'not-allowed',
                    fontWeight: 700, fontSize: '0.85rem',
                    background: remaining > 0 ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${remaining > 0 ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: remaining > 0 ? '#d4af37' : 'var(--text-muted)',
                  }}
                >
                  🎲 Roll d{hitDie}
                </button>
                <button
                  onClick={finishShortRest}
                  disabled={!canFinish}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 6,
                    cursor: canFinish ? 'pointer' : 'not-allowed',
                    fontWeight: 700, fontSize: '0.85rem',
                    background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.4)',
                    color: '#2ecc71', opacity: canFinish ? 1 : 0.4,
                  }}
                >
                  {remaining <= 0 ? '✓ No Dice Remaining' : '✓ Done Resting'}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
