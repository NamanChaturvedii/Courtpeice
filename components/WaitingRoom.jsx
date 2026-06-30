'use client'
import { useState } from 'react'

const TEAM_COLOR = ['#3b82f6', '#ef4444']
const SEAT_LABEL = ['South (You)', 'West', 'North (Partner)', 'East']

export default function WaitingRoom({ room, myId, roomCode, onBack, onAddBots }) {
  const [copied, setCopied] = useState(false)
  const players = room?.players || []
  const mode    = room?.mode || '…'
  const canAddBots = players.length >= 1 && players.length < 4

  function copyLink() {
    const url = `${window.location.origin}/room/${roomCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen felt flex flex-col items-center justify-center p-4 gap-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-cinzel font-black text-3xl" style={{ color: '#f0d060' }}>Waiting for Players</h2>
        <p className="text-gray-400 text-sm mt-1">Need {4 - players.length} more player{4 - players.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Room code */}
      <div className="rounded-2xl p-6 text-center shadow-xl fade-up"
        style={{ background: 'rgba(10,14,26,0.95)', border: '1px solid rgba(212,175,55,0.3)', minWidth: 300 }}>
        <p className="text-xs text-gray-500 font-cinzel tracking-widest uppercase mb-2">Room Code</p>
        <div className="font-cinzel font-black text-5xl tracking-[0.25em] mb-4" style={{ color: '#f0d060' }}>
          {roomCode}
        </div>
        <button onClick={copyLink}
          className="w-full py-2.5 rounded-xl font-cinzel text-sm tracking-wider transition-all"
          style={{
            background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(212,175,55,0.15)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(212,175,55,0.35)'}`,
            color: copied ? '#4ade80' : '#d4af37',
          }}>
          {copied ? '✓ Link Copied!' : '⎘ Copy Join Link'}
        </button>
        <p className="text-gray-600 text-xs mt-3">Share this code with friends to join</p>
      </div>

      {/* Players list */}
      <div className="rounded-2xl p-4 w-full max-w-sm shadow-xl"
        style={{ background: 'rgba(10,14,26,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs text-gray-500 font-cinzel tracking-widest uppercase mb-3 text-center">
          Players ({players.length}/4)
        </p>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((pos) => {
            const player = players.find((p) => p.position === pos)
            const isMe   = player?.id === myId
            const isBot  = player?.id?.startsWith('__bot__')
            const team   = pos % 2
            return (
              <div key={pos}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                style={{
                  background: player ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${player ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                }}>
                <span className="text-lg" style={{ color: player ? TEAM_COLOR[team] : 'rgba(255,255,255,0.15)' }}>
                  {player ? (isBot ? '🤖' : '●') : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  {player ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{player.name}</span>
                      {isMe && (
                        <span className="text-xs text-gold px-1.5 py-0.5 rounded font-cinzel"
                          style={{ background: 'rgba(212,175,55,0.15)' }}>You</span>
                      )}
                      {isBot && (
                        <span className="text-xs text-purple-400 px-1.5 py-0.5 rounded font-cinzel"
                          style={{ background: 'rgba(167,139,250,0.1)' }}>Bot</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-600 italic">Empty seat</span>
                  )}
                  <span className="text-xs text-gray-500">{SEAT_LABEL[pos]} · Team {team === 0 ? 'A' : 'B'}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Teams */}
        <div className="mt-4 pt-3 border-t flex justify-around text-xs" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {[0, 1].map((t) => (
            <div key={t} className="flex flex-col items-center gap-1">
              <span style={{ color: TEAM_COLOR[t] }}>Team {t === 0 ? 'A' : 'B'}</span>
              <span className="text-gray-500">Seats {t === 0 ? '0 & 2' : '1 & 3'} (partners)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🤖 Solo Test Button */}
      {canAddBots && (
        <div className="w-full max-w-sm fade-up">
          <button
            onClick={onAddBots}
            className="w-full py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.4))',
              border: '1.5px solid rgba(167,139,250,0.5)',
              color: '#c4b5fd',
            }}>
            🤖 Test Solo — Add 3 Bots
          </button>
          <p className="text-center text-xs text-gray-600 mt-2">
            Bots will auto-play so you can preview the UI
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-600">
        <div className="flex gap-1 items-center">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#22c55e', animation: 'pulse 1.5s ease-in-out infinite' }} />
          Mode: <span className="text-gray-400 capitalize ml-1">{mode === 'chakdi' ? 'Chakdi' : 'Court Piece'}</span>
        </div>
        <span>·</span>
        <span>Game starts when all 4 join</span>
      </div>

      <button onClick={onBack} className="text-xs text-gray-600 hover:text-gray-400 transition-colors font-cinzel">
        ← Leave Room
      </button>
    </div>
  )
}
