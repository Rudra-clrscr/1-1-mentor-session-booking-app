'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingCard, Badge, LoadingSpinner } from '@/components/ui/GlowingComponents';

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'moderation'>('overview');

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

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
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
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
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Platform management and analytics</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-purple-500 text-white font-semibold shadow-md'
                : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-purple-500 text-white font-semibold shadow-md'
                : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'moderation'
                ? 'bg-purple-500 text-white font-semibold shadow-md'
                : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Moderation
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <GlowingCard glow="blue">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Users</p>
                <p className="text-4xl font-bold text-blue-500 dark:text-blue-400">{stats.stat?.total_users || 0}</p>
              </div>
            </GlowingCard>

            <GlowingCard glow="green">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Active Mentors</p>
                <p className="text-4xl font-bold text-green-500 dark:text-green-400">{stats.stat?.total_mentors || 0}</p>
              </div>
            </GlowingCard>

            <GlowingCard glow="yellow">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Sessions</p>
                <p className="text-4xl font-bold text-yellow-500 dark:text-yellow-400">{stats.stat?.total_sessions || 0}</p>
              </div>
            </GlowingCard>

            <GlowingCard glow="purple">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Revenue</p>
                <p className="text-4xl font-bold text-purple-500 dark:text-purple-400">${stats.stat?.total_revenue || 0}</p>
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
                            stats.stat?.total_sessions > 0
                              ? (stats.stat?.completed_sessions / stats.stat?.total_sessions) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-gray-900 dark:text-white font-bold">
                    {stats.stat?.total_sessions > 0
                      ? Math.round((stats.stat?.completed_sessions / stats.stat?.total_sessions) * 100)
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
                  {stats.stat?.avg_rating ? stats.stat.avg_rating.toFixed(1) : '0.0'} ⭐
                </p>
              </div>
            </GlowingCard>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <GlowingCard glow="purple">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">User Management</h2>
            <p className="text-gray-600 dark:text-gray-400">User management features coming soon...</p>
          </GlowingCard>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <GlowingCard glow="purple">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Content Moderation</h2>
            <p className="text-gray-600 dark:text-gray-400">Moderation tools coming soon...</p>
          </GlowingCard>
        )}
      </main>
    </div>
  );
}
