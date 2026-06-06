'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { Session } from '@/types';
import {
  GlowingButton,
  GlowingCard,
  Avatar,
  Badge,
  LoadingSpinner,
} from '@/components/ui/GlowingComponents';

export default function CalendarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [availability, setAvailability] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
        const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const [availRes, sessionRes] = await Promise.all([
          user.role === 'mentor' ? apiClient.getMentorAvailability(user.id) : Promise.resolve({ data: [] }),
          apiClient.getSessionCalendar(user.id, startDate.toISOString(), endDate.toISOString()),
        ]);

        setAvailability(availRes.data || []);
        setSessions(sessionRes.data || []);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, month]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Manage your schedule and availability</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <GlowingCard glow="purple">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}
                    className="px-3 py-2 bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-dark-700 transition-all text-sm font-medium"
                  >
                    ← Prev
                  </button>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {monthNames[month.getMonth()]} {month.getFullYear()}
                  </h2>
                  <button
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}
                    className="px-3 py-2 bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-dark-700 transition-all text-sm font-medium"
                  >
                    Next →
                  </button>
                </div>

                 {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {days.map((day) => (
                    <div key={day} className="text-center font-bold text-gray-500 dark:text-gray-400 text-sm py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => {
                    const sessionCount = day
                      ? sessions.filter((s) => s.scheduled_at && new Date(s.scheduled_at).getDate() === day).length
                      : 0;

                    return (
                      <div
                        key={idx}
                        className={`aspect-square p-2 rounded text-center text-sm flex flex-col justify-between ${
                          day
                            ? 'bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 cursor-pointer transition-all'
                            : 'bg-gray-50/50 dark:bg-dark-900/30'
                        }`}
                      >
                        {day && (
                          <div className="w-full h-full flex flex-col justify-between">
                            <div className="font-bold text-gray-900 dark:text-white text-left">{day}</div>
                            {sessionCount > 0 && (
                              <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 text-right mt-auto">{sessionCount} session{sessionCount > 1 ? 's' : ''}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlowingCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Upcoming Sessions */}
            <GlowingCard glow="green">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Upcoming Sessions</h3>
              {sessions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming sessions</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {sessions.slice(0, 5).map((session) => (
                    <Link key={session.id} href={`/session/${session.id}`}>
                      <div className="p-3 bg-gray-100 dark:bg-dark-800 rounded hover:bg-gray-200 dark:hover:bg-dark-700 transition-all cursor-pointer">
                        <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{session.title}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {session.scheduled_at ? new Date(session.scheduled_at).toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </GlowingCard>

            {/* Availability Settings */}
            {user?.role === 'mentor' && (
              <GlowingCard glow="yellow">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Your Availability</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">Set your mentoring schedule</p>
                <GlowingButton
                  onClick={() => setEditing(!editing)}
                  className="w-full"
                  variant={editing ? 'secondary' : 'primary'}
                >
                  {editing ? 'Done' : 'Edit Availability'}
                </GlowingButton>

                {editing && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/30 space-y-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Select your available hours for each day</p>
                    {/* TODO: Add availability picker component */}
                  </div>
                )}
              </GlowingCard>
            )}

            {/* Legend */}
            <GlowingCard glow="blue">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Legend</h3>
              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Scheduled Session</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Unavailable</span>
                </div>
              </div>
            </GlowingCard>
          </div>
        </div>
      </main>
    </div>
  );
}
