import { Server } from 'socket.io';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/index.js';
import { getMembership } from '../services/roomService.js';
import * as messageService from '../services/messageService.js';
import { socketChatRateOk } from '../middleware/rateLimit.js';
import { setIo } from './emitter.js';

/**
 * Socket.IO bootstrap.
 *
 * Security model: the handshake authenticates the user, but room membership is
 * re-verified on the server for every protected event — being connected to a
 * socket room is never treated as authorization.
 */
export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.allowedOrigins,
      credentials: true,
    },
  });
  setIo(io);

  io.use(async (socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token || '');
      if (!payload) return next(new Error('UNAUTHORIZED'));
      const user = await User.findById(payload.sub);
      if (!user || user.accountStatus !== 'active' || user.tokenVersion !== payload.tv) {
        return next(new Error('UNAUTHORIZED'));
      }
      socket.data.user = { _id: String(user._id), displayName: user.displayName };
      next();
    } catch (err) {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    socket.join(`user:${userId}`);
    logger.debug('socket.connected', { userId });

    socket.on('room:join', async ({ roomId } = {}, ack) => {
      try {
        if (!roomId) return ack?.({ ok: false, message: 'roomId required' });
        const membership = await getMembership(roomId, userId);
        const allowed = membership && membership.membershipStatus === 'active';
        if (!allowed) return ack?.({ ok: false, message: 'Join the activity to open chat' });
        socket.join(`room:${roomId}`);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: 'Could not join room channel' });
      }
    });

    socket.on('room:leave', ({ roomId } = {}) => {
      if (roomId) socket.leave(`room:${roomId}`);
    });

    socket.on('message:send', async ({ roomId, content } = {}, ack) => {
      try {
        if (!roomId || typeof content !== 'string' || !content.trim()) {
          return ack?.({ ok: false, message: 'Message content required' });
        }
        if (content.length > 2000) {
          return ack?.({ ok: false, message: 'Messages are limited to 2000 characters' });
        }
        if (!socketChatRateOk(userId)) {
          return ack?.({ ok: false, message: 'You are sending messages too quickly' });
        }
        const message = await messageService.sendMessage(roomId, socket.data.user, content.trim());
        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, message: err.isOperational ? err.message : 'Message could not be sent' });
      }
    });

    socket.on('typing', ({ roomId } = {}) => {
      if (!roomId || !socket.rooms.has(`room:${roomId}`)) return;
      socket.to(`room:${roomId}`).emit('typing', { roomId, user: socket.data.user });
    });

    socket.on('disconnect', () => {
      logger.debug('socket.disconnected', { userId });
    });
  });

  return io;
}
