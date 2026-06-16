'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingCard } from './ui/GlowingComponents';

const MAX_REVIEW_LENGTH = 300;
const SKIP_DELAY_MS = 3000;

interface PostSessionFeedbackModalProps {
  isOpen: boolean;
  sessionId: string;
  mentorName: string;
  mentorAvatar?: string;
  onClose: () => void;
}

interface StarPickerProps {
  value: number;
  onChange: (rating: number) => void;
}

function StarPicker({ value, onChange }: StarPickerProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div role="group" aria-label="Star rating" className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          aria-pressed={value === star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' && star < 5) onChange(star + 1);
            if (e.key === 'ArrowLeft' && star > 1) onChange(star - 1);
          }}
          className={`text-4xl transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded ${
            star <= (hovered || value) ? 'text-accent-400' : 'text-gray-300 dark:text-gray-600'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function PostSessionFeedbackModal({
  isOpen,
  sessionId,
  mentorName,
  mentorAvatar,
  onClose,
}: PostSessionFeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setCanSkip(true), SKIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setReview('');
      setCanSkip(false);
      setSubmitted(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (rating < 1) return;

    setSubmitting(true);
    setError('');

    try {
      await apiClient.submitRating(sessionId, {
        rating,
        comment: review.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        onClose();
        return;
      }
      setError(err?.response?.data?.error || 'Failed to submit review');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <GlowingCard glow="purple" className="w-full max-w-md p-6 space-y-6">
        {submitted ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-gray-900 dark:text-white text-lg font-semibold">
              Thanks for your feedback!
            </p>
          </div>
        ) : (
          <>
            {/* Header with mentor info */}
            <div className="flex items-center gap-3">
              {mentorAvatar ? (
                <img
                  src={mentorAvatar}
                  alt={mentorName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary-500"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {mentorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 id="feedback-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
                  Rate Your Session
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  How was your session with{' '}
                  <span className="text-secondary-400 font-semibold">{mentorName}</span>?
                </p>
              </div>
            </div>

            {/* Star picker */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-3 text-center">
                Rating <span className="text-red-400">*</span>
              </label>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            {/* Review textarea */}
            <div>
              <label
                htmlFor="feedback-review"
                className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2"
              >
                Add a comment{' '}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                id="feedback-review"
                value={review}
                onChange={(e) => setReview(e.target.value.slice(0, MAX_REVIEW_LENGTH))}
                placeholder="Share your experience with this mentor..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all resize-none"
              />
              <p className="text-right text-xs text-gray-500 mt-1">
                {review.length}/{MAX_REVIEW_LENGTH}
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
              {canSkip ? (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
                >
                  Skip for now
                </button>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-600 text-xs">
                  Skip available in {SKIP_DELAY_MS / 1000}s…
                </p>
              )}
            </div>
          </>
        )}
      </GlowingCard>
    </div>
  );
}

export default PostSessionFeedbackModal;
