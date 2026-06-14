'use client';

interface RecordingToastProps {
  message: string;
  onDismiss: () => void;
}

export function RecordingToast({ message, onDismiss }: RecordingToastProps) {
  return (
    <div className="w-80 rounded-lg border border-purple-300 dark:border-purple-500/30 bg-white dark:bg-dark-800 p-4 shadow-2xl animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-900 dark:text-white">{message}</p>
        <button
          onClick={onDismiss}
          className="text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default RecordingToast;
