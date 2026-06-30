'use client'
import { useRef, useState, useEffect } from 'react'

const TEAM_COLOR = ['#3b82f6', '#ef4444']

export default function Chat({ messages, onSend, myTeam }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send(e) {
    e.preventDefault()
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center gap-2"
        style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
        <span className="text-xs font-cinzel text-gold tracking-wider">CHAT</span>
        <span className="text-xs text-gray-600">({messages.length})</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 text-xs">
        {messages.length === 0 ? (
          <p className="text-gray-600 text-center mt-4 font-cinzel">Chat away!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="fade-up">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-bold truncate max-w-[80px]" style={{ color: TEAM_COLOR[msg.team] }}>
                  {msg.name}
                </span>
                <span className="text-gray-600 text-[10px] flex-shrink-0">{msg.time}</span>
              </div>
              <p className="text-gray-300 mt-0.5 break-words leading-relaxed">{msg.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-2 border-t" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
        <div className="flex gap-1">
          <input
            className="flex-1 rounded-lg px-2 py-1.5 text-xs text-white outline-none min-w-0"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
            placeholder="Say something…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={150}
          />
          <button type="submit"
            className="px-2 py-1.5 rounded-lg text-xs font-cinzel flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
            ↑
          </button>
        </div>
      </form>
    </div>
  )
}
