'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function BrowsePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [mentors, setMentors] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [filterLanguage, setFilterLanguage] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [mentorsRes, sessionsRes] = await Promise.all([
          apiClient.getMentors(),
          apiClient.getAvailableSessions(),
        ]);

        setMentors(mentorsRes.data || []);
        setSessions(sessionsRes.data || []);
        console.log('Loaded sessions:', sessionsRes.data?.length || 0);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter sessions by mentor and language
  const filteredSessions = sessions.filter((session) => {
    const matchesMentor = !selectedMentor || session.mentor_id === selectedMentor;
    const matchesLanguage = !filterLanguage || session.code_language === filterLanguage;
    return matchesMentor && matchesLanguage;
  });

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Browse Sessions</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Find the perfect mentor</p>
          </div>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <GlowingButton variant="outline" className="w-full sm:w-auto text-sm">Back to Dashboard</GlowingButton>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        {/* Filter Section */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Mentor</label>
            <select
              value={selectedMentor || ''}
              onChange={(e) => setSelectedMentor(e.target.value || null)}
              className="w-full px-3 md:px-4 py-2 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50"
            >
              <option value="" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">All Mentors</option>
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id} className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">
                  {mentor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Language</label>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full px-3 md:px-4 py-2 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50"
            >
              <option value="" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">All Languages</option>
              <option value="javascript" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">JavaScript</option>
              <option value="python" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Python</option>
              <option value="java" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Java</option>
              <option value="cpp" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">C++</option>
              <option value="typescript" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">TypeScript</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {/* Mentors Sidebar - Hidden on mobile, shown on md+ */}
            <div className="hidden md:block lg:col-span-1">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">Mentors</h2>
              <div className="space-y-2 md:space-y-3">
                {mentors.length === 0 ? (
                  <GlowingCard glow="blue" className="text-center py-6">
                    <p className="text-gray-600 dark:text-gray-400">No mentors available</p>
                  </GlowingCard>
                ) : (
                  mentors.map((mentor) => (
                    <div
                      key={mentor.id}
                      onClick={() => setSelectedMentor(mentor.id)}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedMentor === mentor.id
                          ? 'bg-primary-500/20 border border-primary-500/50'
                          : 'bg-gray-100 dark:bg-dark-800/30 border border-gray-200 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={mentor.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{mentor.name}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{mentor.bio}</p>
                        </div>
                      </div>
                      <Link
                        href={`/mentor/${mentor.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-block mt-2 w-full"
                      >
                        <GlowingButton variant="secondary" className="w-full text-xs">
                          View Profile
                        </GlowingButton>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sessions Grid */}
            <div className="md:col-span-2 lg:col-span-2">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
                Available Sessions {filteredSessions.length > 0 && `(${filteredSessions.length})`}
              </h2>

              {filteredSessions.length === 0 ? (
                <GlowingCard glow="blue" className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    {selectedMentor
                      ? "This mentor doesn't have any sessions right now"
                      : 'No sessions available. Try adjusting your filters.'}
                  </p>
                </GlowingCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
                  {filteredSessions.map((session) => {
                    const mentor = mentors.find((m) => m.id === session.mentor_id);
                    return (
                      <GlowingCard key={session.id} glow="purple" className="p-3 md:p-4">
                        <div className="flex justify-between items-start mb-2 md:mb-3">
                          <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">{session.title}</h3>
                          <Badge color="green" className="text-xs md:text-sm">{session.status}</Badge>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm mb-2 md:mb-3">{session.description}</p>

                        <div className="space-y-1 md:space-y-2 mb-3 md:mb-4 text-xs md:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Mentor:</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{mentor?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Language:</span>
                            <Badge color="purple">{session.code_language}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                            <span className="text-gray-900 dark:text-white">{session.duration_minutes} mins</span>
                          </div>
                        </div>

                        {session.status === 'scheduled' && user?.role === 'student' ? (
                          <Link href={`/session/${session.id}/join`} className="block">
                            <GlowingButton variant="primary" className="w-full">
                              Join Session
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}  
      </main>
    </div>
  );
}
