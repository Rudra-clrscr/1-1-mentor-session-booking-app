'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { Session, User } from '@/types';
import {
  GlowingButton,
  GlowingCard,
  Badge,
  Avatar,
  LoadingSpinner,
} from '@/components/ui/GlowingComponents';

export default function JoinSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [mentor, setMentor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const sessionRes = await apiClient.getSession(sessionId);
        if (sessionRes.data) {
          setSession(sessionRes.data);

          // Fetch mentor info
          try {
            const mentorRes = await apiClient.getUser(sessionRes.data.mentor_id);
            if (mentorRes.data) {
              setMentor(mentorRes.data);
            }
          } catch (err) {
            console.warn('Could not fetch mentor info:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  const handleJoinSession = async () => {
    if (!session || user?.role !== 'student') {
      setError('Only students can join sessions');
      return;
    }

    setJoining(true);
    setError('');
    try {
      const res = await apiClient.joinSession(sessionId);
      if (res.data) {
        // Redirect to active session
        router.push(`/session/${sessionId}`);
      }
    } catch (err: any) {
      console.error('Error joining session:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to join session';
      setError(errorMsg);
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
        <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/browse">
              <GlowingButton variant="outline" className="bg-white dark:bg-transparent">Back to Browse</GlowingButton>
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <GlowingCard glow="yellow" className="text-center py-12">
            <p className="text-yellow-600 dark:text-yellow-400 text-lg">{error}</p>
          </GlowingCard>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
        <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/browse">
              <GlowingButton variant="outline" className="bg-white dark:bg-transparent">Back to Browse</GlowingButton>
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <GlowingCard glow="blue" className="text-center py-12">
            <p className="text-gray-655 dark:text-gray-400 text-lg">Session not found</p>
          </GlowingCard>
        </main>
      </div>
    );
  }

  const canJoin = user?.role === 'student' && session.status === 'scheduled' && !session.student_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold gradient-text">Join Session</h1>
          <Link href="/browse">
            <GlowingButton variant="outline" className="bg-white dark:bg-transparent">Back to Browse</GlowingButton>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Details */}
        <GlowingCard glow="purple" className="mb-8">
          <div className="mb-6">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{session.title}</h2>
                <p className="text-gray-655 dark:text-gray-400 mt-2">{session.description}</p>
              </div>
              <Badge
                color={
                  session.status === 'scheduled'
                    ? 'green'
                    : session.status === 'in_progress'
                      ? 'yellow'
                      : 'purple'
                }
              >
                {session.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700/30">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Language</p>
              <Badge color="purple">{session.code_language}</Badge>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Duration</p>
              <p className="text-gray-900 dark:text-white font-semibold">{session.duration_minutes} mins</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Topic</p>
              <p className="text-gray-900 dark:text-white font-semibold">{session.topic || 'General'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Status</p>
              <p className="text-gray-900 dark:text-white font-semibold capitalize">{session.status}</p>
            </div>
          </div>

          {/* Mentor Info */}
          {mentor && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Mentor</h3>
              <GlowingCard glow="yellow" className="bg-gray-50 dark:bg-dark-700/50 border border-gray-200 dark:border-transparent">
                <div className="flex items-center gap-4">
                  <Avatar name={mentor.name} size="lg" />
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{mentor.name}</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{mentor.bio || 'No bio provided'}</p>
                  </div>
                </div>
              </GlowingCard>
            </div>
          )}
        </GlowingCard>

        {/* Important Notice */}
        <GlowingCard glow="yellow" className="mb-8">
          <div className="flex gap-4">
            <div className="text-2xl font-bold">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Before You Join</h3>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1 text-sm list-none pl-0">
                <li>✓ Make sure your webcam and microphone are working</li>
                <li>✓ Join from a quiet place with good internet connection</li>
                <li>✓ Once you join, the session will start immediately</li>
                <li>✓ You'll be able to see real-time code editing and chat</li>
              </ul>
            </div>
          </div>
        </GlowingCard>

        {/* Error Alert */}
        {error && (
          <GlowingCard glow="yellow" className="mb-8">
            <p className="text-yellow-600 dark:text-yellow-400">{error}</p>
          </GlowingCard>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link href="/browse" className="flex-1">
            <GlowingButton variant="outline" className="w-full">
              Cancel
            </GlowingButton>
          </Link>

          <button
            onClick={handleJoinSession}
            disabled={!canJoin || joining}
            className="flex-1"
          >
            <GlowingButton
              variant="primary"
              className="w-full"
              disabled={!canJoin || joining}
            >
              {joining ? 'Joining...' : canJoin ? '✓ Join Session' : 'Cannot Join'}
            </GlowingButton>
          </button>
        </div>

        {/* Status Message */}
        {!canJoin && (
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-300 text-sm text-center">
            {session.status !== 'scheduled'
              ? 'This session is no longer available to join'
              : session.student_id
                ? 'This session already has a student joined'
                : 'Please log in as a student to join sessions'}
          </div>
        )}
      </main>
    </div>
  );
}
