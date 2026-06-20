'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { Session } from '@/types';
import {
  GlowingButton,
  GlowingCard,
  Badge,
  LoadingSpinner,
} from '@/components/ui/GlowingComponents';

// Extended session type returned by /sessions/history/user/history
type SessionWithDetails = Session & {
  // Joined fields from the backend query
  mentor_name?: string;
  mentor_avatar?: string;
  student_name?: string;
  student_avatar?: string;
  avg_rating?: number;
  // Nested objects attached by the backend
  rating?: {
    id: string;
    rating: number;
    review?: string;
  } | null;
  feedback?: {
    id: string;
    feedback?: string;
    difficulty_level?: string;
    would_recommend?: boolean;
  } | null;
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= value ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">({value}/5)</span>
    </div>
  );
}

export default function SessionHistoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.getSessionHistory();
        // The backend wraps the array in { success: true, data: [...] }
        const data = (response as any)?.data ?? (response as any);
        setSessions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Error fetching session history:', err);
        setError('Failed to load session history. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
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
        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {sessions.length === 0 && !error ? (
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
            {sessions.map((session) => {
              const isExpanded = expandedId === session.id;
              const otherPartyName =
                user?.role === 'mentor' ? session.student_name : session.mentor_name;

              return (
                <div
                  key={session.id}
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="cursor-pointer"
                >
                  <GlowingCard
                    glow="purple"
                    className="p-4 md:p-6 hover:shadow-glow-purple transition-all"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                          {session.title}
                        </h3>
                        {session.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                            {session.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge color={session.status === 'completed' ? 'green' : 'purple'}>
                            {session.status}
                          </Badge>
                          {otherPartyName && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {user?.role === 'mentor' ? 'Student:' : 'Mentor:'}{' '}
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {otherPartyName}
                              </span>
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {session.scheduled_at
                              ? new Date(session.scheduled_at).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : new Date(session.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/session/${session.id}`}>
                          <GlowingButton variant="secondary" className="text-sm py-2">
                            View
                          </GlowingButton>
                        </Link>
                        {session.status === 'completed' && session.recording_enabled && (
                          <Link href={`/sessions/history/${session.id}/recording`}>
                            <GlowingButton variant="outline" className="text-sm py-2">
                              ▶ Code Playback
                            </GlowingButton>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/30 space-y-4">
                        {/* Session metadata grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Language</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {session.code_language || session.language}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Duration</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {session.duration_minutes ?? 60} min
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Topic</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {session.topic || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Participants</p>
                            <p className="text-gray-900 dark:text-white font-medium">2</p>
                          </div>
                        </div>

                        {/* Rating & Feedback (completed sessions only) */}
                        {session.status === 'completed' && (
                          <div className="bg-gray-100/50 dark:bg-dark-800/30 p-4 rounded-lg border border-gray-200/50 dark:border-gray-700/20 space-y-3">
                            {/* Rating */}
                            <div>
                              <p className="text-gray-900 dark:text-white font-medium mb-1">Rating</p>
                              {session.rating ? (
                                <div className="space-y-1">
                                  <StarRating value={session.rating.rating} />
                                  {session.rating.review && (
                                    <p className="text-gray-700 dark:text-gray-300 text-sm italic">
                                      &ldquo;{session.rating.review}&rdquo;
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No rating yet</p>
                              )}
                            </div>

                            {/* Feedback */}
                            <div>
                              <p className="text-gray-900 dark:text-white font-medium mb-1">Feedback</p>
                              {session.feedback ? (
                                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {session.feedback.feedback && (
                                    <p>&ldquo;{session.feedback.feedback}&rdquo;</p>
                                  )}
                                  {session.feedback.difficulty_level && (
                                    <p className="text-gray-500 dark:text-gray-400">
                                      Difficulty: {session.feedback.difficulty_level}
                                    </p>
                                  )}
                                  {session.feedback.would_recommend !== undefined &&
                                    session.feedback.would_recommend !== null && (
                                      <p className="text-gray-500 dark:text-gray-400">
                                        Would recommend:{' '}
                                        <span
                                          className={
                                            session.feedback.would_recommend
                                              ? 'text-green-500'
                                              : 'text-red-400'
                                          }
                                        >
                                          {session.feedback.would_recommend ? 'Yes' : 'No'}
                                        </span>
                                      </p>
                                    )}
                                </div>
                              ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No feedback yet</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </GlowingCard>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
