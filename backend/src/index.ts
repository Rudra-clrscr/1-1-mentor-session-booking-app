import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { healthCheck } from './database';
import authRoutes from './routes/auth';
import sessionRoutes, { setSocketIO as setSessionSocketIO } from './routes/sessions';
import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import codeRoutes, { setSocketIO as setCodeSocketIO } from './routes/code';
import profileRoutes from './routes/profile';
import ratingsRoutes from './routes/ratings';
import sessionHistoryRoutes from './routes/sessionHistory';
import notificationsRoutes, { setSocketIO as setNotificationSocketIO } from './routes/notifications';
import availabilityRoutes from './routes/availability';
import paymentRoutes from './routes/payments';
import recordingRoutes from './routes/recordings';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import uploadRoutes from './routes/upload';
import path from 'path';
import { setupSocketHandlers } from './socket/handlers';
import { setupRealtimeHandlers } from './socket/realtimeHandlers';
import { startReminderService, setSocketIO as setReminderSocketIO } from './services/reminderService';

const app: Express = express();
const httpServer = createServer(app);

// Socket.io setup
const allowedOrigins = new Set<string>([...config.CLIENT_URLS, config.CLIENT_URL]);
console.log('🔌 Socket.IO allowed origins:', Array.from(allowedOrigins));

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      console.log('📍 Socket.IO incoming origin:', origin);
      if (!origin || allowedOrigins.has(origin)) {
        console.log('✅ Origin accepted:', origin);
        callback(null, true);
      } else {
        console.error('❌ Origin rejected:', origin);
        console.error('📊 Allowed origins were:', Array.from(allowedOrigins));
        callback(new Error(`CORS policy violation: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Set Socket.io instance for routes that need it
setSessionSocketIO(io);
setCodeSocketIO(io);
setReminderSocketIO(io);
setNotificationSocketIO(io);

// Socket.IO authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log('🔐 Socket auth attempt for client:', socket.id);
    
    if (!token) {
      console.warn('🔴 Socket connection attempt without token');
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    socket.data.userId = decoded.id;
    socket.data.user = decoded;
    
    console.log(`✅ Socket authenticated for user: ${decoded.id} (socket: ${socket.id})`);
    next();
  } catch (err: any) {
    console.error('🔴 Socket authentication error:', err.message);
    next(new Error(`Authentication failed: ${err.message}`));
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/sessions/history', sessionHistoryRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const dbHealthy = await healthCheck();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Socket.io handlers
setupSocketHandlers(io);
setupRealtimeHandlers(io);

// Start server
const PORT = config.PORT;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Client URL: ${config.CLIENT_URL}`);

  // Start session reminder cron
  startReminderService();
});

export { app, httpServer, io };
