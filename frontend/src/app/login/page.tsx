'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GlowingButton, GlowingInput, GlowingCard, GradientText, LoadingSpinner } from '@/components/ui/GlowingComponents';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.email || !formData.password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      await login(formData);
      router.push('/dashboard');
    } catch (err: any) {
      setFormError(err.message || 'Login failed');
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
          <p className="text-gray-600 dark:text-gray-400">Welcome back to your mentorship journey</p>
        </div>

        {/* Login Form */}
        <GlowingCard glow="purple" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(formError || error) && (
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm">
                {formError || error}
              </div>
            )}

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

            <GlowingButton variant="primary" type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoadingSpinner /> : 'Sign In'}
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
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-semibold">
              Sign up
            </Link>
          </p>
        </GlowingCard>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-gray-100/50 dark:bg-dark-800/30 border border-gray-200 dark:border-gray-700/20 rounded-lg text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold text-gray-800 dark:text-gray-300 mb-2">Demo Credentials</p>
          <p>Mentor: john_mentor@example.com / password123</p>
          <p>Student: bob_student@example.com / password123</p>
        </div>
      </div>
    </div>
  );
}
