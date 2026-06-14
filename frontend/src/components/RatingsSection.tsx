'use client';

import React, { useState } from 'react';
import { GlowingButton, GlowingCard, Avatar } from './ui/GlowingComponents';

interface Rating {
  id: string;
  rating: number;
  review: string;
  created_at: string;
  student_name: string;
  student_avatar: string;
}

interface RatingProps {
  mentorId: string;
  mentorName: string;
  ratings: Rating[];
  avgRating: number;
  totalReviews: number;
  onSubmitReview?: (rating: number, review: string) => void;
  canReview?: boolean;
}

export function RatingsSection({
  mentorId,
  mentorName,
  ratings,
  avgRating,
  totalReviews,
  onSubmitReview,
  canReview,
}: RatingProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [review, setReview] = useState('');

  const handleSubmit = () => {
    if (onSubmitReview) {
      onSubmitReview(selectedRating, review);
      setShowForm(false);
      setReview('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <GlowingCard glow="yellow" className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Overall Rating</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-yellow-400">{avgRating.toFixed(1)}</span>
              <span className="text-gray-600 dark:text-gray-400">out of 5</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{totalReviews} reviews</p>
          </div>

          {/* Star Display */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-3xl ${
                  star <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                ★
              </span>
            ))}
          </div>

          {canReview && (
            <GlowingButton
              onClick={() => setShowForm(!showForm)}
              className="w-full md:w-auto"
            >
              {showForm ? 'Cancel' : 'Write Review'}
            </GlowingButton>
          )}
        </div>

        {/* Review Form */}
        {showForm && canReview && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/30 space-y-4">
            <h4 className="text-gray-900 dark:text-white font-semibold">Share Your Experience</h4>

            {/* Star Rating */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                Rate this mentor: {selectedRating} ⭐
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSelectedRating(star)}
                    className={`text-3xl transition ${
                      star <= selectedRating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                    } hover:scale-110`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                Your Review
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience with this mentor..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all"
              />
            </div>

            {/* Submit */}
            <GlowingButton
              onClick={handleSubmit}
              className="w-full"
              disabled={!review.trim()}
            >
              Submit Review
            </GlowingButton>
          </div>
        )}
      </GlowingCard>

      {/* Reviews List */}
      {ratings.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Recent Reviews</h3>
          <div className="space-y-4">
            {ratings.map((rating) => (
              <GlowingCard key={rating.id} glow="green" className="p-4 md:p-6">
                <div className="flex gap-4">
                  <Avatar name={rating.student_name} size="sm" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{rating.student_name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-lg ${
                              star <= rating.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">{rating.review}</p>
                  </div>
                </div>
              </GlowingCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RatingsSection;
