'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '@/components/Card'
import WaitingRoom from '@/components/WaitingRoom'
import TrumpSelector from '@/components/TrumpSelector'
import Chat from '@/components/Chat'

const SUIT_SYMBOL = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const SUIT_COLOR  = { spades: '#e2e8f0', hearts: '#fc8181', diamonds: '#fc8181', clubs: '#e2e8f0' }
const TEAM_COLOR  = ['#60a5fa', '#f87171']

export default function RoomPage() {
  const { code } = useParams()
  const router   = useRouter()

  const [myId, setMyId]             = useState(null)
  const [myPosition, setMyPosition] = useState(null)
  const [myTeam, setMyTeam]         = useState(null)
  const [myHand, setMyHand]         = useState([])
  const [room, setRoom]             = useState(null)
  const [phase, setPhase]           = useState('connecting')
  const [messages, setMessages]     = useState([])
  const [nameInput, setNameInput]   = useState('')
  const [hasJoined, setHasJoined]   = useState(false)
  const [error, setError]           = useState('')
  const [showChat, setShowChat]     = useState(false)
  const [trickBanner, setTrickBanner] = useState(null) // { name, team, isKot }
  const socketRef    = useRef(null)
  const bannerTimer  = useRef(null)
  const prevTrickRef = useRef(null) // keep last trick cards visible

  function showTrickWinner(lastResult, players) {
    if (!lastResult) return
    const winner = players.find(p => p.id === lastResult.winnerId)
    if (!winner) return
    setTrickBanner({ name: winner.name, team: winner.team, isKot: lastResult.isKot })
    clearTimeout(bannerTimer.current)
    bannerTimer.current = setTimeout(() => setTrickBanner(null), 2000)
  }

  useEffect(() => {
    const storedName = sessionStorage.getItem('chakdi_name') || ''
    setNameInput(storedName)
    let socket
    import('socket.io-client').then(({ io }) => {
      socket = io(window.location.origin, { transports: ['websocket', 'polling'] })
      socketRef.current = socket

      socket.on('connect', () => {
        setMyId(socket.id)
        if (storedName) autoJoin(socket, storedName)
      })
      socket.on('room-created', ({ code: newCode, player }) => {
        window.history.replaceState(null, '', '/room/' + newCode)
        setMyPosition(player.position)
        setMyTeam(player.team)
        setHasJoined(true)
        setError('')
      })
      socket.on('room-joined', ({ player }) => {
        setMyPosition(player.position)
        setMyTeam(player.team)
        setHasJoined(true)
        setError('')
      })
      socket.on('game-state', ({ room: r, myHand: h }) => {
        // When a trick just completed, keep last trick cards visible for a moment
        if (r.lastTrickResult && r.currentTrick.length === 0) {
          prevTrickRef.current = r.lastTrickResult.trick
          showTrickWinner(r.lastTrickResult, r.players)
        }
        // New trick started — clear the stale cards
        if (r.currentTrick.length > 0) {
          prevTrickRef.current = null
        }
        // New hand started — reset
        if (r.phase === 'trump-selection') {
          prevTrickRef.current = null
          setTrickBanner(null)
        }
        setRoom(r)
        setPhase(r.phase)
        setMyHand(h || [])
      })
      socket.on('room-error', (msg) => setError(msg))
      socket.on('chat-msg', (msg) => setMessages(prev => [...prev.slice(-49), msg]))
    })
    return () => { socket?.disconnect(); clearTimeout(bannerTimer.current) }
  }, []) // eslint-disable-line

  function autoJoin(socket, name) {
    const upper = code.toUpperCase()
    if (upper === 'NEW') {
      socket.emit('create-room', { name, mode: sessionStorage.getItem('chakdi_mode') || 'chakdi' })
    } else {
      socket.emit('join-room', { name, code: upper })
    }
  }

  function handleManualJoin(e) {
    e.preventDefault()
    if (!nameInput.trim()) return setError('Enter your name')
    sessionStorage.setItem('chakdi_name', nameInput.trim())
    autoJoin(socketRef.current, nameInput.trim())
  }

  const emit = (ev, data) => socketRef.current?.emit(ev, data)

  // ── Derived ──
  const players  = room?.players || []
  const me       = players.find(p => p.position === myPosition)
  const partner  = players.find(p => p.position === ((myPosition + 2) % 4))
  const leftOpp  = players.find(p => p.position === ((myPosition + 3) % 4))
  const rightOpp = players.find(p => p.position === ((myPosition + 1) % 4))
  const isMyTurn = room?.currentTurn === myId && phase === 'playing'

  // Show current trick OR last trick cards (keeps 4 cards visible after trick ends)
  function trickCard(pid) {
    const live = room?.currentTrick || []
    if (live.length > 0) return live.find(t => t.playerId === pid)?.card || null
    // Fallback: show last completed trick until next card played
    const last = prevTrickRef.current || []
    return last.find(t => t.playerId === pid)?.card || null
  }

  function canPlay(card) {
    if (!isMyTurn) return false
    const trick = room?.currentTrick || []
    if (trick.length === 0) return true
    const ledSuit = trick[0].card.suit
    const hasSuit = myHand.some(c => c.suit === ledSuit)
    return !(hasSuit && card.suit !== ledSuit)
  }

  const roomCode = room?.code || (code !== 'new' ? code.toUpperCase() : '…')
  const isBot    = pid => typeof pid === 'string' && pid.startsWith('__bot__')
  const target   = room?.mode === 'chakdi' ? 5 : 7

  // ── Sub-components ──
  function PlayerTag({ player, isMine }) {
    if (!player) return <div className="h-7" />
    const isTurn = room?.currentTurn === player.id
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
        style={{
          background: isMine ? 'rgba(212,175,55,0.12)' : 'rgba(0,0,0,0.35)',
          border: `1px solid ${isMine ? 'rgba(212,175,55,0.4)' : isTurn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
        }}>
        {isTurn && <span className="w-2 h-2 rounded-full flex-shrink-0 glow-gold" style={{ background: '#d4af37' }} />}
        <span className="font-cinzel font-bold truncate max-w-[100px]"
          style={{ color: isMine ? '#f0d060' : TEAM_COLOR[player.team] }}>
          {player.name}
        </span>
        {player.position === room?.dealerIndex && (
          <span className="text-[10px] px-1 rounded flex-shrink-0" style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37' }}>D</span>
        )}
        {isBot(player.id) && <span className="text-[10px] flex-shrink-0">🤖</span>}
        <span className="text-gray-500 flex-shrink-0 ml-0.5">{player.cardCount}c</span>
      </div>
    )
  }

  function FaceDownFan({ count = 0, horizontal }) {
    const show = Math.min(count, 6)
    if (show === 0) return null
    return (
      <div className={`flex ${horizontal ? 'flex-row' : 'flex-col'}`}>
        {Array.from({ length: show }).map((_, i) => (
          <div key={i} className="card card-back flex-shrink-0"
            style={{
              width: 42, height: 60, borderRadius: 6,
              marginLeft: horizontal && i > 0 ? -18 : 0,
              marginTop: !horizontal && i > 0 ? -38 : 0,
              zIndex: i,
            }} />
        ))}
      </div>
    )
  }

  // Trick slot — shows card if played, dashed placeholder if in-progress, nothing otherwise
  function TrickSlot({ player }) {
    if (!player) return <div style={{ width: 68, height: 100 }} />
    const card    = trickCard(player.id)
    const inTrick = (room?.currentTrick?.length || 0) > 0 || (prevTrickRef.current?.length || 0) > 0
    if (card) {
      return (
        <div className="fade-up">
          <Card suit={card.suit} rank={card.rank} />
        </div>
      )
    }
    if (inTrick) {
      return (
        <div style={{ width: 68, height: 100, borderRadius: 8, border: '2px dashed rgba(255,255,255,0.12)' }} />
      )
    }
    return <div style={{ width: 68, height: 100 }} />
  }

  // ── Name prompt ──
  if (!hasJoined) {
    return (
      <div className="min-h-screen felt flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
          style={{ background: 'rgba(10,14,26,0.96)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <h2 className="font-cinzel font-bold text-2xl text-center mb-6" style={{ color: '#f0d060' }}>Join Room</h2>
          <form onSubmit={handleManualJoin} className="space-y-4">
            <input autoFocus
              className="w-full rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-yellow-500"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}
              placeholder="Your name…" value={nameInput}
              onChange={e => { setNameInput(e.target.value); setError('') }} maxLength={20} />
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button type="submit" className="w-full py-3 rounded-xl font-cinzel font-bold text-sm tracking-widest"
              style={{ background: 'linear-gradient(135deg, #d4af37, #a0852a)', color: '#0a0e1a' }}>
              JOIN GAME
            </button>
          </form>
          <button onClick={() => router.push('/')} className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300">← Back</button>
        </div>
      </div>
    )
  }

  if (phase === 'connecting' || phase === 'waiting') {
    return (
      <WaitingRoom room={room} myId={myId} roomCode={roomCode}
        onBack={() => router.push('/')}
        onAddBots={() => emit('add-bots')} />
    )
  }

  if (phase === 'trump-selection') {
    const callerName = players.find(p => p.id === room?.trumpCaller)?.name || '…'
    const iAmCaller  = myId === room?.trumpCaller
    return (
      <div className="min-h-screen felt flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center">
          <h2 className="font-cinzel font-black text-3xl mb-1" style={{ color: '#f0d060' }}>Call Trump (Rang)</h2>
          {iAmCaller
            ? <p className="text-gray-300 text-sm mt-1">Look at your 5 cards and choose the trump suit</p>
            : <p className="text-gray-400 text-sm mt-1">
                Waiting for <span className="font-bold text-white">{callerName}</span> to call trump…
              </p>
          }
        </div>
        {iAmCaller && <TrumpSelector onSelect={suit => emit('select-trump', { suit })} />}
        <div className="text-center">
          <p className="text-xs text-gray-500 font-cinzel tracking-wider mb-3 uppercase">Your 5 Cards</p>
          <div className="hand-fan justify-center">
            {myHand.map((c, i) => (
              <div key={c.suit + c.rank} className="card-deal" style={{ animationDelay: `${i * 0.07}s` }}>
                <Card suit={c.suit} rank={c.rank} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Playing view ──
  return (
    <div className="h-screen flex flex-col overflow-hidden felt select-none">

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-3 py-2 gap-2 flex-wrap flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.45)', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <div className="flex items-center gap-2">
          <span className="font-cinzel font-black text-base" style={{ color: '#d4af37' }}>
            {room?.mode === 'chakdi' ? 'Chakdi' : 'Court Piece'}
          </span>
          <span className="text-xs text-gray-600 font-cinzel tracking-widest">{roomCode}</span>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href) }}
            className="text-[11px] px-1.5 py-0.5 rounded text-gray-500 hover:text-gold"
            style={{ border: '1px solid rgba(212,175,55,0.2)' }}>⎘</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {room?.trump && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-cinzel"
              style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <span className="text-gold">Trump</span>
              <span style={{ color: SUIT_COLOR[room.trump], fontSize: 16 }}>{SUIT_SYMBOL[room.trump]}</span>
              <span className="capitalize text-gray-300">{room.trump}</span>
            </div>
          )}
          <div className="flex gap-1 text-xs">
            <span className="px-2 py-1 rounded font-cinzel"
              style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
              You {room?.trickCounts?.[myTeam ?? 0] ?? 0}
            </span>
            <span className="px-2 py-1 rounded font-cinzel"
              style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
              Opp {room?.trickCounts?.[myTeam === 0 ? 1 : 0] ?? 0}
            </span>
          </div>
          <div className="flex gap-1 text-xs">
            {[0, 1].map(t => (
              <div key={t} className="flex items-center gap-1 px-2 py-1 rounded font-cinzel"
                style={{ background: myTeam === t ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${myTeam === t ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
                <span style={{ color: TEAM_COLOR[t] }}>●</span>
                <span className="font-bold text-white">{room?.scores?.[t] ?? 0}</span>
                <span className="text-gray-600">/{target}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowChat(v => !v)}
            className="text-xs px-2 py-1 rounded"
            style={{ background: showChat ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.07)', color: showChat ? '#f0d060' : '#555', border: '1px solid rgba(255,255,255,0.1)' }}>
            💬
          </button>
        </div>
      </div>

      {/* ── TRICK WINNER BANNER ── big bold centered ── */}
      {trickBanner && (
        <div className="absolute left-1/2 -translate-x-1/2 z-50 fade-up pointer-events-none"
          style={{ top: '56px' }}>
          <div className="px-8 py-3 rounded-2xl shadow-2xl text-center"
            style={{
              background: trickBanner.isKot
                ? 'linear-gradient(135deg, #92400e, #d97706)'
                : `linear-gradient(135deg, ${TEAM_COLOR[trickBanner.team]}33, ${TEAM_COLOR[trickBanner.team]}88)`,
              border: `2px solid ${trickBanner.isKot ? '#f59e0b' : TEAM_COLOR[trickBanner.team]}`,
              backdropFilter: 'blur(8px)',
            }}>
            {trickBanner.isKot && (
              <div className="font-cinzel font-black text-yellow-300 text-sm mb-0.5">🔥 KOT!</div>
            )}
            <div className="font-cinzel font-black text-xl tracking-wide"
              style={{ color: trickBanner.isKot ? '#fef3c7' : '#fff' }}>
              {trickBanner.name} won the trick!
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN TABLE + CHAT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── TABLE ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden py-3 px-4 gap-2">

          {/* ── ROW 1: Partner ── */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <PlayerTag player={partner} />
            <FaceDownFan count={partner?.cardCount} horizontal />
            {/* Partner's trick card */}
            <div className="mt-1">
              <TrickSlot player={partner} />
            </div>
          </div>

          {/* ── ROW 2: Left | Center | Right ── */}
          <div className="flex flex-1 items-center gap-3 min-h-0">

            {/* Left opponent */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <PlayerTag player={leftOpp} />
              <FaceDownFan count={leftOpp?.cardCount} horizontal={false} />
              <TrickSlot player={leftOpp} />
            </div>

            {/* ── CENTER ── */}
            <div className="flex-1 flex items-center justify-center">
              {/* Turn indicator — only when no banner showing */}
              {!trickBanner && (
                <div className="rounded-xl px-4 py-2 text-center"
                  style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {isMyTurn ? (
                    <span className="font-cinzel font-bold text-sm text-yellow-300 animate-pulse">Your turn!</span>
                  ) : (
                    <span className="text-xs text-gray-500 font-cinzel">
                      {players.find(p => p.id === room?.currentTurn)?.name || '…'}'s turn
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right opponent */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <PlayerTag player={rightOpp} />
              <FaceDownFan count={rightOpp?.cardCount} horizontal={false} />
              <TrickSlot player={rightOpp} />
            </div>
          </div>

          {/* ── ROW 3: My trick card + hand ── */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            {/* My played card in trick */}
            <TrickSlot player={me} />
            <PlayerTag player={me} isMine />
            {isMyTurn && (
              <div className="text-xs font-cinzel text-yellow-400 animate-pulse">
                Play a card ↓
              </div>
            )}
            {/* Hand with deal animation */}
            <div className="w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              <div className="hand-fan px-2" style={{ minWidth: 'max-content', margin: '0 auto', justifyContent: 'center' }}>
                {myHand.map((card, i) => {
                  const playable = canPlay(card)
                  return (
                    <div key={card.suit + card.rank} className="card-deal" style={{ animationDelay: `${i * 0.04}s` }}>
                      <Card suit={card.suit} rank={card.rank}
                        playable={playable}
                        onClick={() => playable && emit('play-card', { card })} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── CHAT ── */}
        {showChat && (
          <div className="w-60 flex-shrink-0 border-l overflow-hidden"
            style={{ borderColor: 'rgba(212,175,55,0.15)', background: 'rgba(0,0,0,0.4)' }}>
            <Chat messages={messages} onSend={t => emit('chat', { message: t })} myTeam={myTeam} />
          </div>
        )}
      </div>

      {/* ── HAND OVER MODAL ── */}
      {phase === 'hand-over' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}>
          <div className="rounded-2xl p-8 text-center shadow-2xl w-full max-w-sm fade-up"
            style={{ background: 'rgba(10,14,26,0.97)', border: '1px solid rgba(212,175,55,0.4)' }}>
            <div className="font-cinzel font-black text-2xl mb-1" style={{ color: '#f0d060' }}>Hand Over!</div>
            {room?.lastTrickResult?.isKot && (
              <div className="text-orange-400 font-cinzel font-bold mb-2 text-lg">🔥 KOT! (+2 pts)</div>
            )}
            <p className="text-gray-300 text-sm mb-5">
              <span className="font-bold text-base" style={{ color: TEAM_COLOR[room?.lastTrickResult?.winnerTeam ?? 0] }}>
                {room?.lastTrickResult?.winnerTeam === myTeam ? 'Your team' : 'Opponents'}
              </span>{' '}won the hand!
            </p>
            <div className="flex justify-around mb-6">
              {[0, 1].map(t => (
                <div key={t} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-cinzel" style={{ color: TEAM_COLOR[t] }}>{t === myTeam ? 'You' : 'Opp'}</span>
                  <span className="text-3xl font-bold text-white">{room?.scores?.[t] ?? 0}</span>
                  <span className="text-xs text-gray-500">/ {target} pts</span>
                </div>
              ))}
            </div>
            <button onClick={() => emit('next-hand')}
              className="w-full py-3 rounded-xl font-cinzel font-bold text-sm tracking-widest"
              style={{ background: 'linear-gradient(135deg, #d4af37, #a0852a)', color: '#0a0e1a' }}>
              DEAL NEXT HAND
            </button>
          </div>
        </div>
      )}

      {/* ── GAME OVER MODAL ── */}
      {phase === 'game-over' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 p-4"
          style={{ background: 'rgba(0,0,0,0.82)' }}>
          <div className="rounded-2xl p-8 text-center shadow-2xl w-full max-w-sm fade-up"
            style={{ background: 'rgba(10,14,26,0.98)', border: '1px solid rgba(212,175,55,0.5)' }}>
            <div className="text-5xl mb-3">{room?.winner === myTeam ? '🏆' : '😔'}</div>
            <div className="font-cinzel font-black text-3xl mb-2"
              style={{ color: room?.winner === myTeam ? '#f0d060' : '#f87171' }}>
              {room?.winner === myTeam ? 'YOU WIN!' : 'You Lost'}
            </div>
            <div className="flex justify-around my-6">
              {[0, 1].map(t => (
                <div key={t} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-cinzel" style={{ color: TEAM_COLOR[t] }}>{t === myTeam ? 'You' : 'Opp'}</span>
                  <span className="text-3xl font-bold text-white">{room?.scores?.[t] ?? 0}</span>
                  <span className="text-xs text-gray-500">points</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => emit('reset-game')}
                className="flex-1 py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider"
                style={{ background: 'linear-gradient(135deg, #d4af37, #a0852a)', color: '#0a0e1a' }}>
                PLAY AGAIN
              </button>
              <button onClick={() => router.push('/')}
                className="flex-1 py-3 rounded-xl font-cinzel font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                HOME
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
