import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database (Neon PostgreSQL)
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432'),
  DB_NAME: process.env.DB_NAME || 'mentor_db',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_SSL: process.env.DB_SSL ? process.env.DB_SSL === 'true' : !(process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'))),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

  // CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  CLIENT_URLS: (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim()),

  // WebRTC
  STUN_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],

  // Features
  ENABLE_SCREEN_SHARING: process.env.ENABLE_SCREEN_SHARING !== 'false',
  ENABLE_RECORDING: process.env.ENABLE_RECORDING === 'true',
  MAX_SESSION_DURATION: parseInt(process.env.MAX_SESSION_DURATION || '3600000'), // 1 hour
};

export type Config = typeof config;
