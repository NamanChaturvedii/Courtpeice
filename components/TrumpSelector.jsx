'use client'

const SUITS = [
  { key: 'spades',   symbol: '♠', label: 'Spades',   color: '#e2e8f0', bg: 'rgba(30,30,60,0.8)'  },
  { key: 'hearts',   symbol: '♥', label: 'Hearts',   color: '#fc8181', bg: 'rgba(60,10,10,0.8)'  },
  { key: 'diamonds', symbol: '♦', label: 'Diamonds', color: '#fc8181', bg: 'rgba(60,10,10,0.8)'  },
  { key: 'clubs',    symbol: '♣', label: 'Clubs',    color: '#e2e8f0', bg: 'rgba(30,30,60,0.8)'  },
]

export default function TrumpSelector({ onSelect }) {
  return (
    <div className="fade-up">
      <p className="text-xs text-gray-400 text-center mb-3 font-cinzel tracking-widest uppercase">Choose Trump Suit (Rang)</p>
      <div className="grid grid-cols-2 gap-4">
        {SUITS.map(({ key, symbol, label, color, bg }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="flex flex-col items-center gap-2 py-5 px-8 rounded-2xl font-cinzel font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: bg,
              border: `2px solid ${color}44`,
              color,
              boxShadow: `0 4px 20px rgba(0,0,0,0.4), inset 0 0 0 1px ${color}22`,
            }}
          >
            <span style={{ fontSize: 48, lineHeight: 1 }}>{symbol}</span>
            <span className="text-sm tracking-wider">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
