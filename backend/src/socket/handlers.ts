import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  handleCodeUpdate,
  handleCursorMove,
  handleLanguageChange,
} from './handlers/codeEditor';
import {
  handleMessageSend,
  handleSessionJoin,
  handleSessionLeave,
} from './handlers/chat';
import {
  handleVideoInitiate,
  handleVideoOffer,
  handleVideoAnswer,
  handleICECandidate,
  handleVideoEnd,
  handleVideoConnectionRequest,
  handleScreenStarted,
  handleScreenStopped,
  handleScreenOffer,
  handleScreenAnswer,
  handleScreenICECandidate,
} from './handlers/video';
import {
  handlePresenceUpdate,
} from './handlers/presence';
import {
  handleRecordingRequest,
  handleRecordingConsent,
  handleRecordingStop,
} from './handlers/recording';

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`✅ User connected: ${socket.id} (userId: ${userId})`);
    console.log(`   Total connected clients: ${io.engine.clientsCount}`);

    // Code editor events
    socket.on('code:update', (data) => handleCodeUpdate(socket, io, data));
    socket.on('cursor:move', (data) => handleCursorMove(socket, io, data));
    socket.on('language:change', (data) => handleLanguageChange(socket, io, data));

    // Chat events
    socket.on('message:send', (data) => {
      console.log('💬 ========== BACKEND: message:send event RECEIVED ==========');
      console.log('📊 Message data:', { 
        sessionId: data?.sessionId, 
        userId: data?.userId, 
        contentLength: data?.content?.length,
        type: data?.type 
      });
      console.log('📊 Socket:', { socketId: socket.id, userId: socket.data.userId });
      handleMessageSend(socket, io, data);
      console.log('💬 ========== BACKEND: message:send PROCESSED ==========');
    });
    socket.on('session:join', (data) => {
      console.log('🚪 ========== BACKEND: session:join event RECEIVED ==========');
      console.log('📊 Event data:', data);
      console.log('📊 Socket details:', { socketId: socket.id, userId: socket.data.userId });
      handleSessionJoin(socket, io, data);
      console.log('🚪 ========== BACKEND: session:join PROCESSED ==========');
    });
    socket.on('session:leave', (data) => handleSessionLeave(socket, io, data));

    // Video events
    socket.on('video:initiate', (data) => handleVideoInitiate(socket, io, data));
    socket.on('video:offer', (data) => handleVideoOffer(socket, io, data));
    socket.on('video:answer', (data) => handleVideoAnswer(socket, io, data));
    socket.on('video:ice-candidate', (data) => handleICECandidate(socket, io, data));
    socket.on('video:end', () => handleVideoEnd(socket, io));
    socket.on('video:connection-request', (data) => handleVideoConnectionRequest(socket, io, data));

    // Screen share events
    socket.on('screen:started', (data) => handleScreenStarted(socket, io, data));
    socket.on('screen:stopped', (data) => handleScreenStopped(socket, io, data));
    socket.on('screen:offer', (data) => handleScreenOffer(socket, io, data));
    socket.on('screen:answer', (data) => handleScreenAnswer(socket, io, data));
    socket.on('screen:ice-candidate', (data) => handleScreenICECandidate(socket, io, data));

    // Presence events
    socket.on('presence:update', (data) => handlePresenceUpdate(socket, io, data));

    // Recording events
    socket.on('recording:request', (data) => handleRecordingRequest(socket, io, data));
    socket.on('recording:consent', (data) => handleRecordingConsent(socket, io, data));
    socket.on('recording:stop', (data) => handleRecordingStop(socket, io, data));

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id} (userId: ${userId})`);
      console.log(`   Total connected clients: ${io.engine.clientsCount}`);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });
}
