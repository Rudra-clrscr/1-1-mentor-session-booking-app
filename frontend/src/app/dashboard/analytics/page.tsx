'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingCard, LoadingSpinner, Avatar, Badge } from '@/components/ui/GlowingComponents';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalStudents: number;
  totalHours: number;
  avgRating: number;
  totalReviews: number;
  completionRate: number;
  sessionsByWeek: { week: string; count: number }[];
  ratingsHistory: { rating: number; date: string }[];
  recentSessions: {
    id: string; title: string; status: string;
    scheduled_at: string; duration_minutes: number; student_name: string;
  }[];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, glow = 'purple',
}: {
  icon: string; label: string; value: string | number; sub?: string;
  glow?: 'purple' | 'green' | 'yellow' | 'blue';
}) {
  return (
    <GlowingCard glow={glow} className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-widest font-medium">{label}</p>
          <p className="text-3xl font-bold gradient-text">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </GlowingCard>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700/50 rounded-lg px-4 py-2 text-sm shadow-xl">
      <p className="text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>★</span>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MentorAnalyticsPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await apiClient.getMentorAnalytics();
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.error ?? 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      {/* ── Header ── */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-bold gradient-text">Mentor Analytics</h1>
            <div className="flex items-center gap-3">
              <Avatar name={user?.name || 'M'} size="sm" />
              <div className="hidden sm:block">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{user?.role}</p>
              </div>
              <GlowingButton variant="outline" onClick={() => logout()} className="text-xs py-1.5 px-3">
                Logout
              </GlowingButton>
            </div>
          </div>
          {/* Nav */}
          <nav className="flex flex-wrap gap-2">
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/dashboard/analytics', label: '📊 Analytics', active: true },
              { href: '/profile', label: 'Profile' },
              { href: '/sessions/history', label: 'History' },
            ].map(({ href, label, active }) => (
              <Link key={href} href={href}>
                <GlowingButton
                  variant={active ? 'primary' : 'outline'}
                  className="text-xs py-1.5 px-3"
                >
                  {label}
                </GlowingButton>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* ── Page title ── */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Your Performance 📈</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your sessions, earnings and ratings all in one place.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-600 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* ── Stat Cards ── */}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="🎓" label="Total Sessions"   value={data.totalSessions}    glow="purple" />
              <StatCard icon="👥" label="Students Taught"  value={data.totalStudents}    glow="green"  />
              <StatCard icon="⏱️" label="Hours Mentored"   value={`${data.totalHours}h`} glow="yellow" />
              <StatCard icon="✅" label="Completion Rate"  value={`${data.completionRate}%`} sub={`${data.completedSessions} completed`} glow="blue" />
            </div>

            {/* ── Rating + upcoming row ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlowingCard glow="yellow" className="flex flex-col gap-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-widest font-medium">Average Rating</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-bold gradient-text">{Number(data.avgRating).toFixed(1)}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm mb-1">/ 5.0</span>
                </div>
                <Stars rating={data.avgRating} />
                <p className="text-xs text-gray-500">{data.totalReviews} review{data.totalReviews !== 1 ? 's' : ''}</p>
              </GlowingCard>

              <GlowingCard glow="green" className="flex flex-col gap-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-widest font-medium">Upcoming Sessions</p>
                <span className="text-5xl font-bold gradient-text">{data.upcomingSessions}</span>
                <p className="text-xs text-gray-500">scheduled sessions pending</p>
              </GlowingCard>

              <GlowingCard glow="purple" className="flex flex-col gap-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-widest font-medium">Sessions Completed</p>
                <span className="text-5xl font-bold gradient-text">{data.completedSessions}</span>
                <p className="text-xs text-gray-500">out of {data.totalSessions} total</p>
              </GlowingCard>
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sessions per week bar chart */}
              <GlowingCard glow="purple">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📅 Sessions by Week</h3>
                {data.sessionsByWeek.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No session data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.sessionsByWeek} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                      <XAxis dataKey="week" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Sessions" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </GlowingCard>

              {/* Rating history area chart */}
              <GlowingCard glow="yellow">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">⭐ Rating History</h3>
                {data.ratingsHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No ratings yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.ratingsHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#eab308" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                      <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone" dataKey="rating" name="Rating"
                        stroke="#eab308" fill="url(#ratingGrad)" strokeWidth={2} dot={{ fill: '#eab308', r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </GlowingCard>
            </div>

            {/* ── Recent Sessions table ── */}
            <GlowingCard glow="green">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">🕒 Recent Sessions</h3>
              {data.recentSessions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No sessions yet. Create one from the dashboard!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/30">
                        <th className="text-left pb-3 pr-4">Title</th>
                        <th className="text-left pb-3 pr-4">Student</th>
                        <th className="text-left pb-3 pr-4">Date</th>
                        <th className="text-left pb-3 pr-4">Duration</th>
                        <th className="text-left pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700/20">
                      {data.recentSessions.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                            <Link href={`/session/${s.id}`} className="hover:text-purple-400 transition-colors">
                              {s.title}
                            </Link>
                          </td>
                          <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{s.student_name || '—'}</td>
                          <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                            {new Date(s.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{s.duration_minutes}m</td>
                          <td className="py-3">
                            <Badge
                              color={s.status === 'completed' ? 'green' : s.status === 'in_progress' ? 'yellow' : 'purple'}
                            >
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlowingCard>
          </>
        )}
      </main>
    </div>
  );
}
