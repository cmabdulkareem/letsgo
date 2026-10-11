// Holds the Socket.IO server instance so plain services can emit without
// importing the socket bootstrap module (avoids circular imports).
let io = null;

export function setIo(instance) {
  io = instance;
}

export function getIo() {
  return io;
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToRoom(roomId, event, payload) {
  if (!io) return;
  io.to(`room:${roomId}`).emit(event, payload);
}
