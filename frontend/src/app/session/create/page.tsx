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
    duration_minutes: 60,
    language: 'javascript',
    code_language: 'javascript',
    recording_enabled: false,
  });

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

    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.createSession(formData);
      if (res.data) {
        router.push(`/session/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
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
