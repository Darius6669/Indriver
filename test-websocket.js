const { Server } = require('socket.io');
const http = require('http');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);
  
  socket.emit('welcome', { message: '¡Conectado!', id: socket.id });
  
  socket.on('test', (data) => {
    console.log('📨 Mensaje recibido:', data);
    socket.emit('test_response', { message: '¡Funciona!', data });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('🚀 Servidor Socket.IO puro en puerto 3000');
  console.log('📡 Conecta con: http://localhost:3000');
});