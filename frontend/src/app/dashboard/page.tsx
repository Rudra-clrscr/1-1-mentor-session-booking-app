'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { Session, User } from '@/types';
import { GlowingButton, GlowingCard, Badge, Avatar, LoadingSpinner } from '@/components/ui/GlowingComponents';

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

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
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : sessions.length === 0 ? (
            <GlowingCard glow="blue" className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No sessions yet</p>
            </GlowingCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
              {sessions.map((session) => (
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
                </GlowingCard>
              ))}
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
