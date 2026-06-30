const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const GameEngine = require('./lib/gameEngine')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev })
const handle = app.getRequestHandler()

const rooms = {}
const playerRooms = {} // socketId -> roomCode
const botRooms = new Set() // room codes that have bots
const engine = new GameEngine(rooms)

function isBot(id) { return typeof id === 'string' && id.startsWith('__bot__') }

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  function broadcastState(room) {
    room.players.forEach((player) => {
      if (isBot(player.id)) return // bots have no socket
      const s = io.sockets.sockets.get(player.id)
      if (s) {
        s.emit('game-state', {
          room: engine.getPublicRoom(room, player.id),
          myHand: room.hands[player.id] || [],
        })
      }
    })
    // Trigger bot action after a short delay
    if (botRooms.has(room.code)) scheduleBot(room.code)
  }

  function scheduleBot(code) {
    const room = rooms[code]
    if (!room || !botRooms.has(code)) return

    // Bot calls trump
    if (room.phase === 'trump-selection') {
      if (!isBot(room.trumpCaller)) return // real player must pick
      setTimeout(() => {
        const r = rooms[code]
        if (!r || r.phase !== 'trump-selection') return
        const caller = r.trumpCaller
        if (!isBot(caller)) return
        const hand = r.hands[caller] || []
        const suits = ['spades', 'hearts', 'diamonds', 'clubs']
        // Pick suit with most cards in hand
        const best = suits.reduce((a, b) =>
          hand.filter(c => c.suit === a).length >= hand.filter(c => c.suit === b).length ? a : b
        )
        const result = engine.selectTrump(code, caller, best)
        if (!result.error) broadcastState(r)
      }, 900 + Math.random() * 600)
      return
    }

    // Bot plays a card
    if (room.phase === 'playing' && isBot(room.currentTurn)) {
      setTimeout(() => {
        const r = rooms[code]
        if (!r || r.phase !== 'playing' || !isBot(r.currentTurn)) return
        const botId = r.currentTurn
        const hand = r.hands[botId] || []
        if (!hand.length) return
        let valid = [...hand]
        if (r.currentTrick.length > 0) {
          const led = r.currentTrick[0].card.suit
          const suited = hand.filter(c => c.suit === led)
          if (suited.length) valid = suited
        }
        const card = valid[Math.floor(Math.random() * valid.length)]
        const result = engine.playCard(code, botId, card)
        if (!result.error) broadcastState(r)
      }, 750 + Math.random() * 750)
    }
  }

  io.on('connection', (socket) => {
    socket.on('create-room', ({ name, mode }) => {
      try {
        if (!name || !name.trim()) return socket.emit('room-error', 'Name is required')
        const room = engine.createRoom(mode)
        const { error, player } = engine.joinRoom(room.code, socket.id, name.trim())
        if (error) return socket.emit('room-error', error)
        playerRooms[socket.id] = room.code
        socket.join(room.code)
        socket.emit('room-created', { code: room.code, player })
        broadcastState(room)
      } catch (e) {
        console.error('create-room error:', e)
        socket.emit('room-error', 'Server error')
      }
    })

    socket.on('join-room', ({ name, code }) => {
      try {
        const upperCode = (code || '').toUpperCase().trim()
        if (!name || !name.trim()) return socket.emit('room-error', 'Name is required')
        if (!upperCode) return socket.emit('room-error', 'Room code is required')
        const room = rooms[upperCode]
        if (!room) return socket.emit('room-error', 'Room not found — check the code')
        if (room.phase !== 'waiting') return socket.emit('room-error', 'Game already in progress')
        if (room.players.length >= 4) return socket.emit('room-error', 'Room is full (4/4)')

        const { error, player } = engine.joinRoom(upperCode, socket.id, name.trim())
        if (error) return socket.emit('room-error', error)
        playerRooms[socket.id] = upperCode
        socket.join(upperCode)
        socket.emit('room-joined', { code: upperCode, player })
        broadcastState(room)

        if (room.players.length === 4) {
          engine.dealInitial(room)
          broadcastState(room)
        }
      } catch (e) {
        console.error('join-room error:', e)
        socket.emit('room-error', 'Server error')
      }
    })

    // ── Add bots for solo testing ──
    socket.on('add-bots', () => {
      try {
        const code = playerRooms[socket.id]
        if (!code) return
        const room = rooms[code]
        if (!room || room.phase !== 'waiting') return

        botRooms.add(code)
        const botNames = ['Raju 🤖', 'Bablu 🤖', 'Chintu 🤖']
        let added = 0
        while (room.players.length < 4 && added < 3) {
          const botId = `__bot__${code}_${added}`
          engine.joinRoom(code, botId, botNames[added])
          added++
        }

        engine.dealInitial(room)
        broadcastState(room)
      } catch (e) {
        console.error('add-bots error:', e)
      }
    })

    socket.on('select-trump', ({ suit }) => {
      try {
        const code = playerRooms[socket.id]
        if (!code) return
        const result = engine.selectTrump(code, socket.id, suit)
        if (result.error) return socket.emit('room-error', result.error)
        broadcastState(rooms[code])
      } catch (e) {
        console.error('select-trump error:', e)
      }
    })

    socket.on('play-card', ({ card }) => {
      try {
        const code = playerRooms[socket.id]
        if (!code) return
        const result = engine.playCard(code, socket.id, card)
        if (result.error) return socket.emit('room-error', result.error)
        broadcastState(rooms[code])
      } catch (e) {
        console.error('play-card error:', e)
      }
    })

    socket.on('next-hand', () => {
      try {
        const code = playerRooms[socket.id]
        if (!code) return
        const room = rooms[code]
        if (!room || room.phase !== 'hand-over') return
        engine.dealInitial(room)
        broadcastState(room)
        // Force bot trump if needed
        if (botRooms.has(code)) scheduleBot(code)
      } catch (e) {
        console.error('next-hand error:', e)
      }
    })

    socket.on('reset-game', () => {
      try {
        const code = playerRooms[socket.id]
        if (!code) return
        const room = rooms[code]
        if (!room || room.phase !== 'game-over') return
        engine.resetGame(room)
        broadcastState(room)
        if (botRooms.has(code)) scheduleBot(code)
      } catch (e) {
        console.error('reset-game error:', e)
      }
    })

    socket.on('chat', ({ message }) => {
      const code = playerRooms[socket.id]
      if (!code) return
      const room = rooms[code]
      if (!room) return
      const player = room.players.find((p) => p.id === socket.id)
      if (!player) return
      const text = (message || '').trim().slice(0, 150)
      if (!text) return
      const msg = {
        id: Date.now() + Math.random(),
        name: player.name,
        team: player.team,
        text,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }
      room.chat.push(msg)
      if (room.chat.length > 50) room.chat.shift()
      io.to(code).emit('chat-msg', msg)
    })

    socket.on('disconnect', () => {
      const code = playerRooms[socket.id]
      if (code) {
        const room = rooms[code]
        if (room) {
          const player = room.players.find((p) => p.id === socket.id)
          if (player) io.to(code).emit('player-left', { id: socket.id, name: player.name })
        }
        delete playerRooms[socket.id]
      }
    })
  })

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Chakdi Game ready on http://0.0.0.0:${port}`)
  })
})
