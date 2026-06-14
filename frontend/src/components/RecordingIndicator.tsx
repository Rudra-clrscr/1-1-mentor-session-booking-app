'use client';

interface RecordingIndicatorProps {
  onStop: () => void;
}

export function RecordingIndicator({ onStop }: RecordingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/60 px-3 py-1.5">
      {/* Pulsing red dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <span className="text-sm font-medium text-red-600 dark:text-red-400">REC</span>
      <button
        onClick={onStop}
        title="Stop recording"
        className="ml-1 rounded px-1.5 py-0.5 text-xs text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300"
      >
        ⏹ Stop
      </button>
    </div>
  );
}

export default RecordingIndicator;
