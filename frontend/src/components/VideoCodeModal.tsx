'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { GlowingButton, GlowingCard } from './ui/GlowingComponents';

interface VideoCodeModalProps {
  sessionId: string;
  isStudent: boolean;
  code?: string;
  onCodeVerified: () => void;
  onCancel: () => void;
}

export function VideoCodeModal({
  sessionId,
  isStudent,
  code,
  onCodeVerified,
  onCancel,
}: VideoCodeModalProps) {
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Listen for code verification event from other user
  useEffect(() => {
    const handleCodeVerified = () => {
      console.log('📡 Received video:code-verified event from socket');
      onCodeVerified();
    };

    socketService.on('video:code-verified', handleCodeVerified);

    return () => {
      socketService.off('video:code-verified', handleCodeVerified);
    };
  }, [onCodeVerified]);

  const handleVerifyCode = async () => {
    if (inputCode.length !== 4) {
      setError('Code must be 4 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.verifyVideoCode(sessionId, inputCode);
      onCodeVerified();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify code';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <GlowingCard glow="purple" className="w-full max-w-sm p-8">
        {isStudent && code ? (
          // Student side - show code
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Video Conference Code</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Share this code with your mentor</p>

            <div className="bg-gray-100 dark:bg-dark-800 border-2 border-purple-500/50 rounded-lg p-6 mb-6">
              <div className="text-5xl font-bold text-purple-400 tracking-widest font-mono">
                {code}
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-dark-800 border border-purple-500/50 rounded-lg text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-dark-700 transition mb-4"
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>

            <p className="text-gray-500 text-sm mb-6">Code expires in 10 minutes</p>

            <GlowingButton variant="secondary" onClick={onCancel} className="w-full">
              Cancel
            </GlowingButton>
          </div>
        ) : (
          // Mentor side - input code
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Enter Video Conference Code</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Ask the student for the 4-digit code</p>

            <input
              type="text"
              placeholder="Enter 4-digit code"
              value={inputCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setInputCode(val);
                setError(null);
              }}
              maxLength={4}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-800 border border-purple-500/50 rounded-lg text-center text-3xl font-mono text-gray-900 dark:text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 mb-4"
            />

            {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

            <GlowingButton
              onClick={handleVerifyCode}
              disabled={loading || inputCode.length !== 4}
              className="w-full mb-3"
            >
              {loading ? 'Verifying...' : 'Connect'}
            </GlowingButton>

            <GlowingButton variant="secondary" onClick={onCancel} className="w-full">
              Cancel
            </GlowingButton>
          </div>
        )}
      </GlowingCard>
    </div>
  );
}
