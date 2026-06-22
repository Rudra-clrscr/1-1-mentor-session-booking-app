import { Server as SocketIOServer, Socket } from 'socket.io';
import { query, queryOne } from '@/database';
import { v4 as uuidv4 } from 'uuid';

export async function handleMessageSend(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId, content, type = 'text', attachment } = data;
    const userId = socket.data.userId; // Use authenticated userId from socket

    if (!sessionId || !userId) {
      return;
    }
    if (!content && !attachment) {
      return;
    }

    // Verify user is part of this session before allowing message sending
    const session = await queryOne(
      'SELECT mentor_id, student_id FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (!session || (session.mentor_id !== userId && session.student_id !== userId)) {
      console.warn(`⚠️ Unauthorized message attempt by user ${userId} for session ${sessionId}`);
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    
    console.log('📨 Message received:', { sessionId, content, type, userId, socketId: socket.id });
    
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    // Save message to database
    await query(
      `INSERT INTO messages (id, session_id, user_id, content, type, attachment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [messageId, sessionId, userId, content ?? '', type, attachment ? JSON.stringify(attachment) : null, timestamp]
    );

    // Fetch user details
    const users = await query<any>('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [userId]);
    const user = users.rows[0];

    // Broadcast message to session (including full user details)
    const messageData = {
      id: messageId,
      session_id: sessionId,
      user_id: userId,
      content,
      type,
      attachment,
      created_at: timestamp,
      user: user ? { id: user.id, name: user.name, email: user.email, avatar: user.avatar_url } : null,
    };
    
    console.log('📤 Broadcasting message to session:', `session:${sessionId}`, messageData);
    io.to(`session:${sessionId}`).emit('message:receive', messageData);
    
    // Log room members for debugging
    const room = io.sockets.adapter.rooms.get(`session:${sessionId}`);
    console.log('👥 Room members:', room ? Array.from(room) : 'No members');
  } catch (err) {
    console.error('Message send error:', err);
    socket.emit('error', { message: 'Failed to send message' });
  }
}

export async function handleSessionJoin(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId } = data;
    const userId = socket.data.userId; // Use authenticated userId from socket
    const userName = socket.data.user?.name || data.userName;
    
    if (!sessionId || !userId) {
      console.warn('⚠️ Join session attempt with missing data:', { sessionId, userId });
      return;
    }

    console.log('🚪 User attempting to join session:', { sessionId, userId, userName, socketId: socket.id });
    
    // Verify authorization: check if user is mentor or student for this session
    const session = await queryOne(
      'SELECT mentor_id, student_id FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (!session) {
      console.error(`❌ Session ${sessionId} not found`);
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    const isAuthorized = session.mentor_id === userId || session.student_id === userId;

    if (!isAuthorized) {
      console.error(`❌ Unauthorized join attempt: User ${userId} for session ${sessionId}`);
      socket.emit('error', { message: 'Unauthorized to join this session' });
      return;
    }

    socket.join(`session:${sessionId}`);
    
    // Log room members after joining
    const room = io.sockets.adapter.rooms.get(`session:${sessionId}`);
    console.log('👥 Room members after join:', room ? Array.from(room) : 'No members');
    
    // Notify others in session
    socket.to(`session:${sessionId}`).emit('presence:user-joined', {
      userId,
      userName,
      timestamp: Date.now(),
    });

    console.log(`✅ User ${userId} joined session ${sessionId}`);
  } catch (err) {
    console.error('Session join error:', err);
    socket.emit('error', { message: 'Failed to join session' });
  }
}

export async function handleSessionLeave(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId, userId } = data;
    
    socket.leave(`session:${sessionId}`);
    
    // Notify others in session
    socket.to(`session:${sessionId}`).emit('presence:user-left', {
      userId,
      timestamp: Date.now(),
    });

    console.log(`User ${userId} left session ${sessionId}`);
  } catch (err) {
    console.error('Session leave error:', err);
  }
}
