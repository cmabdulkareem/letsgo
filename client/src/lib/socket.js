import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket(token) {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRoomChannel(roomId) {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false });
    socket.emit('room:join', { roomId }, resolve);
  });
}

export function leaveRoomChannel(roomId) {
  socket?.emit('room:leave', { roomId });
}

export function sendSocketMessage(roomId, content) {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, message: 'Not connected' });
    socket.emit('message:send', { roomId, content }, resolve);
  });
}
