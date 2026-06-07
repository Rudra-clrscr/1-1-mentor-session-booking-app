'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Session } from '@/types';
import {
  GlowingButton,
  GlowingCard,
  Avatar,
  Badge,
  LoadingSpinner,
} from '@/components/ui/GlowingComponents';

export default function SessionHistoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch user's session history from API
    // For now, use mock data
    const mockSessions: Session[] = [];
    setSessions(mockSessions);
    setLoading(false);
  }, [user?.id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Session History</h1>
          <Link href="/dashboard">
            <GlowingButton variant="outline" className="text-sm">
              Back
            </GlowingButton>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {sessions.length === 0 ? (
          <GlowingCard glow="yellow" className="text-center py-12">
            <p className="text-yellow-600 dark:text-yellow-400 text-lg mb-4">No sessions yet</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {user?.role === 'mentor'
                ? 'Create a session to get started'
                : 'Browse available sessions to join'}
            </p>
            <Link href={user?.role === 'mentor' ? '/session/create' : '/browse'}>
              <GlowingButton className="inline-block">
                {user?.role === 'mentor' ? 'Create Session' : 'Browse Sessions'}
              </GlowingButton>
            </Link>
          </GlowingCard>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                className="cursor-pointer"
              >
              <GlowingCard
                glow="purple"
                className="p-4 md:p-6 hover:shadow-glow-purple transition-all"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{session.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{session.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge color={session.status === 'completed' ? 'green' : 'purple'}>
                        {session.status}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/session/${session.id}`}>
                      <GlowingButton variant="secondary" className="text-sm py-2">
                        View
                      </GlowingButton>
                    </Link>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === session.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/30 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Language</p>
                        <p className="text-gray-900 dark:text-white font-medium">{session.code_language}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Duration</p>
                        <p className="text-gray-900 dark:text-white font-medium">{session.duration_minutes} min</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Topic</p>
                        <p className="text-gray-900 dark:text-white font-medium">{session.topic || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Participants</p>
                        <p className="text-gray-900 dark:text-white font-medium">2</p>
                      </div>
                    </div>

                    {session.status === 'completed' && (
                      <div className="bg-gray-100/50 dark:bg-dark-800/30 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/20">
                        <p className="text-gray-900 dark:text-white font-medium mb-2">Feedback</p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {/* TODO: Show feedback if available */}
                          No feedback yet
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </GlowingCard>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
