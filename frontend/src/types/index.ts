// User Types
export type UserRole = 'mentor' | 'student' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
  avg_rating?: number;
  total_sessions?: number;
}

export interface UserProfile extends User {
  sessions_count: number;
  rating?: number;
  total_mentoring_hours?: number;
}

// Session Types
export type SessionStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Session {
  id: string;
  mentor_id: string;
  student_id?: string;
  title: string;
  description?: string;
  topic?: string;
  status: SessionStatus;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  duration_minutes?: number;
  language: string;
  code_language?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtendedSession extends Session {
  mentor?: User;
  student?: User;
  messages?: Message[];
}

// Message Types
export type MessageType = 'text' | 'code_snippet' | 'system';

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  type: MessageType;
  code_snippet?: string;
  created_at: string;
  user?: User;
}

// Code Types
export interface CodeSnapshot {
  id: string;
  session_id: string;
  code: string;
  language: string;
  version: number;
  user_id: string;
  saved_at: string;
}

// WebRTC Types
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: 'all' | 'relay';
}

export interface VideoOffer {
  type: 'offer';
  sdp: string;
}

export interface VideoAnswer {
  type: 'answer';
  sdp: string;
}

export interface ICECandidate {
  candidate: string;
  sdpMLineIndex?: number;
  sdpMid?: string;
}

// Socket Events Types
export interface SocketEvents {
  // Connection Events
  'connected': void;
  'disconnected': void;
  'error': Error;

  // Code Events
  'code:update': { code: string; language: string; user_id: string };
  'code:execution:result': { output: string; status: string; language: string; error?: string };
  'language:change': { language: string };
  'cursor:move': { line: number; column: number; user_id: string };
  'selection:change': { start: { line: number; column: number }; end: { line: number; column: number } };

  // Chat Events
  'message:send': { content: string; type: MessageType };
  'message:receive': Message;

  // Video Events
  'video:initiate': { initiator_id: string };
  'video:accept': { acceptor_id: string };
  'video:decline': { reason?: string };
  'video:offer': { sessionId: string; offer: RTCSessionDescriptionInit; remoteUserId?: string; initiatorId: string; peerId?: string };
  'video:answer': { sessionId: string; answer: RTCSessionDescriptionInit; initiatorId?: string; peerId?: string };
  'video:ice-candidate': { sessionId?: string; peerId?: string; initiatorId?: string; candidate: RTCIceCandidateInit };
  'video:code-verified': { sessionId: string; timestamp: number };
  'video:end': void;
  'video:toggle-camera': { userId: string };
  'video:toggle-mic': { userId: string };
  'video:stream-ended': { peerId?: string; userId?: string };
  'video:connection-request': { sessionId: string; userId: string; targetUserId: string };

  // Screen Sharing Events
  'screen:offer': { sessionId: string; offer: RTCSessionDescriptionInit; peerId?: string; initiatorId?: string };
  'screen:answer': { sessionId: string; answer: RTCSessionDescriptionInit; peerId?: string; initiatorId?: string };
  'screen:ice-candidate': { sessionId?: string; peerId?: string; initiatorId?: string; candidate: RTCIceCandidateInit };
  'screen:started': { userId: string; sessionId: string };
  'screen:stopped': { userId: string; sessionId: string };

  // Presence Events
  'presence:update': { status: 'online' | 'away' | 'typing'; user_id: string };
  'presence:user-joined': { user: User };
  'presence:user-left': { user_id: string };

  // Session Events
  'session:join': { sessionId: string };
  'session:leave': { sessionId: string };
  'session:joined': { user: User };
  'session:left': { user_id: string };
  'session:end': { sessionId: string };
  'session:ended': void;

  // Notification Events
  'notification:received': {
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  };
  'notification:new': {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    related_id?: string;
    is_read: boolean;
    created_at: string;
  };

  // Recording Events
  'recording:request': { sessionId: string; requesterName: string };
  'recording:consent-prompt': { requesterName: string };
  'recording:consent': { sessionId: string; granted: boolean };
  'recording:consent-result': { granted: boolean };
  'recording:stop': { sessionId: string };
  'recording:stopped-by-peer': void;
}

// Auth Types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupData extends AuthCredentials {
  name: string;
  role: UserRole;
}

export interface AuthContext {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: AuthCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

// Notification Types
export type NotificationType = 'session_invite' | 'message' | 'video_call' | 'session_started';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  content: string;
  related_session_id?: string;
  read: boolean;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
