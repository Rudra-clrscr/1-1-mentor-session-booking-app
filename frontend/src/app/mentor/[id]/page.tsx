'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { User, Session } from '@/types';
import {
  GlowingButton,
  GlowingCard,
  Badge,
  Avatar,
  LoadingSpinner,
} from '@/components/ui/GlowingComponents';

export default function MentorProfilePage() {
  const params = useParams();
  const mentorId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const [mentor, setMentor] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch mentor profile
        const mentorRes = await apiClient.getUser(mentorId);
        if (mentorRes.data) {
          setMentor(mentorRes.data);
        }

        // Fetch all available sessions
        try {
          const sessionsRes = await apiClient.getAvailableSessions();
          // Filter to only show this mentor's available sessions
          const mentorSessions = (sessionsRes.data || []).filter(
            (session: any) => session.mentor_id === mentorId
          );
          setSessions(mentorSessions);
          console.log('Mentor sessions:', mentorSessions.length);
        } catch (err) {
          console.warn('Could not fetch available sessions:', err);
          setSessions([]);
        }
      } catch (err) {
        console.error('Error fetching mentor data:', err);
        setError('Failed to load mentor profile');
      } finally {
        setLoading(false);
      }
    };

    if (mentorId) {
      fetchData();
    }
  }, [mentorId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
        <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/browse">
              <GlowingButton variant="outline">Back to Browse</GlowingButton>
            </Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <GlowingCard glow="yellow" className="text-center py-12">
            <p className="text-yellow-400 text-lg">{error || 'Mentor not found'}</p>
          </GlowingCard>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold gradient-text">Mentor Profile</h1>
          <Link href="/browse">
            <GlowingButton variant="outline">Back to Browse</GlowingButton>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mentor Info Card */}
        <GlowingCard glow="yellow" className="mb-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center text-center">
              <Avatar name={mentor.name} size="lg" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-2">{mentor.name}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{mentor.bio || 'No bio provided'}</p>
              <Badge color="purple">{mentor.role}</Badge>
            </div>

            <div className="flex-1">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Email</h3>
                  <p className="text-gray-950 dark:text-white text-lg break-all">{mentor.email}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-gray-950 dark:text-white">
                      {mentor.verified ? 'Verified Mentor' : 'Not Verified'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Available Sessions</h3>
                  <p className="text-gray-950 dark:text-white text-lg font-semibold">{sessions.length} session(s)</p>
                </div>
              </div>
            </div>
          </div>
        </GlowingCard>

        {/* Sessions */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Available Sessions</h3>

          {sessions.length === 0 ? (
            <GlowingCard glow="blue" className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg">This mentor has no available sessions right now</p>
              <Link href="/browse" className="inline-block mt-6">
                <GlowingButton variant="secondary">Browse Other Mentors</GlowingButton>
              </Link>
            </GlowingCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.map((session) => (
                <GlowingCard key={session.id} glow="purple">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{session.title}</h4>
                    <Badge color="green">{session.status}</Badge>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{session.description}</p>

                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Language:</span>
                      <Badge color="purple">{session.code_language}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                      <span className="text-gray-950 dark:text-white font-semibold">{session.duration_minutes} mins</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Topic:</span>
                      <span className="text-gray-950 dark:text-white font-semibold">{session.topic || 'General'}</span>
                    </div>
                  </div>

                  {user?.role === 'student' && session.status === 'scheduled' ? (
                    <Link href={`/session/${session.id}/join`} className="block">
                      <GlowingButton variant="primary" className="w-full">
                        Join This Session
                      </GlowingButton>
                    </Link>
                  ) : (
                    <Link href={`/session/${session.id}`} className="block">
                      <GlowingButton variant="secondary" className="w-full">
                        View Details
                      </GlowingButton>
                    </Link>
                  )}
                </GlowingCard>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
