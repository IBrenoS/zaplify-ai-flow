/**
 * WebSocket setup for real-time communication
 */

import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';

interface SocketUser {
  id: string;
  email: string;
  role?: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

export const setupWebSocket = (io: SocketIOServer) => {
  // Authentication middleware for WebSocket
  io.use((socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as any;

      socket.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role
      };

      logger.info(`WebSocket client authenticated: ${socket.user.email}`);
      next();

    } catch (error) {
      logger.warn('WebSocket authentication failed:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handling
  io.on('connection', (socket: any) => {
    const user = socket.user;
    logger.info(`WebSocket connected: ${user.email} (${socket.id})`);

    // Join user-specific room
    socket.join(`user_${user.id}`);

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle conversation updates
    socket.on('join_conversation', (data: { conversationId: string }) => {
      const roomName = `conversation_${data.conversationId}`;
      socket.join(roomName);
      logger.debug(`User ${user.email} joined conversation ${data.conversationId}`);

      // Notify others in the conversation
      socket.to(roomName).emit('user_joined_conversation', {
        userId: user.id,
        email: user.email,
        conversationId: data.conversationId
      });
    });

    socket.on('leave_conversation', (data: { conversationId: string }) => {
      const roomName = `conversation_${data.conversationId}`;
      socket.leave(roomName);
      logger.debug(`User ${user.email} left conversation ${data.conversationId}`);

      // Notify others in the conversation
      socket.to(roomName).emit('user_left_conversation', {
        userId: user.id,
        email: user.email,
        conversationId: data.conversationId
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { conversationId: string }) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing_start', {
        userId: user.id,
        email: user.email,
        conversationId: data.conversationId
      });
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing_stop', {
        userId: user.id,
        email: user.email,
        conversationId: data.conversationId
      });
    });

    // Handle assistant status updates
    socket.on('assistant_status_change', (data: { assistantId: string, status: string }) => {
      // Broadcast to all users who have access to this assistant
      io.to(`user_${user.id}`).emit('assistant_status_updated', {
        assistantId: data.assistantId,
        status: data.status,
        timestamp: Date.now()
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: ${user.email} (${socket.id}) - ${reason}`);

      // Notify all conversations this user was part of
      socket.rooms.forEach(room => {
        if (room.startsWith('conversation_')) {
          socket.to(room).emit('user_disconnected', {
            userId: user.id,
            email: user.email
          });
        }
      });
    });

    // Error handling
    socket.on('error', (error: Error) => {
      logger.error(`WebSocket error for ${user.email}:`, error);
    });
  });

  // Global error handling
  io.on('error', (error: Error) => {
    logger.error('WebSocket server error:', error);
  });

  logger.info('🔌 WebSocket server configured successfully');
};

// Utility functions for sending real-time updates from other parts of the application
export const sendToUser = (io: SocketIOServer, userId: string, event: string, data: any) => {
  io.to(`user_${userId}`).emit(event, data);
};

export const sendToConversation = (io: SocketIOServer, conversationId: string, event: string, data: any) => {
  io.to(`conversation_${conversationId}`).emit(event, data);
};

export const broadcastToAll = (io: SocketIOServer, event: string, data: any) => {
  io.emit(event, data);
};
