'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { GlowingButton } from '@/components/ui/GlowingComponents';

export default function Page() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-bold gradient-text animate-pulse">
          🚀 Mentor Sessions
        </h1>
        <p className="text-2xl text-gray-600 dark:text-gray-300">
          Building your real-time collaboration platform...
        </p>
        <div className="flex justify-center gap-4">
          <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        
        {/* Navigation buttons */}
        <div className="flex gap-4 justify-center pt-8">
          <Link href="/login">
            <GlowingButton className="px-8 py-3">
              Login
            </GlowingButton>
          </Link>
          <Link href="/signup">
            <GlowingButton className="px-8 py-3 bg-secondary-500/20 border-secondary-500">
              Sign Up
            </GlowingButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
