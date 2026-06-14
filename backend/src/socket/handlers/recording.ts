import { Server as SocketIOServer, Socket } from 'socket.io';

export async function handleRecordingRequest(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId, requesterName } = data;
    const roomName = `session:${sessionId}`;

    if (!socket.rooms.has(roomName)) return;

    // Notify only the other participant - they must consent before recording starts
    socket.to(roomName).emit('recording:consent-prompt', { requesterName });
  } catch (err) {
    console.error('Recording request error:', err);
  }
}

export async function handleRecordingConsent(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId, granted } = data;
    const roomName = `session:${sessionId}`;

    if (!socket.rooms.has(roomName)) return;

    // Both participants need the result so they can start/skip recording together
    io.to(roomName).emit('recording:consent-result', { granted });
  } catch (err) {
    console.error('Recording consent error:', err);
  }
}

export async function handleRecordingStop(socket: Socket, io: SocketIOServer, data: any) {
  try {
    const { sessionId } = data;
    const roomName = `session:${sessionId}`;

    if (!socket.rooms.has(roomName)) return;

    // Notify both so they stop their local recorders and show the download
    io.to(roomName).emit('recording:stopped-by-peer');
  } catch (err) {
    console.error('Recording stop error:', err);
  }
}
