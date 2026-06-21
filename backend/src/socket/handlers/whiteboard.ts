import { Server as SocketIOServer, Socket } from 'socket.io';

export async function handleWhiteboardDraw(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId, segment } = data;
    const roomName = `session:${sessionId}`;

    // Verify socket is in the room (authorized), same check as code:update
    if (!socket.rooms.has(roomName)) {
      console.warn(`⚠️ Unauthorized whiteboard:draw from session ${sessionId}`);
      return;
    }

    socket.to(roomName).emit('whiteboard:draw', { segment, userId: socket.data.userId });
  } catch (err) {
    console.error('Whiteboard draw error:', err);
  }
}

export async function handleWhiteboardClear(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId } = data;
    const roomName = `session:${sessionId}`;

    if (!socket.rooms.has(roomName)) return;

    socket.to(roomName).emit('whiteboard:clear', { userId: socket.data.userId });
  } catch (err) {
    console.error('Whiteboard clear error:', err);
  }
}
