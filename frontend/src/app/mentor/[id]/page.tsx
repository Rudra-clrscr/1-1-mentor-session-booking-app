'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { User, Session, SocketEvents } from '@/types';
import {
  GlowingButton,
  GlowingCard,
  Badge,
  LoadingSpinner,
} from '@/components/ui/GlowingComponents';
import { RatingsSection } from '@/components/RatingsSection';

interface Rating {
  id: string;
  rating: number;
  review: string;
  created_at: string;
  student_name: string;
  student_avatar: string;
}

interface AvailabilitySlot {
  id: string;
  mentor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function MentorProfilePage() {
  const params = useParams();
  const mentorId = params.id as string;
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [mentor, setMentor] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  // Re-fetches just the availability/sessions data, without touching the
  // mentor/ratings state — used both on initial mount and whenever the
  // server tells us this mentor's availability changed elsewhere (a
  // booking or cancellation by another viewer).
  const refetchAvailability = async () => {
    const [availResult, sessionsResult] = await Promise.allSettled([
      apiClient.getMentorAvailability(mentorId),
      apiClient.getAvailableSessions(),
    ]);

    if (availResult.status === 'fulfilled') {
      setAvailability((availResult.value as any).data || []);
    }

    if (sessionsResult.status === 'fulfilled') {
      const all = (sessionsResult.value as any).data || [];
      setSessions(all.filter((s: Session) => s.mentor_id === mentorId));
    }
  };

  useEffect(() => {
    if (!mentorId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const mentorRes = await apiClient.getUser(mentorId);
        const mentorData = mentorRes.data;

        if (!mentorData || mentorData.role !== 'mentor') {
          setNotFoundError(true);
          return;
        }
        setMentor(mentorData);
        setAvgRating(Number(mentorData.avg_rating ?? 0));
        setTotalReviews(Number(mentorData.total_sessions ?? 0));

        const ratingsResult = await apiClient.getRatings(mentorId).catch(() => null);
        if (ratingsResult) {
          const r = ratingsResult as any;
          setRatings((r.data || []).slice(0, 5));
          if (r.avg_rating !== undefined) setAvgRating(Number(r.avg_rating));
          if (r.total_reviews !== undefined) setTotalReviews(Number(r.total_reviews));
        }

        await refetchAvailability();
      } catch {
        setNotFoundError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mentorId]);

  // Watch this mentor's availability for live changes (booking/cancellation
  // by anyone, in any tab) so the slot list doesn't go stale until a reload.
  useEffect(() => {
    if (!mentorId || !isAuthenticated || !token) return;

    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    socketService.watchMentorAvailability(mentorId);

    const handleAvailabilityChanged = (data: SocketEvents['mentor:availability-changed']) => {
      if (data.mentorId === mentorId) {
        refetchAvailability();
      }
    };

    socketService.on('mentor:availability-changed', handleAvailabilityChanged);

    return () => {
      socketService.off('mentor:availability-changed', handleAvailabilityChanged);
      socketService.unwatchMentorAvailability(mentorId);
    };
  }, [mentorId, isAuthenticated, token]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (notFoundError || !mentor) {
    notFound();
  }

  const hasAvailability = availability.length > 0;

  const sortedSlots = [...availability].sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 pb-24">
      {/* Header nav */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-text">Mentor Profile</h1>
          <Link href="/browse">
            <GlowingButton variant="outline" className="text-sm">Back to Browse</GlowingButton>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Hero card ── */}
        <GlowingCard glow="purple" className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            {mentor!.avatar_url ? (
              <img
                src={mentor!.avatar_url}
                alt={mentor!.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary-500 shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold text-white shrink-0">
                {mentor!.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{mentor!.name}</h2>
                <Badge color="purple">Mentor</Badge>
                {mentor!.verified && <Badge color="green">✓ Verified</Badge>}
              </div>

              {/* Aggregated rating */}
              {avgRating > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${star <= Math.round(avgRating) ? 'text-accent-500' : 'text-gray-300 dark:text-gray-600'}`}
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-gray-700 dark:text-gray-300 text-sm ml-1">
                    {avgRating.toFixed(1)} · {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Member since */}
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Member since{' '}
                {new Date(mentor!.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Bio */}
          {mentor!.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/30">
              <h3 className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-2">
                About
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{mentor!.bio}</p>
            </div>
          )}
        </GlowingCard>

        {/* ── Availability ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Availability</h2>
          {mentor?.timezone && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              🌐 Times shown in mentor's timezone: {mentor.timezone}
            </p>
          )}
          {sortedSlots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sortedSlots.map((slot) => (
                <span
                  key={slot.id}
                  className="inline-flex items-center gap-1 text-sm bg-white dark:bg-dark-800/50 border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full"
                >
                  <span className="font-medium text-primary-600 dark:text-primary-400">
                    {DAY_NAMES[slot.day_of_week]}
                  </span>
                  <span className="text-gray-400">·</span>
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </span>
              ))}
            </div>
          ) : (
            <GlowingCard glow="blue" className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400">No availability slots set.</p>
            </GlowingCard>
          )}
        </section>

        {/* ── Available Sessions ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Available Sessions{sessions.length > 0 && ` (${sessions.length})`}
          </h2>
          {sessions.length === 0 ? (
            <GlowingCard glow="blue" className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                This mentor has no open sessions right now.
              </p>
            </GlowingCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sessions.map((session) => (
                <GlowingCard key={session.id} glow="purple" className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">{session.title}</h3>
                    <Badge color="green">{session.status}</Badge>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{session.description}</p>
                  <div className="flex gap-2 flex-wrap text-sm mb-4">
                    <Badge color="purple">{session.code_language}</Badge>
                    <span className="text-gray-500 dark:text-gray-400">{session.duration_minutes} mins</span>
                  </div>
                  {user?.role === 'student' && session.status === 'scheduled' ? (
                    <Link href={`/session/${session.id}/join`} className="block">
                      <GlowingButton variant="primary" className="w-full text-sm">
                        Join This Session
                      </GlowingButton>
                    </Link>
                  ) : (
                    <Link href={`/session/${session.id}`} className="block">
                      <GlowingButton variant="secondary" className="w-full text-sm">
                        View Details
                      </GlowingButton>
                    </Link>
                  )}
                </GlowingCard>
              ))}
            </div>
          )}
        </section>

        {/* ── Reviews ── */}
        <section>
          <RatingsSection
            mentorId={mentor!.id}
            mentorName={mentor!.name}
            ratings={ratings}
            avgRating={avgRating}
            totalReviews={totalReviews}
          />
        </section>
      </main>

      {/* ── Sticky booking CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{mentor!.name}</p>
            {avgRating > 0 && (
              <p className="text-xs text-accent-500">
                ⭐ {avgRating.toFixed(1)} · {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {hasAvailability && user?.role === 'student' ? (
            <Link href="/browse">
              <GlowingButton variant="primary" className="shrink-0 text-sm">
                Book a 1-on-1 Session
              </GlowingButton>
            </Link>
          ) : hasAvailability ? (
            <Link href="/browse">
              <GlowingButton variant="secondary" className="shrink-0 text-sm">
                View Sessions
              </GlowingButton>
            </Link>
          ) : (
            <button
              disabled
              className="shrink-0 px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-semibold rounded-lg text-sm cursor-not-allowed"
            >
              Currently Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
