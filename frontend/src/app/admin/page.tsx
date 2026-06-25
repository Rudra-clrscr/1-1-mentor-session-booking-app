'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingCard, Badge, LoadingSpinner } from '@/components/ui/GlowingComponents';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
};

type AdminSession = {
  id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  mentor_name: string;
  student_name: string | null;
};

type ModerationItem = {
  id: string;
  title: string;
  mentor_name: string;
  rating: number | null;
  comment: string | null;
};

type Report = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
};

type MentorForVerification = {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  hourly_rate: number | null;
  verified: boolean;
  verification_date: string | null;
  created_at: string;
};

type AuditLogEntry = {
  id: string;
  action: string;
  note: string | null;
  created_at: string;
  admin_name: string;
  target_name: string;
  target_email: string;
};

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [verificationMentors, setVerificationMentors] = useState<MentorForVerification[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'all'>('pending');
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sessions' | 'moderation' | 'verification'>('overview');

  const isAdmin = !!user && user.role === 'admin';

  useEffect(() => {
    // Not an admin (or not logged in) — nothing to fetch, and there's no
    // loading state to resolve, so the access-denied check below can render
    // immediately instead of hanging on the spinner forever.
    if (!isAdmin) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getAdminStats();
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'users') return;

    const fetchUsers = async () => {
      try {
        const response = await apiClient.getAdminUsers(search || undefined);
        setUsers(response.data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, [isAdmin, activeTab, search]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'sessions') return;

    const fetchSessions = async () => {
      try {
        const response = await apiClient.getAdminSessions();
        setSessions(response.data || []);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      }
    };

    fetchSessions();
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'moderation') return;

    const fetchModeration = async () => {
      try {
        const [queueRes, reportsRes] = await Promise.all([
          apiClient.getModerationQueue(),
          apiClient.getReports(),
        ]);
        setQueue(queueRes.data || []);
        setReports(reportsRes.data || []);
      } catch (err) {
        console.error('Error fetching moderation data:', err);
      }
    };

    fetchModeration();
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'verification') return;

    const fetchVerification = async () => {
      try {
        const [mentorsRes, auditRes] = await Promise.all([
          apiClient.getMentorsForVerification({ status: verificationStatus }),
          apiClient.getAuditLog(),
        ]);
        setVerificationMentors(mentorsRes.data || []);
        setAuditLog(auditRes.data || []);
      } catch (err) {
        console.error('Error fetching verification data:', err);
      }
    };

    fetchVerification();
  }, [isAdmin, activeTab, verificationStatus]);

  const handleVerifyToggle = async (mentor: MentorForVerification) => {
    try {
      if (mentor.verified) {
        const note = window.prompt(`Reason for revoking ${mentor.name}'s verification?`) || undefined;
        await apiClient.setMentorVerification(mentor.id, false, note);
      } else {
        await apiClient.setMentorVerification(mentor.id, true);
      }
      const [mentorsRes, auditRes] = await Promise.all([
        apiClient.getMentorsForVerification({ status: verificationStatus }),
        apiClient.getAuditLog(),
      ]);
      setVerificationMentors(mentorsRes.data || []);
      setAuditLog(auditRes.data || []);
    } catch (err) {
      console.error('Error toggling verification:', err);
    }
  };

  const handleSuspendToggle = async (targetUser: AdminUser) => {
    try {
      if (targetUser.is_suspended) {
        await apiClient.unsuspendUser(targetUser.id);
      } else {
        const reason = window.prompt(`Reason for suspending ${targetUser.name}?`) || 'No reason provided';
        await apiClient.suspendUser(targetUser.id, reason);
      }
      const response = await apiClient.getAdminUsers(search || undefined);
      setUsers(response.data || []);
    } catch (err) {
      console.error('Error toggling suspension:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Only admins can access this page</p>
          <Link href="/dashboard">
            <GlowingButton>Back to Dashboard</GlowingButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Platform management and analytics</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {(['overview', 'users', 'sessions', 'moderation', 'verification'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-purple-500 text-white font-semibold shadow-md'
                  : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <GlowingCard glow="blue">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Users</p>
                <p className="text-4xl font-bold text-blue-500 dark:text-blue-400">{stats?.total_users || 0}</p>
              </div>
            </GlowingCard>

            <GlowingCard glow="green">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Active Mentors</p>
                <p className="text-4xl font-bold text-green-500 dark:text-green-400">{stats?.total_mentors || 0}</p>
              </div>
            </GlowingCard>

            <GlowingCard glow="yellow">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Sessions</p>
                <p className="text-4xl font-bold text-yellow-500 dark:text-yellow-400">{stats?.total_sessions || 0}</p>
              </div>
            </GlowingCard>

            <GlowingCard glow="purple">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Revenue</p>
                <p className="text-4xl font-bold text-purple-500 dark:text-purple-400">${stats?.total_revenue || 0}</p>
              </div>
            </GlowingCard>

            <GlowingCard glow="green" className="md:col-span-2">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Completion Rate</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-dark-800 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{
                          width: `${
                            stats?.total_sessions > 0
                              ? (stats?.completed_sessions / stats?.total_sessions) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-white font-bold">
                    {stats?.total_sessions > 0
                      ? Math.round((stats?.completed_sessions / stats?.total_sessions) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </GlowingCard>

            <GlowingCard glow="yellow" className="md:col-span-2">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Average Rating</p>
                <p className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">
                  {stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : '0.0'} ⭐
                </p>
              </div>
            </GlowingCard>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <GlowingCard glow="purple">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h2>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/30">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800/50">
                      <td className="py-2 pr-4 text-gray-900 dark:text-white">{u.name}</td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                      <td className="py-2 pr-4 capitalize text-gray-600 dark:text-gray-400">{u.role}</td>
                      <td className="py-2 pr-4">
                        <Badge color={u.is_suspended ? 'red' : 'green'}>
                          {u.is_suspended ? 'Suspended' : 'Active'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {u.role !== 'admin' && (
                          <GlowingButton
                            variant={u.is_suspended ? 'secondary' : 'outline'}
                            className="text-xs py-1 px-3"
                            onClick={() => handleSuspendToggle(u)}
                          >
                            {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </GlowingButton>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500 dark:text-gray-400">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlowingCard>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <GlowingCard glow="purple">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All Sessions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/30">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Mentor</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800/50">
                      <td className="py-2 pr-4 text-gray-900 dark:text-white">{s.title}</td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{s.mentor_name}</td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{s.student_name || '—'}</td>
                      <td className="py-2 pr-4">
                        <Badge color={s.status === 'completed' ? 'green' : 'purple'}>{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500 dark:text-gray-400">
                        No sessions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlowingCard>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <GlowingCard glow="purple">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Flagged Sessions</h2>
              {queue.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No flagged sessions</p>
              ) : (
                <div className="space-y-2">
                  {queue.map((item) => (
                    <div key={item.id} className="p-3 bg-gray-100/50 dark:bg-dark-800/30 rounded-lg">
                      <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Mentor: {item.mentor_name}</p>
                      {item.comment && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">&ldquo;{item.comment}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlowingCard>

            <GlowingCard glow="purple">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">User Reports</h2>
              {reports.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No reports</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div key={r.id} className="p-3 bg-gray-100/50 dark:bg-dark-800/30 rounded-lg">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-gray-900 dark:text-white">{r.reason}</p>
                        <Badge color={r.status === 'open' ? 'red' : 'green'}>{r.status}</Badge>
                      </div>
                      {r.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{r.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlowingCard>
          </div>
        )}

        {/* Verification Tab */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            <GlowingCard glow="purple">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mentor Verification</h2>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value as 'pending' | 'verified' | 'all')}
                  className="px-3 py-2 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-sm text-gray-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="all">All Mentors</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/30">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationMentors.map((mentor) => (
                      <tr key={mentor.id} className="border-b border-gray-100 dark:border-gray-800/50">
                        <td className="py-2 pr-4 text-gray-900 dark:text-white">{mentor.name}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{mentor.email}</td>
                        <td className="py-2 pr-4">
                          <Badge color={mentor.verified ? 'green' : 'yellow'}>
                            {mentor.verified ? '✓ Verified' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <GlowingButton
                            variant={mentor.verified ? 'outline' : 'secondary'}
                            className="text-xs py-1 px-3"
                            onClick={() => handleVerifyToggle(mentor)}
                          >
                            {mentor.verified ? 'Revoke' : 'Verify'}
                          </GlowingButton>
                        </td>
                      </tr>
                    ))}
                    {verificationMentors.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-500 dark:text-gray-400">
                          No mentors found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlowingCard>

            <GlowingCard glow="purple">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Verification Audit Log</h2>
              {auditLog.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No verification actions yet</p>
              ) : (
                <div className="space-y-2">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="p-3 bg-gray-100/50 dark:bg-dark-800/30 rounded-lg">
                      <div className="flex justify-between items-start">
                        <p className="text-gray-900 dark:text-white">
                          <span className="font-medium">{entry.admin_name}</span>{' '}
                          {entry.action === 'mentor_verified' ? 'verified' : 'revoked verification for'}{' '}
                          <span className="font-medium">{entry.target_name}</span>
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">&ldquo;{entry.note}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlowingCard>
          </div>
        )}
      </main>
    </div>
  );
}
