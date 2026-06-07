'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GlowingButton, GlowingInput, GlowingSelect, GlowingCard, GradientText, LoadingSpinner } from '@/components/ui/GlowingComponents';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as 'mentor' | 'student',
  });
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setFormError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      await signup(formData);
      router.push('/dashboard');
    } catch (err: any) {
      setFormError(err.message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <GradientText>Mentor Sessions</GradientText>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Join our mentorship community</p>
        </div>

        {/* Signup Form */}
        <GlowingCard glow="green" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(formError || error) && (
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm">
                {formError || error}
              </div>
            )}

            <GlowingInput
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              disabled={isLoading}
            />

            <GlowingInput
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              disabled={isLoading}
            />

            <GlowingInput
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
            />

            <GlowingSelect
              label="I am a"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="student" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Student (Want to learn)</option>
              <option value="mentor" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Mentor (Willing to teach)</option>
            </GlowingSelect>

            <GlowingButton variant="secondary" type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoadingSpinner /> : 'Sign Up'}
            </GlowingButton>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-dark-800/60 text-gray-500 dark:text-gray-400">or</span>
            </div>
          </div>

          <p className="text-center text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-secondary-600 hover:text-secondary-500 dark:text-secondary-400 dark:hover:text-secondary-300 font-semibold">
              Sign in
            </Link>
          </p>
        </GlowingCard>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { icon: '🎯', label: 'Learn' },
            { icon: '💬', label: 'Chat' },
            { icon: '💻', label: 'Code' },
          ].map((feature) => (
            <div key={feature.label} className="text-center">
              <div className="text-3xl mb-2">{feature.icon}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{feature.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
