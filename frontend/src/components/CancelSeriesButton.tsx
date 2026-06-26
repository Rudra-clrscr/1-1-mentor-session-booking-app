'use client';

import { useState } from 'react';
import { apiClient } from '@/services/api';

interface CancelSeriesButtonProps {
  seriesId: string;
  nextOccurrenceAt?: string;
  onCancelled: () => void;
}

const MIN_NOTICE_HOURS = parseInt(process.env.NEXT_PUBLIC_MIN_CANCEL_NOTICE_HOURS ?? '2', 10);

export default function CancelSeriesButton({
  seriesId,
  nextOccurrenceAt,
  onCancelled,
}: CancelSeriesButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoursUntilNext = nextOccurrenceAt
    ? (new Date(nextOccurrenceAt).getTime() - Date.now()) / (1000 * 60 * 60)
    : Infinity;
  const withinWindow = hoursUntilNext < MIN_NOTICE_HOURS;

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      await apiClient.cancelRecurringSeries(seriesId, reason.trim() || undefined);
      setShowDialog(false);
      onCancelled();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err instanceof Error ? err.message : 'Failed to cancel series.');
      setError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="text-sm text-red-400 hover:text-red-300 underline transition-colors"
      >
        Cancel entire series
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-series-dialog-title"
        >
          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h2
              id="cancel-series-dialog-title"
              className="text-gray-900 dark:text-white font-semibold text-lg mb-2"
            >
              Cancel this entire recurring series?
            </h2>

            {withinWindow ? (
              <>
                <p className="text-red-500 text-sm mb-4">
                  It&apos;s too late to cancel online — the next occurrence starts in less than{' '}
                  {MIN_NOTICE_HOURS} hours. Please contact the other participant directly.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="w-full py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  All upcoming occurrences will be cancelled and both participants notified by email.
                  Already-completed sessions are not affected. Cancellations must be made at least{' '}
                  {MIN_NOTICE_HOURS} hours before the next occurrence.
                </p>

                <div className="mb-4">
                  <label
                    htmlFor="cancel-series-reason"
                    className="block text-gray-500 dark:text-gray-400 text-xs mb-1"
                  >
                    Reason (optional)
                  </label>
                  <textarea
                    id="cancel-series-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Let the other person know why…"
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                               text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2
                               focus:outline-none focus:ring-2 focus:ring-red-500 resize-none
                               placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDialog(false);
                      setError(null);
                    }}
                    disabled={isCancelling}
                    className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                               text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100
                               dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    Keep series
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold
                               hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isCancelling ? 'Cancelling…' : 'Yes, cancel series'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
