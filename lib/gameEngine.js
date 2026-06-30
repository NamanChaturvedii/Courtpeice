class GameEngine {
  constructor(rooms) {
    this.rooms = rooms
  }

  createRoom(mode) {
    const code = this._genCode()
    this.rooms[code] = {
      code,
      mode: mode === 'courtpiece' ? 'courtpiece' : 'chakdi',
      players: [],
      phase: 'waiting',
      hands: {},
      remainingDeck: [],
      currentTrick: [],
      trickCounts: [0, 0],
      scores: [0, 0],
      trump: null,
      trumpCaller: null,
      currentTurn: null,
      currentLeader: null,
      dealerIndex: 0,
      consecutiveTricks: [0, 0],
      lastTrickTeam: null,
      lastTrickResult: null,
      chat: [],
    }
    return this.rooms[code]
  }

  joinRoom(code, socketId, name) {
    const room = this.rooms[code]
    if (!room) return { error: 'Room not found' }
    if (room.players.length >= 8) return { error: 'Room is full (8/8)' }
    if (room.players.find((p) => p.id === socketId)) return { error: 'Already joined' }
    const position = room.players.length
    const isSpectator = position >= 4
    const team = isSpectator ? null : position % 2
    const player = { id: socketId, name, position, team, isSpectator }
    room.players.push(player)
    return { player }
  }

  dealInitial(room) {
    const deck = this._createDeck()
    this._shuffle(deck)
    room.hands = {}
    room.players.forEach((p) => { room.hands[p.id] = [] })
    room.currentTrick = []
    room.trickCounts = [0, 0]
    room.consecutiveTricks = [0, 0]
    room.lastTrickTeam = null
    room.lastTrickResult = null
    room.trump = null
    room.trumpCaller = null
    room.currentTurn = null
    room.currentLeader = null

    // Chakdi: trump caller = left of dealer (dealerIndex+1)
    // Court Piece: trump caller = right of dealer (dealerIndex+3 mod 4)
    const tcPos = room.mode === 'chakdi'
      ? (room.dealerIndex + 1) % 4
      : (room.dealerIndex + 3) % 4

    const order = this._dealOrder(room, tcPos)

    // Deal 5 cards each
    for (let i = 0; i < 5; i++) {
      order.forEach((pid) => { if (deck.length) room.hands[pid].push(deck.pop()) })
    }

    room.remainingDeck = deck
    room.trumpCaller = room.players[tcPos].id
    room.phase = 'trump-selection'
  }

  selectTrump(code, socketId, suit) {
    const room = this.rooms[code]
    if (!room) return { error: 'Room not found' }
    if (room.phase !== 'trump-selection') return { error: 'Not trump selection phase' }
    if (socketId !== room.trumpCaller) return { error: 'Only the trump caller can select' }
    const valid = ['spades', 'hearts', 'diamonds', 'clubs']
    if (!valid.includes(suit)) return { error: 'Invalid suit' }

    room.trump = suit

    // Deal remaining 8 cards each, same order
    const tcPos = room.players.findIndex((p) => p.id === room.trumpCaller)
    const order = this._dealOrder(room, tcPos)
    for (let i = 0; i < 8; i++) {
      order.forEach((pid) => { if (room.remainingDeck.length) room.hands[pid].push(room.remainingDeck.pop()) })
    }

    // Sort hands
    room.players.forEach((p) => {
      room.hands[p.id] = this._sortHand(room.hands[p.id], suit)
    })

    // Set who leads first trick
    if (room.mode === 'chakdi') {
      room.currentTurn = room.trumpCaller
    } else {
      // Court Piece: trump caller's partner leads
      const tc = room.players.find((p) => p.id === room.trumpCaller)
      const partner = room.players.find((p) => p.team === tc.team && p.id !== tc.id)
      room.currentTurn = partner.id
    }
    room.currentLeader = room.currentTurn
    room.phase = 'playing'
    return { room }
  }

  playCard(code, socketId, card) {
    const room = this.rooms[code]
    if (!room) return { error: 'Room not found' }
    if (room.phase !== 'playing') return { error: 'Not playing phase' }
    if (socketId !== room.currentTurn) return { error: 'Not your turn' }

    const hand = room.hands[socketId]
    const inHand = hand.find((c) => c.suit === card.suit && c.rank === card.rank)
    if (!inHand) return { error: 'Card not in hand' }

    // Follow-suit validation
    if (room.currentTrick.length > 0) {
      const ledSuit = room.currentTrick[0].card.suit
      const hasSuit = hand.some((c) => c.suit === ledSuit)
      if (hasSuit && card.suit !== ledSuit) return { error: 'Must follow suit' }
    }

    room.hands[socketId] = hand.filter((c) => !(c.suit === card.suit && c.rank === card.rank))
    room.currentTrick.push({ playerId: socketId, card })

    if (room.currentTrick.length === 4) {
      return this._resolveTrick(room)
    }

    const curIdx = room.players.findIndex((p) => p.id === socketId)
    room.currentTurn = room.players[(curIdx + 1) % 4].id
    return { room }
  }

  _resolveTrick(room) {
    const trick = room.currentTrick
    const ledSuit = trick[0].card.suit

    let winIdx = 0
    for (let i = 1; i < 4; i++) {
      if (this._beats(trick[i].card, trick[winIdx].card, ledSuit, room.trump)) winIdx = i
    }

    const winner = trick[winIdx]
    const winPlayer = room.players.find((p) => p.id === winner.playerId)
    const winTeam = winPlayer.team
    room.trickCounts[winTeam]++

    // Track consecutive tricks
    if (room.lastTrickTeam === winTeam) {
      room.consecutiveTricks[winTeam]++
    } else {
      room.consecutiveTricks = [0, 0]
      room.consecutiveTricks[winTeam] = 1
    }
    room.lastTrickTeam = winTeam

    const kotSize = room.mode === 'chakdi' ? 7 : 13
    const isKot = room.consecutiveTricks[winTeam] >= kotSize

    room.lastTrickResult = {
      trick: [...room.currentTrick],
      winnerTeam: winTeam,
      winnerId: winner.playerId,
      trickCounts: [...room.trickCounts],
      isKot,
    }
    room.currentTrick = []

    // Check for hand winner (7 tricks)
    const handWinner = room.trickCounts[0] >= 7 ? 0 : room.trickCounts[1] >= 7 ? 1 : null

    if (handWinner !== null) {
      const gain = isKot ? 2 : 1
      room.scores[handWinner] += gain
      const target = room.mode === 'chakdi' ? 5 : 7
      if (room.scores[handWinner] >= target) {
        room.phase = 'game-over'
        room.winner = handWinner
        return { room }
      }
      room.phase = 'hand-over'
      room.dealerIndex = (room.dealerIndex + 1) % 4
      return { room }
    }

    // Continue playing
    room.currentTurn = winner.playerId
    room.currentLeader = winner.playerId
    return { room }
  }

  resetGame(room) {
    room.scores = [0, 0]
    room.dealerIndex = 0
    room.winner = null
    this.dealInitial(room)
    return { room }
  }

  _beats(card, against, ledSuit, trump) {
    const t1 = card.suit === trump
    const t2 = against.suit === trump
    if (t1 && !t2) return true
    if (!t1 && t2) return false
    if (t1 && t2) return this._rv(card.rank) > this._rv(against.rank)
    const l1 = card.suit === ledSuit
    const l2 = against.suit === ledSuit
    if (l1 && !l2) return true
    if (!l1 && l2) return false
    if (l1 && l2) return this._rv(card.rank) > this._rv(against.rank)
    return false
  }

  _rv(rank) {
    return ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(rank)
  }

  _sortHand(hand, trump) {
    const allSuits = ['spades', 'hearts', 'diamonds', 'clubs']
    const order = [trump, ...allSuits.filter((s) => s !== trump)]
    return [...hand].sort((a, b) => {
      const sd = order.indexOf(a.suit) - order.indexOf(b.suit)
      if (sd !== 0) return sd
      return this._rv(b.rank) - this._rv(a.rank)
    })
  }

  getPublicRoom(room, forPlayerId) {
    return {
      code: room.code,
      mode: room.mode,
      phase: room.phase,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        isSpectator: p.isSpectator || false,
        cardCount: (room.hands[p.id] || []).length,
        isDealer: p.position === room.dealerIndex,
      })),
      currentTrick: room.currentTrick,
      trickCounts: room.trickCounts,
      scores: room.scores,
      trump: room.trump,
      trumpCaller: room.trumpCaller,
      currentTurn: room.currentTurn,
      currentLeader: room.currentLeader,
      dealerIndex: room.dealerIndex,
      consecutiveTricks: room.consecutiveTricks,
      lastTrickResult: room.lastTrickResult,
      winner: room.winner,
      chat: room.chat.slice(-30),
    }
  }

  _createDeck() {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs']
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
    const deck = []
    for (const suit of suits) for (const rank of ranks) deck.push({ suit, rank })
    return deck
  }

  _shuffle(deck) {
    const crypto = require('crypto')
    for (let i = deck.length - 1; i > 0; i--) {
      // Use crypto.randomInt for truly unpredictable shuffle
      const j = crypto.randomInt(0, i + 1)
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
  }

  _dealOrder(room, startPos) {
    return Array.from({ length: 4 }, (_, i) => room.players[(startPos + i) % 4].id)
  }

  _genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    } while (this.rooms[code])
    return code
  }
}

module.exports = GameEngine
