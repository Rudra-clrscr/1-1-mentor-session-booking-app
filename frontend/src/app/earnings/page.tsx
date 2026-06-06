'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingCard, Badge, LoadingSpinner, Avatar } from '@/components/ui/GlowingComponents';

export default function EarningsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [earnings, setEarnings] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || user.role !== 'mentor') return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [earningsRes, paymentsRes] = await Promise.all([
          apiClient.getEarnings(),
          apiClient.getPaymentHistory(),
        ]);

        setEarnings(earningsRes.data);
        setPayments(paymentsRes.data || []);
      } catch (err) {
        console.error('Error fetching earnings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, user?.role]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (user?.role !== 'mentor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Only mentors can view earnings</p>
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
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Earnings</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Track your mentoring income</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <GlowingCard glow="green">
             <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Earnings</p>
              <p className="text-4xl font-bold text-green-500 dark:text-green-400">${earnings?.total_earnings?.toFixed(2) || '0.00'}</p>
            </div>
          </GlowingCard>

          <GlowingCard glow="blue">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Sessions</p>
              <p className="text-4xl font-bold text-blue-500 dark:text-blue-400">{earnings?.total_sessions || 0}</p>
            </div>
          </GlowingCard>

          <GlowingCard glow="purple">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Completed Payments</p>
              <p className="text-4xl font-bold text-purple-500 dark:text-purple-400">{earnings?.completed_payments || 0}</p>
            </div>
          </GlowingCard>
        </div>

        {/* Payment History */}
        <GlowingCard glow="purple">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Payment History</h2>

          {payments.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700/30">
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="text-left py-3">Session</th>
                    <th className="text-left py-3">Amount</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-left py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-gray-200 dark:border-gray-700/30">
                      <td className="py-3 text-gray-900 dark:text-white">{payment.session_title}</td>
                      <td className="py-3 text-gray-900 dark:text-white font-bold">${payment.amount.toFixed(2)}</td>
                      <td className="py-3">
                        <Badge color={payment.status === 'completed' ? 'green' : 'yellow'}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlowingCard>
      </main>
    </div>
  );
}
