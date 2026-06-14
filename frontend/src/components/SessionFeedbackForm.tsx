'use client';

import React, { useState } from 'react';
import { GlowingButton, GlowingCard } from './ui/GlowingComponents';

interface SessionFeedbackProps {
  sessionId: string;
  onSubmit?: (feedback: {
    difficulty_level: string;
    would_recommend: boolean;
    feedback: string;
  }) => void;
  isSubmitting?: boolean;
}

export function SessionFeedbackForm({
  sessionId,
  onSubmit,
  isSubmitting,
}: SessionFeedbackProps) {
  const [difficulty, setDifficulty] = useState('intermediate');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        difficulty_level: difficulty,
        would_recommend: wouldRecommend,
        feedback,
      });
    }
  };

  return (
    <GlowingCard glow="green" className="p-6 space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Session Feedback</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Help us improve by sharing your experience with this session
        </p>
      </div>

      {/* Difficulty Level */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-3">
          How would you rate the difficulty?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['easy', 'intermediate', 'hard'].map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`p-3 rounded-lg font-medium transition ${
                difficulty === level
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-800'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Would Recommend */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-3">
          Would you recommend this mentor?
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setWouldRecommend(true)}
            className={`flex-1 p-3 rounded-lg font-medium transition ${
              wouldRecommend
                ? 'bg-green-600 text-white'
                : 'bg-dark-800/50 text-gray-300 hover:bg-dark-800'
            }`}
          >
            👍 Yes
          </button>
          <button
            onClick={() => setWouldRecommend(false)}
            className={`flex-1 p-3 rounded-lg font-medium transition ${
              !wouldRecommend
                ? 'bg-red-600 text-white'
                : 'bg-dark-800/50 text-gray-300 hover:bg-dark-800'
            }`}
          >
            👎 No
          </button>
        </div>
      </div>

      {/* Feedback Text */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
          Additional Feedback (Optional)
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Tell us what you liked or could be improved..."
          rows={4}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all"
        />
      </div>

      {/* Submit Button */}
      <GlowingButton
        onClick={handleSubmit}
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </GlowingButton>
    </GlowingCard>
  );
}

export default SessionFeedbackForm;
