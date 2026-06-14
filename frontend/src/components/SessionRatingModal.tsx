'use client';

import React, { useState } from 'react';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingCard } from './ui/GlowingComponents';

const MAX_COMMENT_LENGTH = 300;

interface SessionRatingModalProps {
  sessionId: string;
  mentorName: string;
  onSubmit: () => void;
  onSkip: () => void;
}

export function SessionRatingModal({
  sessionId,
  mentorName,
  onSubmit,
  onSkip,
}: SessionRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating < 1) return;

    setSubmitting(true);
    setError('');

    try {
      await apiClient.submitRating(sessionId, {
        rating,
        comment: comment.trim() || undefined,
      });

      onSubmit();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        // Already reviewed - nothing left to do, just dismiss
        onSubmit();
        return;
      }
      setError(err?.response?.data?.error || 'Failed to submit review');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlowingCard glow="purple" className="w-full max-w-md p-6 space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Rate Your Session</h3>
          <p className="text-gray-600 dark:text-gray-400">
            How was your session with <span className="text-secondary-400 font-semibold">{mentorName}</span>?
          </p>
        </div>

        {/* Star Selector */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={`text-4xl transition hover:scale-110 ${
                star <= (hoverRating || rating) ? 'text-accent-400' : 'text-gray-300 dark:text-gray-600'
              }`}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        {/* Optional Comment */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
            Add a comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            placeholder="Share your experience with this mentor..."
            rows={4}
            maxLength={MAX_COMMENT_LENGTH}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all"
          />
          <p className="text-right text-xs text-gray-500 mt-1">
            {comment.length}/{MAX_COMMENT_LENGTH}
          </p>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <GlowingButton
            onClick={handleSubmit}
            disabled={rating < 1 || submitting}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </GlowingButton>
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
          >
            Skip
          </button>
        </div>
      </GlowingCard>
    </div>
  );
}

export default SessionRatingModal;
