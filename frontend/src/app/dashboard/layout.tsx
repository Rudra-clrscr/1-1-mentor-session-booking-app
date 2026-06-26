'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner, ErrorRetryBanner } from '@/components/ui/GlowingComponents';
import { socketService } from '@/services/socket';
import { ReminderToast } from '@/components/ReminderToast';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { useNotifications } from '@/hooks/useNotifications';
import { SocketEvents } from '@/types';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, token, sessionError, retrySession } = useAuth();
  const router = useRouter();
  const [reminder, setReminder] = useState<{ title: string; message: string; sessionId: string } | null>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications(isAuthenticated);

  useEffect(() => {
    // A sessionError means we couldn't confirm the session due to a
    // network/server error, not that it's actually invalid — don't kick the
    // user to /login for that, let them retry instead.
    if (!isLoading && !isAuthenticated && !sessionError) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, sessionError, router]);

  // Listen for real-time session reminder notifications
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    const handleNotification = (data: SocketEvents['notification:received']) => {
      if (data.type === 'session_reminder' && data.data?.sessionId) {
        setReminder({
          title: data.title,
          message: data.message,
          sessionId: data.data.sessionId,
        });
      }
    };

    socketService.on('notification:received', handleNotification);
    return () => socketService.off('notification:received', handleNotification);
  }, [isAuthenticated, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <ErrorRetryBanner message={sessionError} onRetry={retrySession} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <div className="fixed top-3 right-3 md:top-4 md:right-6 z-40">
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
        />
      </div>
      {children}
      {reminder && (
        <ReminderToast
          title={reminder.title}
          message={reminder.message}
          sessionId={reminder.sessionId}
          onDismiss={() => setReminder(null)}
        />
      )}
    </>
  );
}
