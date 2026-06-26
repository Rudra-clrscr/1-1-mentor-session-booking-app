'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { Session, User } from '@/types';
import { GlowingButton, GlowingCard, Badge, Avatar, LoadingSpinner } from '@/components/ui/GlowingComponents';
import CancelSessionButton from '@/components/CancelSessionButton';
import CancelSeriesButton from '@/components/CancelSeriesButton';

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
};

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelledNotice, setCancelledNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [sessionsRes, mentorsRes] = await Promise.all([
          apiClient.getUserSessions(),
          apiClient.getMentors(),
        ]);

        setSessions(sessionsRes.data || []);
        setMentors(mentorsRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const { seriesGroups, standaloneSessions } = useMemo(() => {
    const groups = new Map<string, Session[]>();
    const standalone: Session[] = [];

    for (const session of sessions) {
      if (session.recurring_series_id) {
        const existing = groups.get(session.recurring_series_id) ?? [];
        existing.push(session);
        groups.set(session.recurring_series_id, existing);
      } else {
        standalone.push(session);
      }
    }

    for (const occurrences of groups.values()) {
      occurrences.sort((a, b) => (a.recurrence_index ?? 0) - (b.recurrence_index ?? 0));
    }

    return { seriesGroups: Array.from(groups.entries()), standaloneSessions: standalone };
  }, [sessions]);

  const inferFrequency = (occurrences: Session[]): string => {
    if (occurrences.length < 2 || !occurrences[0].scheduled_at || !occurrences[1].scheduled_at) {
      return 'Recurring';
    }
    const dayGap =
      (new Date(occurrences[1].scheduled_at).getTime() - new Date(occurrences[0].scheduled_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (Math.round(dayGap) === 7) return FREQUENCY_LABEL.weekly;
    if (Math.round(dayGap) === 14) return FREQUENCY_LABEL.biweekly;
    return FREQUENCY_LABEL.monthly;
  };

  if (authLoading) {
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-3">
            <h1 className="text-xl md:text-2xl font-bold gradient-text">Sessions</h1>
            <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
              <Avatar name={user?.name || 'User'} size="sm" />
              <div className="flex-1 sm:flex-none">
                <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{user?.name}</p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
              </div>
              <GlowingButton variant="outline" onClick={() => logout()} className="ml-auto sm:ml-4 text-xs md:text-sm py-1 md:py-2">
                Logout
              </GlowingButton>
            </div>
          </div>
          {/* Navigation Links */}
          <nav className="flex flex-wrap gap-2 md:gap-3">
            <Link href="/dashboard">
              <GlowingButton variant="outline" className="text-xs md:text-sm py-1.5 md:py-2">
                Dashboard
              </GlowingButton>
            </Link>
            <Link href="/profile">
              <GlowingButton variant="outline" className="text-xs md:text-sm py-1.5 md:py-2">
                Profile
              </GlowingButton>
            </Link>
            <Link href="/sessions/history">
              <GlowingButton variant="outline" className="text-xs md:text-sm py-1.5 md:py-2">
                History
              </GlowingButton>
            </Link>
            <Link href="/search">
              <GlowingButton variant="outline" className="text-xs md:text-sm py-1.5 md:py-2">
                Search Mentors
              </GlowingButton>
            </Link>
            {user?.role === 'mentor' && (
              <Link href="/dashboard/analytics">
                <GlowingButton variant="primary" className="text-xs md:text-sm py-1.5 md:py-2">
                  📊 Analytics
                </GlowingButton>
              </Link>
            )}
            {user?.role === 'mentor' && (
              <Link href="/dashboard/availability">
                <GlowingButton variant="secondary" className="text-xs md:text-sm py-1.5 md:py-2">
                  📅 Availability
                </GlowingButton>
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link href="/admin">
                <GlowingButton variant="primary" className="text-xs md:text-sm py-1.5 md:py-2">
                  🛡️ Admin
                </GlowingButton>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        {/* Welcome */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">Welcome, {user?.name}! 👋</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            {user?.role === 'mentor'
              ? 'Create sessions and help students learn'
              : 'Find a mentor and start learning'}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
          {user?.role === 'mentor' && (
            <GlowingCard glow="purple">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Session</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Schedule a mentoring session with a student</p>
              <Link href="/session/create">
                <GlowingButton variant="primary" className="w-full">
                  Create Session
                </GlowingButton>
              </Link>
            </GlowingCard>
          )}

          <GlowingCard glow="green">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Browse Available</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {user?.role === 'mentor'
                ? 'See student profiles'
                : 'Find mentors in your areas'}
            </p>
            <Link href="/browse">
              <GlowingButton variant="secondary" className="w-full">
                Browse
              </GlowingButton>
            </Link>
          </GlowingCard>
        </div>

        {/* Sessions */}
        <div className="mb-6 md:mb-8">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">My Sessions</h3>
          {cancelledNotice && (
            <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700/50 text-green-800 dark:text-green-300 text-sm flex justify-between items-center">
              <span>{cancelledNotice}</span>
              <button
                type="button"
                onClick={() => setCancelledNotice(null)}
                className="ml-4 text-green-700 dark:text-green-400 hover:opacity-70"
              >
                ✕
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : sessions.length === 0 ? (
            <GlowingCard glow="blue" className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No sessions yet</p>
            </GlowingCard>
          ) : (
            <div className="space-y-6">
              {seriesGroups.length > 0 && (
                <div className="space-y-4">
                  {seriesGroups.map(([seriesId, occurrences]) => {
                    const hasUpcoming = occurrences.some((s) => s.status === 'scheduled');
                    return (
                      <GlowingCard key={seriesId} glow="blue">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                              🔁 {occurrences[0].title}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {inferFrequency(occurrences)} · {occurrences.length} session{occurrences.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          {hasUpcoming && (
                            <CancelSeriesButton
                              seriesId={seriesId}
                              nextOccurrenceAt={
                                occurrences.find((s) => s.status === 'scheduled')?.scheduled_at ?? undefined
                              }
                              onCancelled={() => {
                                setSessions((prev) =>
                                  prev.filter((s) => s.recurring_series_id !== seriesId)
                                );
                                setCancelledNotice('Recurring series cancelled. Both participants have been notified.');
                              }}
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {occurrences.map((session) => (
                            <div
                              key={session.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-100/50 dark:bg-dark-800/30 border border-gray-200/50 dark:border-gray-700/20"
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-gray-900 dark:text-white truncate">
                                  {session.scheduled_at
                                    ? new Date(session.scheduled_at).toLocaleString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })
                                    : 'No date'}
                                </p>
                                <Badge color={session.status === 'cancelled' ? 'red' : 'green'}>
                                  {session.status}
                                </Badge>
                              </div>
                              <Link href={`/session/${session.id}`}>
                                <GlowingButton variant="secondary" className="text-xs py-1.5 px-3">
                                  View
                                </GlowingButton>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </GlowingCard>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                {standaloneSessions.map((session) => (
                  <GlowingCard key={session.id} glow="purple">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">{session.title}</h4>
                      <Badge color="green">{session.status}</Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{session.description}</p>
                    <div className="flex gap-2">
                      <Link href={`/session/${session.id}`} className="flex-1">
                        <GlowingButton variant="primary" className="w-full text-sm">
                          View
                        </GlowingButton>
                      </Link>
                    </div>
                    {session.status === 'scheduled' && (
                      <CancelSessionButton
                        sessionId={session.id}
                        scheduledAt={session.scheduled_at}
                        onCancelled={() => {
                          setSessions((prev) => prev.filter((s) => s.id !== session.id));
                          setCancelledNotice('Session cancelled. Both participants have been notified.');
                        }}
                      />
                    )}
                  </GlowingCard>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mentors */}
        {user?.role === 'student' && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Featured Mentors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mentors.slice(0, 6).map((mentor) => (
                <GlowingCard key={mentor.id} glow="yellow">
                  <div className="flex flex-col items-center text-center">
                    <Avatar name={mentor.name} size="lg" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-4">{mentor.name}</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{mentor.bio}</p>
                    <Link href={`/mentor/${mentor.id}`} className="w-full mt-6">
                      <GlowingButton variant="secondary" className="w-full text-sm">
                        Learn from {mentor.name.split(' ')[0]}
                      </GlowingButton>
                    </Link>
                  </div>
                </GlowingCard>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
