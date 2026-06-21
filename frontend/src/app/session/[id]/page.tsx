'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { webrtcService } from '@/services/webrtc';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { setupVideoDebug } from '@/services/webrtcDebug';
import { webrtcDiagnostics } from '@/services/webrtcDiagnostics';
import { useSessionStore, useEditorStore, useVideoStore, useAuthStore } from '@/store';
import { GlowingButton, GlowingCard, Badge, Avatar } from '@/components/ui/GlowingComponents';
import { CollaborativeEditor } from '@/components/CollaborativeEditor';
import { Whiteboard } from '@/components/Whiteboard';
import { PostSessionFeedbackModal } from '@/components/PostSessionFeedbackModal';
import { RecordingConsentModal } from '@/components/RecordingConsentModal';
import { RecordingIndicator } from '@/components/RecordingIndicator';
import { RecordingToast } from '@/components/RecordingToast';
import { useRecorder } from '@/hooks/useRecorder';
import dynamic from 'next/dynamic';

// Configure Monaco Editor - disable workers to avoid network errors
if (typeof window !== 'undefined') {
  window.MonacoEnvironment = {
    getWorkerUrl: () => {
      // Return a simple worker that doesn't require network access
      const blob = new Blob(['self.onmessage = () => {}'], { type: 'application/javascript' });
      return URL.createObjectURL(blob);
    }
  };
}

interface Session {
  id: string;
  title: string;
  description: string;
  status: string;
  mentor_id: string;
  student_id: string;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingMentorName, setRatingMentorName] = useState('your mentor');
  const [ratingMentorAvatar, setRatingMentorAvatar] = useState<string | undefined>(undefined);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const listenerRef = useRef<any>(null);

  const {
    messages,
    setCurrentSession,
    addMessage,
    setMessages,
  } = useSessionStore();

  const { code, language, setCode, setLanguage, executionOutput } = useEditorStore();
  const { isCameraOn, isMicOn, localStream, setLocalStream } = useVideoStore(); // Remove screen share from global store
  const currentUser = useAuthStore((state) => state.user);

  // Ref for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Track which streams have already been assigned to prevent duplicates
  const assignedRemoteStreamIds = useRef<Set<string>>(new Set());
  const assignedScreenStreamIds = useRef<Set<string>>(new Set());
  // Store pending streams if ref isn't ready initially (safety fallback)
  const pendingRemoteStreamRef = useRef<{stream: MediaStream, peerId: string} | null>(null);

  // Video states
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharingActive, setIsScreenSharingActive] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [pendingStreamCounter, setPendingStreamCounter] = useState(0);

  // Left panel tab (code editor vs whiteboard) — both stay mounted so
  // whiteboard strokes and editor content survive switching back and forth.
  const [leftPanelTab, setLeftPanelTab] = useState<'code' | 'whiteboard'>('code');

  // Recording state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentRequesterName, setConsentRequesterName] = useState('');
  const [awaitingConsent, setAwaitingConsent] = useState(false);
  const [recordingToasts, setRecordingToasts] = useState<{ id: number; message: string }[]>([]);

  const {
    recordingState,
    isRecording,
    downloadUrl,
    downloadFilename,
    startRecording,
    stopRecording,
    revokeDownloadUrl,
  } = useRecorder(localStream);

  const showRecordingToast = useCallback((message: string) => {
    const id = Date.now();
    setRecordingToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setRecordingToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Setup diagnostics and services in global window (FIRST - before anything else)
  useEffect(() => {
    // Make services available globally for debugging
    (window as any).socketService = socketService;
    (window as any).webrtcService = webrtcService;
    (window as any).webrtcDiag = {
      summary: () => {
        const summary = webrtcDiagnostics.export();
        console.log('📊 WebRTC Diagnostics Summary:', summary);
        return summary;
      },
      events: () => {
        const events = webrtcDiagnostics.getEvents();
        console.log('📋 WebRTC Events:', events);
        return events;
      },
      export: () => {
        const data = webrtcDiagnostics.export();
        console.log('💾 WebRTC Export:', data);
        return data;
      },
      clear: () => webrtcDiagnostics.clear(),
      printSummary: () => webrtcDiagnostics.printSummary(),
    };
    console.log('✅ Global debug tools available: window.socketService, window.webrtcService, window.webrtcDiag');
    console.log('🔧 Try: window.socketService?.socket?.connected');
    console.log('🔧 Try: window.webrtcDiag?.summary()');
  }, []);

  // Setup diagnostics command in console
  useEffect(() => {
    // Make diagnostics available globally
    (window as any).webrtcDiag = {
      summary: () => webrtcDiagnostics.printSummary(),
      events: () => webrtcDiagnostics.getEvents(),
      export: () => webrtcDiagnostics.export(),
      clear: () => webrtcDiagnostics.clear(),
    };
    console.log('🔧 WebRTC Diagnostics available: window.webrtcDiag.summary(), .events(), .export(), .clear()');
  }, []);

  // NOTE: Removed old pending stream handling - now handled directly in setOnRemoteStream callback
  // with deduplication using assignedRemoteStreamIds to prevent multiple assignments

  // SAFETY FALLBACK: If ref becomes ready and we have a pending stream, assign it immediately
  useEffect(() => {
    // Try to assign pending stream immediately
    if (remoteVideoRef.current && pendingRemoteStreamRef.current && document.body.contains(remoteVideoRef.current)) {
      const { stream, peerId } = pendingRemoteStreamRef.current;
      console.log('✅ [PENDING-STREAM] Remote video ref is now ready! Assigning pending stream...');
      
      // Check if this stream hasn't been assigned yet
      if (!assignedRemoteStreamIds.current.has(stream.id)) {
        try {
          remoteVideoRef.current.srcObject = stream;
          assignedRemoteStreamIds.current.add(stream.id);
          
          const playPromise = remoteVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('✅ [PENDING-STREAM-PLAY] Pending stream now playing');
              })
              .catch(error => {
                console.warn('⚠️ [PENDING-STREAM-PLAY] Auto-play was prevented:', error.name);
                const playOnClick = async () => {
                  try {
                    await remoteVideoRef.current?.play();
                    console.log('✅ [PENDING-STREAM-PLAY] Playing after user interaction');
                    document.removeEventListener('click', playOnClick);
                  } catch (e) {
                    console.error('❌ [PENDING-STREAM-PLAY] Failed after interaction:', e);
                  }
                };
                document.addEventListener('click', playOnClick);
              });
          }
          
          console.log('✅ [PENDING-STREAM] Successfully assigned pending stream from peer:', peerId);
          setRemoteUserName('Remote User');
          pendingRemoteStreamRef.current = null;
        } catch (err) {
          console.error('❌ [PENDING-STREAM] Error assigning pending stream:', err);
        }
      }
      return;
    }
    
    // If ref not ready, schedule a retry after a delay
    if (pendingRemoteStreamRef.current && !remoteVideoRef.current) {
      console.log('⏳ [PENDING-STREAM] Ref not ready yet, scheduling retry in 100ms...');
      const timeout = setTimeout(() => {
        console.log('🔄 [PENDING-STREAM] Retrying pending stream assignment...');
        setPendingStreamCounter(c => c + 1);
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [pendingStreamCounter]);

  useEffect(() => {
    const initializeVideo = async () => {
      try {
        console.log('🎬 Initializing video in session page...');
        setVideoLoading(true);
        setVideoError(null);

        // 🎯 Setup debugging utilities FIRST (for all three checks)
        console.log('🔧 Setting up WebRTC debugging utilities...');
        const videoDebugger = setupVideoDebug(remoteVideoRef);

        // 🔌 CRITICAL: Connect socket IMMEDIATELY and wait for it
        console.log('🔌 Checking socket connection...');
        
        // If socket not already connected, connect it now with the stored token
        if (!socketService.isConnected()) {
          console.log('🔌 Socket not connected, connecting now...');
          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('No authentication token available');
          }
          // Connect socket - this returns a Promise we should wait on
          try {
            await socketService.connect(token);
            console.log('✅ Socket connected during init!');
          } catch (err) {
            console.error('❌ Socket connection failed during init', err);
            // Continue - may still connect with fallback transport
          }
        } else {
          console.log('✅ Socket already connected!');
        }
        
        // Wait for socket connection to establish
        try {
          await socketService.waitForConnection(20000); // Wait max 20 seconds
          console.log('✅ Socket definitively connected!');
        } catch (err) {
          console.error('❌ Socket connection timeout or failed', err);
          throw new Error('Failed to establish socket connection - video requires real-time communication');
        }

        // ⭐ CRITICAL FIX: Set WebRTC callbacks IMMEDIATELY before ANY async operations
        // If we wait for API calls, the mentor might join and send offer while we're fetching
        console.log('🔧 Setting up WebRTC callbacks (SYNCHRONOUS - FIRST!)...');
        webrtcService.setUserRole(currentUser?.role === 'admin' ? 'student' : currentUser?.role || 'student');
        console.log('✅ User role set to:', currentUser?.role === 'admin' ? 'student' : currentUser?.role || 'student');
        
        webrtcService.setOnLocalStream((stream: MediaStream) => {
          console.log('💾 Setting local stream to video element');
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        });
        console.log('✅ setOnLocalStream callback registered');

        webrtcService.setOnRemoteStream((stream: MediaStream, peerId: string) => {
          console.log('💾 [REMOTE STREAM RECEIVED] Got remote stream from peer:', peerId);
          webrtcDiagnostics.log('stream-received', 'Remote stream received from WebRTC', {
            streamId: stream.id,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            peerId,
          });
          
          // PREVENT DUPLICATE ASSIGNMENTS: Check if we've already assigned this stream
          if (assignedRemoteStreamIds.current.has(stream.id)) {
            console.log('⏭️ [STREAM-DUPLICATE] Stream already assigned, skipping:', stream.id);
            return;
          }
          
          // Assign immediately - ref should always be ready by now
          if (remoteVideoRef.current) {
            console.log('✅ [STREAM-ASSIGN] Assigning remote stream immediately');
            console.log('📊 [DEBUG] Stream tracks:', {
              streamId: stream.id,
              videoTracks: stream.getVideoTracks().length,
              audioTracks: stream.getAudioTracks().length,
              videoStatus: stream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })),
            });
            console.log('📊 [DEBUG] Video element:', {
              exists: !!remoteVideoRef.current,
              width: remoteVideoRef.current?.clientWidth,
              height: remoteVideoRef.current?.clientHeight,
              display: getComputedStyle(remoteVideoRef.current || document.body).getPropertyValue('display'),
              visibility: getComputedStyle(remoteVideoRef.current || document.body).getPropertyValue('visibility'),
            });
            
            try {
              remoteVideoRef.current.srcObject = stream;
              console.log('📝 [STREAM-ASSIGN] srcObject assigned to ref');
              
              // ONLY mark as assigned AFTER successful assignment
              assignedRemoteStreamIds.current.add(stream.id);
              
              // Force video to play - but handle the AbortError gracefully
              console.log('🎬 [STREAM-ASSIGN] About to call play()...');
              const playPromise = remoteVideoRef.current.play();
              console.log('📊 [STREAM-ASSIGN] play() returned successfully, attaching handlers...');
              
              playPromise
                .then(() => {
                  console.log('✅ [STREAM-PLAY] Video playing successfully');
                })
                .catch(error => {
                  console.warn('⚠️ [STREAM-PLAY] Auto-play was prevented:', error.name, error.message);
                  // Try again on user interaction
                  const playOnClick = async () => {
                    try {
                      await remoteVideoRef.current?.play();
                      console.log('✅ [STREAM-PLAY] Video playing after user interaction');
                      document.removeEventListener('click', playOnClick);
                    } catch (e) {
                      console.error('❌ [STREAM-PLAY] Failed to play even after interaction:', e);
                    }
                  };
                  document.addEventListener('click', playOnClick);
                });

              console.log('✅ [STREAM-ASSIGNED] Remote stream set to video element');
              setRemoteUserName('Remote User');
              webrtcDiagnostics.log('stream-assigned', 'Remote stream assigned immediately', { peerId });
            } catch (err) {
              console.error('❌ [STREAM-ASSIGN] Error assigning remote stream:', err);
              // Stream assignment failed - don't mark as assigned, so retry happens on next track
            }
          } else {
            console.warn('⏳ [STREAM-ASSIGN] Remote video ref not ready yet, storing as pending...');
            pendingRemoteStreamRef.current = { stream, peerId };
            setPendingStreamCounter(c => c + 1);
            // Don't mark as assigned - allow assignment when ref becomes ready
          }
        });
        console.log('✅ setOnRemoteStream callback registered');

        webrtcService.setOnScreenShare((stream: MediaStream, peerId: string) => {
          console.log('🖥️ [SCREEN-SHARE-CALLBACK] Received screen share stream:', {
            streamId: stream.id,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            peerId,
          });
          
          // Prevent duplicate assignments
          if (assignedScreenStreamIds.current.has(stream.id)) {
            console.log('⏭️ [SCREEN-DUPLICATE] Screen stream already assigned:', stream.id);
            return;
          }
          
          if (screenShareRef.current) {
            try {
              console.log('🖥️ [SCREEN-ASSIGN] Assigning screen stream to video element');
              screenShareRef.current.srcObject = stream;
              assignedScreenStreamIds.current.add(stream.id);
              
              // Play the screen
              const playPromise = screenShareRef.current.play();
              console.log('🎬 [SCREEN-ASSIGN] Calling play()...');
              
              playPromise
                .then(() => {
                  console.log('✅ [SCREEN-PLAY] Screen playing successfully');
                })
                .catch(error => {
                  console.warn('⚠️ [SCREEN-PLAY] Auto-play prevented:', error.name);
                  // Try on user interaction
                  const playOnClick = async () => {
                    try {
                      await screenShareRef.current?.play();
                      console.log('✅ [SCREEN-PLAY] Screen playing after user interaction');
                      document.removeEventListener('click', playOnClick);
                    } catch (e) {
                      console.error('❌ [SCREEN-PLAY] Failed after interaction:', e);
                    }
                  };
                  document.addEventListener('click', playOnClick);
                });
              
              console.log('✅ [SCREEN-ASSIGNED] Screen stream successfully assigned');
              setIsScreenSharingActive(true);
            } catch (err) {
              console.error('❌ [SCREEN-ASSIGN] Error assigning screen stream:', err);
            }
          } else {
            console.warn('⏳ [SCREEN-ASSIGN] screenShareRef not ready yet');
          }
        });
        console.log('✅ setOnScreenShare callback registered');

        webrtcService.setOnStreamEnded((peerId: string) => {
          console.log('🏁 Stream ended');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
            setRemoteUserName(null);
          }
        });
        console.log('✅ setOnStreamEnded callback registered');

        // NOW do async operations (after callbacks are ready)
        console.log('📋 Fetching session data...');
        const response = await apiClient.getSession(sessionId);
        const session = response?.data;
        
        if (!session) {
          throw new Error('Failed to fetch session data');
        }

        const remoteUserId = session.mentor_id === currentUser?.id ? session.student_id : session.mentor_id;
        
        if (!remoteUserId) {
          throw new Error('Could not find remote participant');
        }
        console.log('✅ Found remote user:', remoteUserId);

        // CRITICAL: Join the session room so we receive WebRTC events
        // This MUST happen immediately and reliably
        console.log('🚪 ========== JOINING SESSION ROOM (CRITICAL EVENT) ==========');
        console.log('📊 Pre-join socket status:', {
          isConnected: socketService.isConnected(),
          socketId: (socketService as any).socket?.id,
          hasSocket: !!((socketService as any).socket),
          currentSessionId: sessionId,
          currentUserId: currentUser?.id,
          currentUserName: currentUser?.name
        });
        
        const joinData = {
          sessionId,
          userId: currentUser?.id,
          userName: currentUser?.name || 'User',
        };
        
        console.log('📤 About to emit session:join event:', joinData);
        
        // CRITICAL: Force emit with multiple attempts if socket not connected
        let joinAttempts = 0;
        const maxJoinAttempts = 30;
        const attemptSessionJoin = () => {
          joinAttempts++;
          console.log(`📤 [JOIN-ATTEMPT ${joinAttempts}/${maxJoinAttempts}] Attempting to emit session:join...`);
          console.log(`   Socket connected: ${socketService.isConnected()}`);
          
          if (socketService.isConnected()) {
            console.log(`✅ [JOIN-SUCCESS] Socket connected! Emitting session:join on attempt ${joinAttempts}`);
            socketService.emit('session:join', joinData as any);
            console.log('✅ [JOIN-EMITTED] Session join event SENT');
            return; // Success
          } else if (joinAttempts < maxJoinAttempts) {
            console.log(`⏳ [JOIN-RETRY] Socket not ready, retrying in 100ms...`);
            setTimeout(attemptSessionJoin, 100);
          } else {
            console.error(`❌ [JOIN-FAILED] Failed to join session after ${maxJoinAttempts} attempts (${maxJoinAttempts * 100}ms)`);
          }
        };
        
        // Start the retry loop
        attemptSessionJoin();
        
        // Also verify status after a delay
        setTimeout(() => {
          console.log('📊 Post-join verification (after 500ms):', {
            isConnected: socketService.isConnected(),
            socketId: (socketService as any).socket?.id,
          });
        }, 500);
        console.log('🚪 ========== SESSION ROOM JOIN INITIATED ==========');

        // Start local video (this will setup socket listeners)
        console.log('📹 Starting local video...');
        const localStream = await webrtcService.startLocalVideo(sessionId, currentUser?.id || '');
        console.log('✅ Local video started');

        // Set initial local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        localStreamRef.current = localStream;
        setLocalStream(localStream);

        // Initiate WebRTC connection
        console.log('🔗 Checking if should initiate WebRTC connection...');
        console.log('👤 Current user role:', currentUser?.role);
        console.log('👤 Current user ID:', currentUser?.id);
        console.log('👤 Remote user ID:', remoteUserId);
        
        if (currentUser?.role === 'mentor') {
          console.log('🎓 Mentor detected - initiating WebRTC connection...');
          await webrtcService.initiateConnection(remoteUserId);
        } else {
          console.log('👨‍🎓 Student detected - waiting for mentor to initiate connection...');
          
          setTimeout(async () => {
            console.log('🔍 Checking if connection exists after delay...');
            
            const hasConnection = webrtcService.hasPeerConnection(remoteUserId);
            console.log('🔗 Has peer connection:', hasConnection);
            
            if (!hasConnection) {
              console.log('🔄 No connection found, requesting connection from mentor...');
              socketService.emit('video:connection-request', {
                sessionId,
                userId: currentUser?.id,
                targetUserId: remoteUserId
              } as any);
            }
          }, 2000);
        }

        setVideoLoading(false);
        console.log('✅ Video initialized in session page');
      } catch (err: any) {
        console.error('❌ Error initializing video:', err);
        setVideoError(err.message || 'Failed to initialize video');
        setVideoLoading(false);
      }
    };

    if (currentUser && sessionId) {
      initializeVideo();
    }
  }, [currentUser, sessionId]);

  // If the session is completed and the current user is the student who
  // hasn't reviewed it yet, prompt them with the post-session rating modal.
  const checkSessionCompletion = async (sessionData: any) => {
    const user = useAuthStore.getState().user;
    if (!sessionData || sessionData.status !== 'completed') return;
    if (!user || user.role !== 'student' || sessionData.student_id !== user.id) return;

    try {
      const ratingRes = await apiClient.getSessionRating(sessionId);
      if (!ratingRes.data) {
        const mentorRes = await apiClient.getUser(sessionData.mentor_id);
        setRatingMentorName(mentorRes.data?.name || 'your mentor');
        setRatingMentorAvatar(mentorRes.data?.avatar_url ?? undefined);
        setShowRatingModal(true);
      }
    } catch (err) {
      console.error('Error checking session rating:', err);
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const res = await apiClient.getSession(sessionId);
        if (res.data) {
          setSession(res.data as Session);
          setCurrentSession(res.data);
          checkSessionCompletion(res.data);
        }

        const messagesRes = await apiClient.getMessages(sessionId);
        if (messagesRes.data) {
          setMessages(messagesRes.data);
        }

        const codeRes = await apiClient.getCodeSnapshot(sessionId);
        if (codeRes.data) {
          setCode(codeRes.data.code);
          setLanguage(codeRes.data.language);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Setup socket events
  useEffect(() => {
    // Handler for code updates from other user
    const handleCodeUpdate = (data: any) => {
      console.log('📝 Code update received in frontend:', data);
      
      // Update code from other user
      if (data.code && data.language) {
        setCode(data.code);
        setLanguage(data.language);
        console.log('✅ Code updated from other user:', { 
          codeLength: data.code.length, 
          language: data.language,
          userId: data.userId 
        });
      }
    };

    // Handler for incoming messages - with deduplication
    const handleMessageReceive = (message: any) => {
      console.log('📨 Message received in frontend:', message);
      
      // Prevent duplicate messages by checking if message ID already exists
      // If it's a server message (not temp), check if we already have a temp version
      const existingMessages = useSessionStore.getState().messages;
      
      // Check if exact message already exists
      const exactMatch = existingMessages.find((m) => m.id === message.id);
      if (exactMatch) {
        console.log('⚠️ Duplicate message ignored:', message.id);
        return; // Already have this exact message
      }
      
      // Check if we have a temp message from same user with same content
      const tempMatch = existingMessages.find((m) =>
        m.id.startsWith('temp-') &&
        m.user_id === message.user_id &&
        m.content === message.content
      );
      
      if (tempMatch) {
        console.log('🔄 Replacing temp message with server message');
        // Replace temp message with real server message
        const updatedMessages = existingMessages.map(m =>
          m.id === tempMatch.id ? message : m
        );
        setMessages(updatedMessages);
      } else {
        console.log('➕ Adding new message');
        // Add new message
        addMessage(message);
      }
    };

    // Handler for code execution results from mentor or other users
    const handleExecutionResult = (result: any) => {
      const { setExecutionOutput } = useEditorStore.getState();
      console.log('Code execution result received:', result);
      
      if (result.status === 'Success') {
        setExecutionOutput(result.output || 'Code executed successfully (no output)');
      } else {
        setExecutionOutput(`${result.status}:\n${result.output || result.error || 'Unknown error'}`);
      }
    };

    // Handler for screen share started from remote user
    const handleScreenShareStarted = (data: any) => {
      console.log('🖥️ Remote screen share started:', data);
      
      // Only show screen share if it's from another user (not our own)
      if (data.userId !== currentUser?.id && data.sessionId === sessionId) {
        console.log('📺 Showing remote screen share from user:', data.userId);
        
        // The screen share will be received via WebRTC remote stream
        // We just need to show the screen share overlay
        // The actual video content will come through the remote video stream
        if (screenShareRef.current) {
          // Clear any existing content
          screenShareRef.current.style.background = '';
          screenShareRef.current.style.display = '';
          screenShareRef.current.innerHTML = '';
        }
        
        setIsScreenSharingActive(true);
        console.log('✅ Remote screen share overlay activated');
      }
    };

    // Handler for screen share stopped from remote user
    const handleScreenShareStopped = (data: any) => {
      console.log('🛑 Remote screen share stopped:', data);
      
      // Only clear if this is not our own screen share and matches current session
      if (data.userId !== currentUser?.id && data.sessionId === sessionId) {
        if (screenShareRef.current) {
          screenShareRef.current.style.background = '';
          screenShareRef.current.style.display = '';
          screenShareRef.current.innerHTML = '';
        }
        setIsScreenSharingActive(false);
      }
    };

    // Handler for the "session ended" notification - lets the student see the
    // rating modal in real time if the mentor ends the session first
    const handleSessionEndNotification = (notification: any) => {
      if (notification?.type === 'session_end' && notification?.data?.sessionId === sessionId) {
        apiClient.getSession(sessionId).then((res) => {
          if (res.data) {
            setSession(res.data as Session);
            checkSessionCompletion(res.data);
          }
        });
      }
    };

    // Register listeners FIRST before joining session
    socketService.on('code:update', handleCodeUpdate);
    socketService.on('message:receive', handleMessageReceive);
    socketService.on('code:execution:result', handleExecutionResult);
    socketService.on('screen:started', handleScreenShareStarted);
    socketService.on('screen:stopped', handleScreenShareStopped);
    socketService.on('notification:received', handleSessionEndNotification);

    // Wait for socket to connect, then join session
    const joinWithRetry = async () => {
      let attempts = 0;
      while (attempts < 10) {
        if (socketService.isConnected()) {
          console.log('✅ Socket connected, joining session:', sessionId);
          console.log('📊 Current user:', currentUser);
          socketService.joinSession(sessionId);
          break;
        }
        attempts++;
        console.log(`⏳ Attempt ${attempts}/10: Socket not connected, waiting 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (attempts >= 10) {
        console.warn('❌ Socket connection timeout - could not join session');
      }
    };

    joinWithRetry();

    // Store cleanup function
    listenerRef.current = {
      cleanup: () => {
        socketService.off('code:update', handleCodeUpdate);
        socketService.off('message:receive', handleMessageReceive);
        socketService.off('code:execution:result', handleExecutionResult);
        socketService.off('screen:started', handleScreenShareStarted);
        socketService.off('screen:stopped', handleScreenShareStopped);
        socketService.off('notification:received', handleSessionEndNotification);
      },
    };

    // Cleanup on unmount or sessionId change
    return () => {
      listenerRef.current?.cleanup();
      socketService.leaveSession(sessionId);
      // Stop all media streams on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [sessionId]);

  // Recording: respond to consent prompts/results from the other participant
  useEffect(() => {
    const handleConsentPrompt = ({ requesterName }: { requesterName: string }) => {
      setConsentRequesterName(requesterName);
      setShowConsentModal(true);
    };

    const handleConsentResult = ({ granted }: { granted: boolean }) => {
      setAwaitingConsent(false);
      if (granted) {
        startRecording(sessionId);
        showRecordingToast('🔴 Recording started');
      } else {
        showRecordingToast('Recording declined');
      }
    };

    const handleStoppedByPeer = () => {
      stopRecording();
      showRecordingToast('Recording stopped by other participant');
    };

    socketService.on('recording:consent-prompt', handleConsentPrompt);
    socketService.on('recording:consent-result', handleConsentResult);
    socketService.on('recording:stopped-by-peer', handleStoppedByPeer);

    return () => {
      socketService.off('recording:consent-prompt', handleConsentPrompt);
      socketService.off('recording:consent-result', handleConsentResult);
      socketService.off('recording:stopped-by-peer', handleStoppedByPeer);
    };
  }, [sessionId, startRecording, stopRecording, showRecordingToast]);

  // Revoke the recording object URL whenever it changes or the page unmounts
  useEffect(() => {
    return () => {
      revokeDownloadUrl();
    };
  }, [revokeDownloadUrl]);

  // Update video element when camera state changes
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (isCameraOn) {
        localVideoRef.current.srcObject = localStreamRef.current;
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [isCameraOn]);

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    console.log('📤 Sending message:', content);
    
    if (!socketService.isConnected()) {
      console.error('❌ Socket not connected');
      return;
    }

    // Get current user
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return;
    }

    // Create message with temporary ID (will be replaced by server)
    const tempMessage: any = {
      id: `temp-${Date.now()}`,
      user_id: currentUser.id,
      content,
      type: 'text',
      created_at: new Date().toISOString(),
      user: {
        name: currentUser.name,
        email: currentUser.email,
      },
      avatar_url: currentUser.avatar_url,
      role: currentUser.role,
      verified: currentUser.verified,
      updated_at: currentUser.updated_at,
    };

    // Add message immediately to UI
    addMessage(tempMessage);

    // Send message to server (deduplication will handle server response)
    console.log('📡 Calling socketService.sendMessage');
    socketService.sendMessage(content);
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    
    // Always update local state, regardless of socket connection
    setCode(value);
    
    // Try to send through socket if connected
    if (socketService.isConnected()) {
      socketService.sendCode(value, language, sessionId);
      console.log('📤 Code change sent via socket:', { 
        codeLength: value?.length, 
        language, 
        sessionId,
        socketConnected: true 
      });
    } else {
      console.warn('⚠️ Socket not connected - code saved locally only');
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (socketService.isConnected()) {
      socketService.emit('language:change', { sessionId, language: newLanguage } as any);
    }
  };

  const handleToggleCamera = async () => {
    const videoStore = useVideoStore.getState();
    
    if (!videoStore.isCameraOn) {
      // Enable camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        videoStore.toggleCamera();
        videoStore.setLocalStream(stream);
        setCameraError('');
        if (socketService.isConnected()) {
          socketService.toggleCamera();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Camera access denied';
        setCameraError(errorMsg);
        console.error('Camera error:', errorMsg);
      }
    } else {
      // Disable camera
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => track.stop());
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      videoStore.toggleCamera();
      videoStore.setLocalStream(null);
      setCameraError('');
      if (socketService.isConnected()) {
        socketService.toggleCamera();
      }
    }
  };

  const handleToggleMic = async () => {
    const videoStore = useVideoStore.getState();
    
    if (!videoStore.isMicOn) {
      // Enable mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: false
        });
        // Store mic stream separately or merge with video stream
        localStreamRef.current?.addTrack(stream.getAudioTracks()[0]);
        videoStore.toggleMic();
        setCameraError('');
        if (socketService.isConnected()) {
          socketService.toggleMic();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Mic access denied';
        setCameraError(errorMsg);
        console.error('Mic error:', errorMsg);
      }
    } else {
      // Disable mic
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.stop());
      }
      videoStore.toggleMic();
      setCameraError('');
      if (socketService.isConnected()) {
        socketService.toggleMic();
      }
    }
  };

  // Video control functions
  const handleToggleVideo = async () => {
    try {
      if (isVideoEnabled) {
        // Disable video
        if (localVideoRef.current?.srcObject) {
          const stream = localVideoRef.current.srcObject as MediaStream;
          stream.getVideoTracks().forEach(track => track.stop());
        }
        setIsVideoEnabled(false);
      } else {
        // Enable video
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: isAudioEnabled 
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsVideoEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  };

  const handleToggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleToggleScreenShare = async () => {
    console.log('🖥️ Toggle screen share, current state:', isScreenSharingActive);
    
    try {
      if (!isScreenSharingActive) {
        console.log('🎬 Requesting screen share permission...');
        
        // REQUEST SCREEN SHARE ONLY ONCE - get the stream with user gesture
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: false 
        });
        
        console.log('✅ Screen share stream obtained:', stream);
        
        // Set state to show overlay IMMEDIATELY (will be filled by onScreenShare callback)
        setIsScreenSharingActive(true);
        
        // PASS THE STREAM TO WEBRTC - Don't use local display
        // Both mentor and student will see screen through onScreenShare callback
        if (webrtcService) {
          console.log('🔄 Passing screen stream to WebRTC service');
          await webrtcService.startScreenShare(sessionId, currentUser?.id || '', stream);
          console.log('✅ Screen sharing started - mentor will receive screen through ontrack');
        }
        
        // Handle stream end (user clicks Stop Sharing in browser dialog)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            console.log('🛑 User stopped screen sharing via browser dialog');
            handleToggleScreenShare(); // Toggle back to stop mode
          };
        }
      } else {
        // Stop screen share
        console.log('🛑 Stopping screen share...');
        
        // Clear the screen share display
        if (screenShareRef.current?.srcObject) {
          const stream = screenShareRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            track.stop();
          });
          screenShareRef.current.srcObject = null;
        }
        
        setIsScreenSharingActive(false);
        
        // Clear assigned screen stream IDs on stop
        assignedScreenStreamIds.current.clear();
        
        // Stop WebRTC screen share
        if (webrtcService) {
          await webrtcService.stopScreenShare();
        }
        
        // Notify other users
        socketService.emit('screen:stopped', {
          sessionId,
          userId: currentUser?.id,
        } as any);
      }
    } catch (err: any) {
      console.error('Error toggling screen share:', err);
      // Reset state on error
      setIsScreenSharingActive(false);
    }
  };

  const handleRequestRecording = () => {
    setAwaitingConsent(true);
    socketService.emit('recording:request', {
      sessionId,
      requesterName: currentUser?.name || 'User',
    });
  };

  const handleConsentGranted = () => {
    setShowConsentModal(false);
    socketService.emit('recording:consent', { sessionId, granted: true });
  };

  const handleConsentDeclined = () => {
    setShowConsentModal(false);
    socketService.emit('recording:consent', { sessionId, granted: false });
  };

  const handleStopRecording = () => {
    stopRecording();
    socketService.emit('recording:stop', { sessionId });
  };

  const handleEndSession = async () => {
    try {
      await apiClient.endSession(sessionId);
      socketService.endSession(sessionId, session?.mentor_id, session?.student_id);
      // Navigate back to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  const getJudge0LanguageId = (lang: string): { langId: number; requiresMain: boolean } => {
    const mapping: { [key: string]: { id: number; main: boolean } } = {
      javascript: { id: 63, main: false },
      python: { id: 71, main: false },
      java: { id: 62, main: true },
      cpp: { id: 54, main: false },
      typescript: { id: 63, main: false },
    };
    const result = mapping[lang] || mapping.javascript;
    return { langId: result.id, requiresMain: result.main };
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    const { setExecutionOutput, setIsExecuting } = useEditorStore.getState();
    setIsExecuting(true);
    setExecutionOutput('Executing code...');

    try {
      // Call backend endpoint for code execution with sessionId
      const response = await apiClient.executeCode(code, language, sessionId);

      if (response?.data?.output) {
        setExecutionOutput(response.data.output);
      } else {
        setExecutionOutput('Code executed successfully (no output)');
      }

      console.log('Execution result:', response);
    } catch (err: any) {
      console.error('Error executing code:', err);
      const errorMsg = err?.response?.data?.message || 
                       err?.response?.data?.error ||
                       err?.message || 
                       'Failed to execute code. Make sure your backend is running.';
      setExecutionOutput(`Error: ${errorMsg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const getFileExtension = (lang: string): string => {
    const extensions: { [key: string]: string } = {
      javascript: 'js',
      python: 'py',
      typescript: 'ts',
      java: 'java',
      cpp: 'cpp',
    };
    return extensions[lang] || 'txt';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-primary-500 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex flex-col text-gray-900 dark:text-white">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{session?.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{session?.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge color="purple">{session?.status}</Badge>
            {isRecording && <RecordingIndicator onStop={handleStopRecording} />}
            <GlowingButton
              variant="outline"
              className="text-sm bg-white dark:bg-transparent"
              onClick={handleEndSession}
            >
              End Session
            </GlowingButton>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-3 gap-2 md:gap-3 lg:gap-4 p-2 md:p-3 lg:p-4 overflow-y-auto lg:overflow-hidden">
        {/* Code Editor - Takes full height on mobile, 2/3 on large screens */}
        <div className="lg:col-span-2 flex flex-col bg-white dark:bg-dark-900/40 rounded-lg border border-gray-200 dark:border-gray-700/30 overflow-hidden min-h-[40vh] lg:min-h-0">
          <div className="px-2 md:px-4 py-2 md:py-3 border-b border-gray-200 dark:border-gray-700/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLeftPanelTab('code')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  leftPanelTab === 'code'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Code Editor
              </button>
              <button
                onClick={() => setLeftPanelTab('whiteboard')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  leftPanelTab === 'whiteboard'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🖊️ Whiteboard
              </button>
            </div>
            {leftPanelTab === 'code' && (
              <div className="flex items-center gap-1 md:gap-2 w-full md:w-auto">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-2 md:px-3 py-1 bg-white dark:bg-dark-800 border border-gray-300 dark:border-gray-700/50 rounded text-xs md:text-sm text-gray-900 dark:text-white flex-1 md:flex-none"
                >
                  <option value="javascript" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">JavaScript</option>
                  <option value="python" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Python</option>
                  <option value="typescript" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">TypeScript</option>
                  <option value="java" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Java</option>
                  <option value="cpp" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">C++</option>
                </select>
                <GlowingButton
                  variant="secondary"
                  className="text-xs md:text-sm flex-1 md:flex-none"
                  onClick={handleRunCode}
                >
                  ▶ Run
                </GlowingButton>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {/*
              Both panels stay mounted (toggled via CSS display) so the Yjs
              connection and whiteboard canvas strokes survive tab switches
              instead of being torn down and reset.
            */}
            <div style={{ display: leftPanelTab === 'code' ? 'block' : 'none', height: '100%' }}>
              {/*
                CollaborativeEditor with CRDT (Yjs)
                - Real-time code sync using Operational Transformation
                - Multiple users can edit simultaneously without conflicts
                - Automatic conflict resolution at character level
                - Preserves cursor positions for remote users
              */}
              <CollaborativeEditor
                sessionId={sessionId}
                userId={currentUser?.id || 'unknown'}
                userName={currentUser?.name}
                userEmail={currentUser?.email}
                initialCode={code}
                language={language}
                theme="vs-dark"
                onCodeChange={handleCodeChange}
                height="100%"
                wsUrl={process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234'}
              />
            </div>
            <Whiteboard sessionId={sessionId} active={leftPanelTab === 'whiteboard'} />
          </div>
        </div>

        {/* Right Panel - Video + Chat */}
        <div className="flex flex-col gap-2 md:gap-3 lg:gap-4 lg:min-h-0 lg:overflow-hidden lg:col-span-1">
          {/* Video Panel - Integrated in session page */}
          <GlowingCard glow="purple" className="flex-shrink-0 h-64 md:h-80 lg:h-96 flex flex-col">
            <h3 className="font-bold text-gray-900 dark:text-white text-xs md:text-base mb-1 md:mb-3 px-2 md:px-4 pt-2 md:pt-4 flex-shrink-0">Video Call</h3>
            <div className="flex-1 min-h-0 bg-black rounded overflow-hidden relative">
              {/* 🔴 CRITICAL FIX: Video elements absolutely positioned and fill container */}
              {/* IMPORTANT: Must use absolute inset-0 (NOT flex-1) to properly fill the parent */}
              <div className="absolute inset-0 flex flex-col lg:grid lg:grid-cols-2 gap-2 p-2">
                {/* Local Video - Always rendered */}
                <div className="flex-1 lg:h-full relative bg-gray-900 rounded overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 z-10 bg-black/70 px-2 py-1 rounded text-white text-xs">
                    You
                  </div>
                </div>
                
                {/* Remote Video - Always rendered */}
                <div className="flex-1 lg:h-full relative bg-gray-900 rounded overflow-hidden">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Waiting message - only show if no remote stream yet */}
                  {!remoteUserName && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                      <div className="text-center">
                        <div className="animate-pulse mb-2">👥</div>
                        <p className="text-gray-400 text-xs">Waiting for remote user...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* User label - only show if remote stream exists */}
                  {remoteUserName && (
                    <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-xs">
                      {remoteUserName}
                    </div>
                  )}
                </div>
              </div>

              {/* Overlays appear on top of video elements */}
              {videoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-white mx-auto mb-2"></div>
                    <p className="text-gray-400 text-xs md:text-sm">Connecting video...</p>
                  </div>
                </div>
              )}

              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center h-full bg-black/80 z-20">
                  <div className="text-center">
                    <p className="text-red-400 text-xs md:text-sm mb-2">❌ {videoError}</p>
                    <GlowingButton 
                      variant="secondary" 
                      className="text-xs"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </GlowingButton>
                  </div>
                </div>
              )}
              
              {/* Screen Share Overlay */}
              {(isScreenSharingActive || screenShareRef.current?.srcObject) && (
                <div className="absolute inset-0 bg-black z-10 flex items-center justify-center">
                  <video
                    ref={screenShareRef}
                    autoPlay
                    playsInline
                    muted={false}
                    controls={false}
                    className="w-full h-full object-contain"
                    style={{
                      WebkitUserSelect: 'none',
                      userSelect: 'none'
                    }}
                  />
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                    <span className="animate-pulse">●</span> Sharing Screen
                  </div>
                </div>
              )}
            </div>
            
            {/* Video Controls */}
            <div className="w-full px-2 md:px-4 py-2 md:py-3 border-t border-gray-200 dark:border-gray-700/30 gap-1 md:gap-2 flex flex-wrap flex-shrink-0 bg-gray-100 dark:bg-dark-950/80">
              <GlowingButton 
                variant="secondary" 
                className="text-xs flex-1 py-1 md:py-2 min-w-[60px]"
                onClick={handleToggleVideo}
              >
                {isVideoEnabled ? '📹' : '📹❌'} Video
              </GlowingButton>
              <GlowingButton 
                variant="secondary" 
                className="text-xs flex-1 py-1 md:py-2 min-w-[60px]"
                onClick={handleToggleAudio}
              >
                {isAudioEnabled ? '🎤' : '🔇'} Audio
              </GlowingButton>
              <GlowingButton
                variant="secondary"
                className="text-xs flex-1 py-1 md:py-2 min-w-[100px]"
                onClick={handleToggleScreenShare}
              >
                {isScreenSharingActive ? '🛑 Stop' : '🖥️ Share'}
              </GlowingButton>
              {recordingState === 'idle' && !awaitingConsent && (
                <GlowingButton
                  variant="secondary"
                  className="text-xs flex-1 py-1 md:py-2 min-w-[80px] bg-red-500/20 hover:bg-red-500/30"
                  onClick={handleRequestRecording}
                >
                  🔴 Record
                </GlowingButton>
              )}
              {awaitingConsent && (
                <GlowingButton
                  variant="secondary"
                  disabled
                  className="text-xs flex-1 py-1 md:py-2 min-w-[80px] opacity-70 cursor-wait"
                >
                  ⏳ Waiting...
                </GlowingButton>
              )}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={downloadFilename}
                  className="flex items-center justify-center text-xs flex-1 py-1 md:py-2 min-w-[80px] px-6 rounded-lg font-semibold transition-all duration-300 bg-gradient-to-r from-secondary-600 to-secondary-500 text-white hover:shadow-glow-green hover:from-secondary-500 hover:to-secondary-400 dark:from-secondary-600 dark:to-secondary-500"
                >
                  ⬇️ Download
                </a>
              )}
              <GlowingButton
                variant="secondary"
                className="text-xs flex-1 py-1 md:py-2 min-w-[60px] bg-yellow-500/20 hover:bg-yellow-500/30"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                🔧 Debug
              </GlowingButton>
            </div>

            {/* Debug Info Panel - MODAL OVERLAY (not taking up vertical space) */}
            {showDebugInfo && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-dark-900 border border-yellow-700/50 rounded-lg p-4 max-w-md max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-yellow-300 font-bold text-sm">📊 VIDEO DEBUG INFO</h4>
                    <button
                      onClick={() => setShowDebugInfo(false)}
                      className="text-yellow-300 hover:text-yellow-400 text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-2 font-mono text-yellow-200 text-xs">
                    <div className="bg-black/40 p-2 rounded space-y-1">
                      <p><span className="text-gray-400">DOM Check:</span></p>
                      <p>  ✓ Ref exists: {remoteVideoRef.current ? 'YES' : 'NO'}</p>
                      <p>  ✓ In DOM: {remoteVideoRef.current && document.body.contains(remoteVideoRef.current) ? 'YES' : 'NO'}</p>
                      <p>  ✓ Dimensions: {remoteVideoRef.current?.clientWidth || 0}x{remoteVideoRef.current?.clientHeight || 0}px</p>
                    </div>

                    <div className="bg-black/40 p-2 rounded space-y-1">
                      <p><span className="text-gray-400">Stream Check:</span></p>
                      <p>  ✓ Has srcObject: {remoteVideoRef.current?.srcObject ? 'YES' : 'NO'}</p>
                      {remoteVideoRef.current?.srcObject instanceof MediaStream && (
                        <>
                          <p>  ✓ Tracks: {(remoteVideoRef.current.srcObject as MediaStream).getTracks().length}</p>
                          <p>  ✓ Video tracks: {(remoteVideoRef.current.srcObject as MediaStream).getVideoTracks().length}</p>
                        </>
                      )}
                      <p>  ✓ Paused: {remoteVideoRef.current?.paused ? 'YES' : 'NO'}</p>
                      <p>  ✓ Volume: {(remoteVideoRef.current?.volume || 0).toFixed(2)}</p>
                    </div>

                    <div className="bg-black/40 p-2 rounded space-y-1">
                      <p><span className="text-gray-400">Playback Policy:</span></p>
                      <p>  ✓ autoplay attr: {remoteVideoRef.current?.autoplay ? 'YES' : 'NO'}</p>
                      <p>  ✓ playsinline: {remoteVideoRef.current?.hasAttribute('playsinline') ? 'YES' : 'NO'}</p>
                      <p>  ✓ muted: {remoteVideoRef.current?.muted ? 'YES' : 'NO'}</p>
                      <p>  ✓ visible: {remoteVideoRef.current && window.getComputedStyle(remoteVideoRef.current).display !== 'none' ? 'YES' : 'NO'}</p>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-700/50 p-2 rounded mt-2">
                      <p className="text-blue-300 mb-1">🔍 <strong>BROWSER CONSOLE COMMANDS:</strong></p>
                      <p className="text-blue-200 text-xs">window.videoDebug.checkDOM() - DOM checks</p>
                      <p className="text-blue-200 text-xs">window.videoDebug.checkStream() - Stream checks</p>
                      <p className="text-blue-200 text-xs">window.videoDebug.checkPolicy() - Policy checks</p>
                      <p className="text-blue-200 text-xs">window.videoDebug.report() - Full report</p>
                      <p className="text-blue-200 text-xs">window.videoDebug.play() - Force play</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </GlowingCard>

          {/* Chat Panel */}
          <GlowingCard glow="green" className="flex-1 min-h-[120px] md:min-h-0 flex flex-col overflow-hidden">
            <h3 className="font-bold text-gray-900 dark:text-white text-xs md:text-base mb-1 md:mb-3 px-2 md:px-4 pt-2 md:pt-4 flex-shrink-0">Chat</h3>
            <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-4 space-y-2 md:space-y-3 text-xs md:text-sm">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <Avatar name={msg.user?.name || 'User'} size="sm" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-xs">{msg.user?.name}</p>
                    <p className="text-gray-700 dark:text-gray-300 break-words text-xs md:text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>
            <div className="px-2 md:px-4 py-2 md:py-3 border-t border-gray-200 dark:border-gray-700/30 flex-shrink-0">
              <input
                type="text"
                placeholder="Send a message..."
                className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-gray-700/50 rounded text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all duration-200"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                    handleSendMessage((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </GlowingCard>
        </div>
      </div>

      {/* Code Execution Output - Compact fixed size at bottom */}
      {executionOutput && (
        <div className="border-t border-gray-200 dark:border-gray-700/30 bg-gray-50 dark:bg-dark-900/40 p-2 md:p-3 lg:p-4 max-h-[120px] md:max-h-[140px] lg:h-24 overflow-y-auto flex-shrink-0">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Output:</p>
          <pre className="text-xs md:text-sm text-green-700 dark:text-green-400 font-mono whitespace-pre-wrap break-words">{executionOutput}</pre>
        </div>
      )}

      {/* Post-session rating prompt (student view only) */}
      <PostSessionFeedbackModal
        isOpen={showRatingModal}
        sessionId={sessionId}
        mentorName={ratingMentorName}
        mentorAvatar={ratingMentorAvatar}
        onClose={() => setShowRatingModal(false)}
      />

      {/* Recording consent prompt - shown to the participant who received the request */}
      {showConsentModal && (
        <RecordingConsentModal
          requesterName={consentRequesterName}
          onConsent={handleConsentGranted}
          onDecline={handleConsentDeclined}
        />
      )}

      {/* Recording status toasts */}
      {recordingToasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {recordingToasts.map((t) => (
            <RecordingToast
              key={t.id}
              message={t.message}
              onDismiss={() => setRecordingToasts((prev) => prev.filter((x) => x.id !== t.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
