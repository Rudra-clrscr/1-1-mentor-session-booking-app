'use client';

import { useRouter } from 'next/navigation';

interface ReminderToastProps {
  title: string;
  message: string;
  sessionId: string;
  onDismiss: () => void;
}

export function ReminderToast({ title, message, sessionId, onDismiss }: ReminderToastProps) {
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-lg border border-purple-500/30 bg-white dark:bg-dark-800 p-4 shadow-2xl animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => {
            router.push(`/session/${sessionId}`);
            onDismiss();
          }}
          className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
        >
          Join Session →
        </button>
      </div>
    </div>
  );
}

export default ReminderToast;
