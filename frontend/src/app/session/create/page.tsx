'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingInput, GlowingSelect, GlowingCard, LoadingSpinner } from '@/components/ui/GlowingComponents';

export default function CreateSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    scheduled_at: '',
    duration_minutes: 60,
    language: 'javascript',
    code_language: 'javascript',
    recording_enabled: false,
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [occurrences, setOccurrences] = useState(4);
  const [skippedDates, setSkippedDates] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration_minutes' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSkippedDates([]);

    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    if (isRecurring && !formData.scheduled_at) {
      setError('Please choose a start date/time for the recurring series');
      return;
    }

    setLoading(true);
    try {
      if (isRecurring) {
        const res = await apiClient.createRecurringSeries({
          ...formData,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
          frequency,
          occurrences,
        });
        if (res.data) {
          if (res.data.skipped.length > 0) {
            setSkippedDates(res.data.skipped);
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        const res = await apiClient.createSession({
          ...formData,
          scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : undefined,
        });
        if (res.data) {
          router.push(`/session/${res.data.id}`);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Create New Session</h1>

        <GlowingCard glow="purple">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <GlowingInput
              label="Session Title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., React Basics"
              required
              disabled={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What will you teach in this session?"
                disabled={loading}
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all duration-200 backdrop-blur-sm"
              />
            </div>

            <GlowingInput
              label="Topic (Optional)"
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="e.g., Web Development"
              disabled={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date & Time{isRecurring && ' (required for recurring series)'}
              </label>
              <input
                type="datetime-local"
                name="scheduled_at"
                value={formData.scheduled_at}
                onChange={handleChange}
                disabled={loading}
                required={isRecurring}
                className="w-full px-4 py-3 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank to make this session available immediately.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  min="15"
                  max="240"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
                />
              </div>

              <GlowingSelect
                label="Primary Language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="javascript" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">JavaScript</option>
                <option value="typescript" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">TypeScript</option>
                <option value="python" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Python</option>
                <option value="java" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Java</option>
              </GlowingSelect>
            </div>

            <GlowingSelect
              label="Code Language"
              name="code_language"
              value={formData.code_language}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="javascript" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">JavaScript</option>
              <option value="typescript" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">TypeScript</option>
              <option value="python" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Python</option>
              <option value="java" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Java</option>
              <option value="cpp" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">C++</option>
              <option value="csharp" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">C#</option>
            </GlowingSelect>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.recording_enabled}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, recording_enabled: e.target.checked }))
                }
                disabled={loading}
                className="w-4 h-4 accent-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Record code-editor activity for playback after the session
              </span>
            </label>

            <div className="border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 accent-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  🔁 Make this a recurring series
                </span>
              </label>

              {isRecurring && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
                  <GlowingSelect
                    label="Frequency"
                    name="frequency"
                    value={frequency}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                    disabled={loading}
                  >
                    <option value="weekly" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Weekly</option>
                    <option value="biweekly" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Biweekly</option>
                    <option value="monthly" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Monthly</option>
                  </GlowingSelect>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of sessions
                    </label>
                    <input
                      type="number"
                      value={occurrences}
                      onChange={(e) => setOccurrences(parseInt(e.target.value) || 2)}
                      min={2}
                      max={24}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
                    />
                  </div>

                  <p className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
                    Generates {occurrences} sessions, one every {frequency === 'biweekly' ? '2 weeks' : frequency === 'monthly' ? 'month' : 'week'}, starting at the date/time above.
                    Slots that conflict with your existing sessions will be skipped automatically.
                    A student who joins any occurrence is automatically booked for the rest of the series.
                  </p>
                </div>
              )}
            </div>

            {skippedDates.length > 0 && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-300 text-sm space-y-3">
                <p className="font-medium mb-1">Series created, but {skippedDates.length} slot(s) were skipped due to conflicts:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {skippedDates.map((d) => (
                    <li key={d}>{new Date(d).toLocaleString()}</li>
                  ))}
                </ul>
                <GlowingButton variant="primary" type="button" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </GlowingButton>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-6">
              <GlowingButton
                variant="outline"
                type="button"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </GlowingButton>
              <GlowingButton variant="primary" type="submit" disabled={loading}>
                {loading ? <LoadingSpinner /> : 'Create Session'}
              </GlowingButton>
            </div>
          </form>
        </GlowingCard>
      </div>
    </div>
  );
}
