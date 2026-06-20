'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingCard, LoadingSpinner } from '@/components/ui/GlowingComponents';

// Disable Monaco's default CDN worker fetch (matches the live session editor's
// workaround) — without this, the editor can hang on "Loading…" in environments
// that block the worker script request.
if (typeof window !== 'undefined') {
  window.MonacoEnvironment = {
    getWorkerUrl: () => {
      const blob = new Blob(['self.onmessage = () => {}'], { type: 'application/javascript' });
      return URL.createObjectURL(blob);
    },
  };
}

type RecordingEvent = { code: string; language: string; user_id: string; saved_at: string };

const SPEEDS = [1, 2, 4] as const;

export default function CodeRecordingPlaybackPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [events, setEvents] = useState<RecordingEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.getCodeRecordingHistory(sessionId);
        if (res.success && res.data) {
          setTitle(res.data.session.title);
          setLanguage(res.data.session.code_language || 'javascript');
          setEvents(res.data.events || []);
        } else {
          setError('No recording available for this session.');
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || 'No recording available for this session.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [sessionId]);

  // Relative offsets (ms from the first event) used to space out playback steps
  const offsets = useMemo(() => {
    if (events.length === 0) return [];
    const t0 = new Date(events[0].saved_at).getTime();
    return events.map((e) => new Date(e.saved_at).getTime() - t0);
  }, [events]);

  useEffect(() => {
    if (!isPlaying) return;
    if (index >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    // Cap idle gaps (e.g. someone paused for minutes) so playback doesn't stall
    const rawDelay = offsets[index + 1] - offsets[index];
    const delay = Math.min(Math.max(rawDelay, 0), 4000) / speed;

    timeoutRef.current = setTimeout(() => {
      setIndex((i) => i + 1);
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, index, offsets, events.length, speed]);

  const currentEvent = events[index];
  const elapsedMs = offsets[index] ?? 0;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">
            {title ? `Playback: ${title}` : 'Code Playback'}
          </h1>
          <Link href="/sessions/history">
            <GlowingButton variant="outline" className="text-sm">
              Back to History
            </GlowingButton>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {error ? (
          <GlowingCard glow="yellow" className="text-center py-12">
            <p className="text-yellow-600 dark:text-yellow-400 text-lg">{error}</p>
          </GlowingCard>
        ) : events.length === 0 ? (
          <GlowingCard glow="yellow" className="text-center py-12">
            <p className="text-yellow-600 dark:text-yellow-400 text-lg">
              No editor activity was recorded for this session.
            </p>
          </GlowingCard>
        ) : (
          <GlowingCard glow="purple" className="space-y-4">
            <div className="h-[420px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/30">
              <Editor
                height="100%"
                language={currentEvent?.language || language}
                value={currentEvent?.code || ''}
                theme="vs-dark"
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14 }}
              />
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="range"
                min={0}
                max={Math.max(events.length - 1, 0)}
                value={index}
                onChange={(e) => {
                  setIsPlaying(false);
                  setIndex(Number(e.target.value));
                }}
                className="w-full accent-primary-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GlowingButton
                    className="text-sm py-2 px-4"
                    onClick={() => setIsPlaying((p) => !p)}
                    disabled={index >= events.length - 1 && !isPlaying}
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </GlowingButton>
                  <GlowingButton
                    variant="outline"
                    className="text-sm py-2 px-3"
                    onClick={() => {
                      setIsPlaying(false);
                      setIndex(0);
                    }}
                  >
                    ⏮ Restart
                  </GlowingButton>
                </div>

                <div className="flex items-center gap-2">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`text-xs px-2 py-1 rounded-md border ${
                        speed === s
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-gray-300 dark:border-gray-700/50 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Step {index + 1} / {events.length} &middot; {formatTime(elapsedMs)}
                </p>
              </div>
            </div>
          </GlowingCard>
        )}
      </main>
    </div>
  );
}
