'use client';

import { GlowingButton, GlowingCard } from './ui/GlowingComponents';

interface RecordingConsentModalProps {
  requesterName: string;
  onConsent: () => void;
  onDecline: () => void;
}

export function RecordingConsentModal({
  requesterName,
  onConsent,
  onDecline,
}: RecordingConsentModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <GlowingCard glow="purple" className="w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔴</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recording Request</h2>
        </div>

        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <span className="font-medium text-primary-600 dark:text-primary-400">{requesterName}</span>{' '}
            would like to record this session.
          </p>
          <p>Both participants must consent before recording begins.</p>
          <p className="text-accent-700 dark:text-accent-400/80">
            ⚠️ The recording is saved locally in your browser only. Nothing is uploaded
            to any server. You can download it after the session ends.
          </p>
        </div>

        <div className="flex gap-3">
          <GlowingButton onClick={onConsent} variant="secondary" className="flex-1">
            ✓ Allow Recording
          </GlowingButton>
          <GlowingButton onClick={onDecline} variant="outline" className="flex-1">
            ✕ Decline
          </GlowingButton>
        </div>
      </GlowingCard>
    </div>
  );
}

export default RecordingConsentModal;
