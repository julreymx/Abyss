const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send('OS_Mental Abyss - Multiplayer Server Online'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track all connected players and their positions
const players = {};

io.on('connection', (socket) => {
  console.log('[+] Usuario entró al abismo:', socket.id);

  // Initialize this player with a default position
  players[socket.id] = { x: 0, y: 0, z: 0 };

  // Send the new player a snapshot of everyone else
  socket.emit('current_players', players);

  // Announce the new player to everyone else
  socket.broadcast.emit('user_joined', { id: socket.id, position: players[socket.id] });

  // When a player moves, broadcast to all others
  socket.on('user_moved', (position) => {
    players[socket.id] = position;
    socket.broadcast.emit('user_moved', { id: socket.id, position });
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log('[-] Usuario salió del abismo:', socket.id);
    delete players[socket.id];
    io.emit('user_left', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor multijugador del Caos activo en puerto ${PORT}`);
});
