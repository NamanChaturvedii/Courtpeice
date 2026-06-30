'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUIT_ICONS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState('chakdi')
  const [tab, setTab] = useState('create') // 'create' | 'join'
  const [err, setErr] = useState('')

  function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return setErr('Please enter your name')
    sessionStorage.setItem('chakdi_name', name.trim())
    sessionStorage.setItem('chakdi_mode', mode)
    router.push('/room/new')
  }

  function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return setErr('Please enter your name')
    if (!joinCode.trim()) return setErr('Please enter a room code')
    sessionStorage.setItem('chakdi_name', name.trim())
    router.push('/room/' + joinCode.trim().toUpperCase())
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1e3a5f 0%, #0a0e1a 70%)' }}>

      {/* Header */}
      <div className="text-center mb-8 select-none">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-3xl">♠</span>
          <h1 className="font-cinzel font-black text-4xl sm:text-5xl"
            style={{ background: 'linear-gradient(135deg, #f0d060, #d4af37, #a0852a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CHAKDI
          </h1>
          <span className="text-3xl" style={{ color: '#c0392b' }}>♥</span>
        </div>
        <p className="text-gold-light text-sm font-cinzel tracking-widest opacity-80">चकड़ी — Court Piece</p>
        <p className="text-gray-400 text-xs mt-2">Indian 4-Player Trick-Taking Card Game</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(15,20,40,0.95)', border: '1px solid rgba(212,175,55,0.25)' }}>

        {/* Name input */}
        <div className="px-6 pt-6 pb-4">
          <label className="block text-xs text-gold font-cinzel tracking-wider mb-1 uppercase">Your Name</label>
          <input
            className="w-full rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-gold"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}
            placeholder="Enter your name…"
            value={name}
            onChange={(e) => { setName(e.target.value); setErr('') }}
            maxLength={20}
          />
        </div>

        {/* Tabs */}
        <div className="flex mx-6 mb-4 rounded-lg overflow-hidden"
          style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
          {['create', 'join'].map((t) => (
            <button key={t}
              onClick={() => { setTab(t); setErr('') }}
              className="flex-1 py-2 text-sm font-cinzel transition-colors"
              style={{
                background: tab === t ? 'rgba(212,175,55,0.18)' : 'transparent',
                color: tab === t ? '#f0d060' : 'rgba(255,255,255,0.45)',
              }}>
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {/* Create Room */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-xs text-gold font-cinzel tracking-wider mb-2 uppercase">Game Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'chakdi', label: 'Chakdi', sub: 'चकड़ी', win: 'First to 5 pts', desc: 'Trump caller leads first' },
                  { key: 'courtpiece', label: 'Court Piece', sub: 'Court Piece', win: 'First to 7 pts', desc: "Caller's partner leads" },
                ].map(({ key, label, sub, win, desc }) => (
                  <button type="button" key={key}
                    onClick={() => setMode(key)}
                    className="rounded-xl p-3 text-left transition-all"
                    style={{
                      background: mode === key ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${mode === key ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                    <div className="font-cinzel font-bold text-sm" style={{ color: mode === key ? '#f0d060' : '#aaa' }}>{label}</div>
                    <div className="text-xs mt-0.5 opacity-60">{sub}</div>
                    <div className="text-xs mt-1.5 opacity-70">{win}</div>
                    <div className="text-xs opacity-50 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode description */}
            <div className="rounded-lg p-3 text-xs text-gray-400 leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {mode === 'chakdi'
                ? 'Chakdi: 4 players (2v2). See 5 cards → call trump → play 13 tricks. Win 7 tricks to win the hand. Consecutive 7 tricks = Kot (2 pts). First to 5 points wins!'
                : 'Court Piece: Same rules, but trump caller\'s partner leads the first trick. Win all 13 tricks for a Kot (2 pts). First to 7 points wins!'}
            </div>

            {err && <p className="text-red-400 text-xs text-center">{err}</p>}

            <button type="submit"
              className="w-full py-3 rounded-xl font-cinzel font-bold text-sm tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #d4af37, #a0852a)', color: '#0a0e1a' }}>
              CREATE ROOM
            </button>
          </form>
        )}

        {/* Join Room */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-xs text-gold font-cinzel tracking-wider mb-1 uppercase">Room Code</label>
              <input
                className="w-full rounded-lg px-4 py-2.5 text-white text-lg font-cinzel tracking-widest text-center uppercase outline-none focus:ring-2 focus:ring-gold"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(212,175,55,0.3)', letterSpacing: '0.2em' }}
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setErr('') }}
                maxLength={6}
              />
            </div>

            {err && <p className="text-red-400 text-xs text-center">{err}</p>}

            <button type="submit"
              className="w-full py-3 rounded-xl font-cinzel font-bold text-sm tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #2980b9, #1a5276)', color: '#fff' }}>
              JOIN ROOM
            </button>
          </form>
        )}
      </div>

      {/* Suits decoration */}
      <div className="flex gap-6 mt-8 text-2xl opacity-20 select-none">
        <span style={{ color: '#c0392b' }}>♥</span>
        <span className="text-white">♠</span>
        <span style={{ color: '#c0392b' }}>♦</span>
        <span className="text-white">♣</span>
      </div>

      <p className="text-gray-600 text-xs mt-4 text-center">
        4 players per room · No login needed · Free forever
      </p>
    </main>
  )
}
