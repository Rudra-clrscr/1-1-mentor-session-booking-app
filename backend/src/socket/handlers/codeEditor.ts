import { Server as SocketIOServer, Socket } from 'socket.io';
import { query, queryOne } from '@/database';

export async function handleCodeUpdate(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId, code, language } = data;
    const userId = socket.data.userId;
    const roomName = `session:${sessionId}`;

    // Verify socket is in the room (authorized)
    if (!socket.rooms.has(roomName)) {
      console.warn(`⚠️ Unauthorized code:update from user ${userId} for session ${sessionId}`);
      return;
    }
    
    console.log('📝 Code update received:', { sessionId, codeLength: code?.length, language, userId, socketId: socket.id });
    
    // Broadcast to other users in the session
    const codeData = {
      code,
      language,
      userId,
      timestamp: Date.now(),
    };
    
    console.log('📤 Broadcasting code to session:', roomName, codeData);
    socket.to(roomName).emit('code:update', codeData);

    // Save code snapshot — only when the mentor opted in to recording for this
    // session, so editor activity isn't persisted without consent.
    try {
      const session = await queryOne('SELECT recording_enabled FROM sessions WHERE id = $1', [sessionId]);
      if (session?.recording_enabled) {
        await query(
          `INSERT INTO code_snapshots (session_id, code, language, user_id, saved_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [sessionId, code, language, userId]
        );
      }
    } catch (err) {
      console.error('Error saving code snapshot:', err);
    }
  } catch (err) {
    console.error('Code update error:', err);
    socket.emit('error', { message: 'Failed to update code' });
  }
}

export async function handleCursorMove(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId, line, column } = data;
    const userId = socket.data.userId;
    const roomName = `session:${sessionId}`;

    if (!socket.rooms.has(roomName)) return;
    
    socket.to(roomName).emit('cursor:move', {
      line,
      column,
      userId,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Cursor move error:', err);
  }
}

export async function handleLanguageChange(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId, language } = data;
    const roomName = `session:${sessionId}`;

    if (!socket.rooms.has(roomName)) return;
    
    socket.to(roomName).emit('language:change', {
      language,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Language change error:', err);
  }
}
