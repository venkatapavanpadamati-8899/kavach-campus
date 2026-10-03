const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); 

let io;

const initWebSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    try {
      // Use the same JWT_SECRET as in auth.js
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kavach-super-secret-key-2024');
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] User connected: ${socket.user.id} (${socket.user.role})`);
    
    // Join a room based on user ID for personal notifications
    socket.join(`user_${socket.user.id}`);

    // If staff/admin, join role-based rooms
    if (['ADMIN', 'SUPER_ADMIN', 'SECURITY', 'STAFF', 'PRINCIPAL', 'HOD', 'COUNSELOR', 'WOMENS_CELL'].includes(socket.user.role)) {
      socket.join('staff_notifications');
      socket.join(`role_${socket.user.role}`);
    }

    socket.on('disconnect', () => {
      console.log(`[WebSocket] User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const notifyUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

const notifyStaff = (event, data) => {
  if (io) {
    io.to('staff_notifications').emit(event, data);
  }
};

const notifyRole = (role, event, data) => {
  if (io) {
    io.to(`role_${role}`).emit(event, data);
  }
};

module.exports = {
  initWebSocket,
  getIo,
  notifyUser,
  notifyStaff,
  notifyRole
};
