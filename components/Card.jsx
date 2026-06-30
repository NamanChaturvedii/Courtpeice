'use client'

const SUIT_SYMBOL = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const RED_SUITS   = new Set(['hearts', 'diamonds'])
const FACE_CLASS  = { J: 'face-j', Q: 'face-q', K: 'face-k', A: 'face-a' }

export default function Card({ suit, rank, faceDown = false, playable = false, onClick }) {
  if (faceDown) {
    return <div className="card card-back" />
  }

  const isRed   = RED_SUITS.has(suit)
  const symbol  = SUIT_SYMBOL[suit] || '?'
  const suitCls = isRed ? 'suit-red' : 'suit-black'
  const faceCls = FACE_CLASS[rank] || ''

  return (
    <div
      className={`card card-front ${faceCls} ${playable ? 'card-playable' : ''}`}
      onClick={onClick}
      title={playable ? `Play ${rank} of ${suit}` : undefined}
    >
      {/* Top-left corner */}
      <div className={`flex flex-col items-center leading-none ${suitCls}`}>
        <span className="card-idx">{rank}</span>
        <span className="card-idx-sm">{symbol}</span>
      </div>

      {/* Center suit */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${suitCls}`}>
        <span className="card-center-suit select-none">{symbol}</span>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className={`flex flex-col items-center leading-none self-end rotate-180 ${suitCls}`}>
        <span className="card-idx">{rank}</span>
        <span className="card-idx-sm">{symbol}</span>
      </div>
    </div>
  )
}
