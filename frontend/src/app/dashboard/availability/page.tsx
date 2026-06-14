'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { GlowingButton, GlowingCard, LoadingSpinner, Avatar, Badge } from '@/components/ui/GlowingComponents';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Time slots: 6:00 AM → 10:00 PM in 30-min intervals
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

// slot key: "dayIndex-HH:MM"
type SlotKey = string;

interface SavedSlot {
  day_of_week: number;
  start_time: string;  // "HH:MM:SS"
  end_time: string;
}

function toKey(day: number, time: string): SlotKey {
  return `${day}-${time}`;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AvailabilityPage() {
  const { user, logout } = useAuth();

  // Set of active slot keys
  const [activeSlots, setActiveSlots] = useState<Set<SlotKey>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode]   = useState<'add' | 'remove'>('add');

  // ── Load existing availability ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await apiClient.getMentorAvailability(user.id);
        const slots: SavedSlot[] = res.data ?? [];
        const keys = new Set<SlotKey>();

        slots.forEach((slot) => {
          // Each saved slot covers start_time → end_time in 30-min increments
          const [sh, sm] = slot.start_time.split(':').map(Number);
          const [eh, em] = slot.end_time.split(':').map(Number);
          const startMins = sh * 60 + sm;
          const endMins   = eh * 60 + em;

          for (let mins = startMins; mins < endMins; mins += 30) {
            const hh = String(Math.floor(mins / 60)).padStart(2, '0');
            const mm = String(mins % 60).padStart(2, '0');
            keys.add(toKey(slot.day_of_week, `${hh}:${mm}`));
          }
        });

        setActiveSlots(keys);
      } catch {
        setError('Could not load availability. Make sure you are logged in as a mentor.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ── Toggle a single slot ──────────────────────────────────────────────────
  const toggleSlot = useCallback((key: SlotKey, mode?: 'add' | 'remove') => {
    setActiveSlots((prev) => {
      const next = new Set(prev);
      const shouldAdd = mode === 'add' ? true : mode === 'remove' ? false : !prev.has(key);
      shouldAdd ? next.add(key) : next.delete(key);
      return next;
    });
  }, []);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = (key: SlotKey) => {
    const mode = activeSlots.has(key) ? 'remove' : 'add';
    setDragMode(mode);
    setIsDragging(true);
    toggleSlot(key, mode);
  };

  const handleMouseEnter = (key: SlotKey) => {
    if (isDragging) toggleSlot(key, dragMode);
  };

  const handleMouseUp = () => setIsDragging(false);

  // ── Select / clear full day ───────────────────────────────────────────────
  const toggleDay = (day: number) => {
    const dayKeys = TIME_SLOTS.map((t) => toKey(day, t));
    const allActive = dayKeys.every((k) => activeSlots.has(k));
    setActiveSlots((prev) => {
      const next = new Set(prev);
      dayKeys.forEach((k) => (allActive ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  // ── Convert active slots → API payload ────────────────────────────────────
  const buildPayload = () => {
    const byDay: Record<number, number[]> = {};

    activeSlots.forEach((key) => {
      const [dayStr, time] = key.split('-');
      const day = parseInt(dayStr);
      const [h, m] = time.split(':').map(Number);
      const mins = h * 60 + m;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(mins);
    });

    const slots: { dayOfWeek: number; startTime: string; endTime: string }[] = [];

    Object.entries(byDay).forEach(([dayStr, minsList]) => {
      const day = parseInt(dayStr);
      const sorted = [...minsList].sort((a, b) => a - b);

      // Merge contiguous 30-min blocks into ranges
      let rangeStart = sorted[0];
      let prev = sorted[0];

      for (let i = 1; i <= sorted.length; i++) {
        const curr = sorted[i];
        if (curr !== prev + 30) {
          const fmt = (m: number) =>
            `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
          slots.push({ dayOfWeek: day, startTime: fmt(rangeStart), endTime: fmt(prev + 30) });
          rangeStart = curr;
        }
        prev = curr;
      }
    });

    return slots;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.setMentorAvailability(buildPayload());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalSlots    = activeSlots.size;
  const totalHours    = (totalSlots * 0.5).toFixed(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 select-none"
      onMouseUp={handleMouseUp}
    >
      {/* ── Header ── */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-bold gradient-text">Availability</h1>
            <div className="flex items-center gap-3">
              <Avatar name={user?.name || 'M'} size="sm" />
              <GlowingButton variant="outline" onClick={() => logout()} className="text-xs py-1.5 px-3">
                Logout
              </GlowingButton>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {[
              { href: '/dashboard',              label: 'Dashboard' },
              { href: '/dashboard/analytics',   label: '📊 Analytics' },
              { href: '/dashboard/availability', label: '📅 Availability', active: true },
              { href: '/profile',               label: 'Profile' },
            ].map(({ href, label, active }) => (
              <Link key={href} href={href}>
                <GlowingButton variant={active ? 'primary' : 'outline'} className="text-xs py-1.5 px-3">
                  {label}
                </GlowingButton>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* ── Title + stats ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Weekly Availability 📅</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Click or drag to toggle slots. Students will see these times when booking.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold gradient-text">{totalSlots}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">slots selected</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold gradient-text">{totalHours}h</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">per week</p>
            </div>
            <GlowingButton
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold"
            >
              {saving ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save'}
            </GlowingButton>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── Legend ── */}
        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 to-green-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-dark-800 border border-gray-300 dark:border-gray-700/30" />
            <span>Unavailable</span>
          </div>
          <span className="text-gray-500 dark:text-gray-600">· Click to toggle · Drag to select multiple</span>
        </div>

        {/* ── Calendar grid ── */}
        <GlowingCard glow="purple" className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/30">
                  {/* Time column header */}
                  <th className="w-20 py-3 px-3 text-left text-gray-500 text-xs font-medium sticky left-0 bg-gray-50/80 dark:bg-dark-900/80 backdrop-blur z-10">
                    Time
                  </th>
                  {DAYS.map((day, i) => {
                    const dayKeys = TIME_SLOTS.map((t) => toKey(i, t));
                    const activeCount = dayKeys.filter((k) => activeSlots.has(k)).length;
                    const allActive = activeCount === dayKeys.length;
                    return (
                      <th key={day} className="py-3 px-2 text-center">
                        <button
                          onClick={() => toggleDay(i)}
                          className={`w-full rounded-lg py-1.5 px-2 font-semibold text-xs transition-all duration-200
                            ${allActive
                              ? 'bg-gradient-to-br from-purple-500/40 to-green-500/40 text-white border border-purple-500/50'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                        >
                          <span className="block">{DAY_SHORT[i]}</span>
                          {activeCount > 0 && (
                            <span className="block text-[10px] text-purple-400 font-normal mt-0.5">
                              {(activeCount * 0.5).toFixed(1)}h
                            </span>
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time) => (
                  <tr key={time} className="group border-b border-gray-100 dark:border-gray-700/10 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    {/* Time label */}
                    <td className="py-0.5 px-3 text-gray-500 text-[11px] font-mono whitespace-nowrap sticky left-0 bg-gray-50/80 dark:bg-dark-900/80 backdrop-blur z-10">
                      {formatTime(time)}
                    </td>
                    {DAYS.map((_, dayIdx) => {
                      const key = toKey(dayIdx, time);
                      const isActive = activeSlots.has(key);
                      return (
                        <td key={dayIdx} className="p-0.5">
                          <div
                            onMouseDown={() => handleMouseDown(key)}
                            onMouseEnter={() => handleMouseEnter(key)}
                            className={`h-7 rounded-md cursor-pointer transition-all duration-150
                              ${isActive
                                ? 'bg-gradient-to-br from-purple-500/70 to-green-500/50 border border-purple-400/40 shadow-sm shadow-purple-500/20'
                                : 'bg-gray-100 dark:bg-dark-800/40 border border-transparent hover:bg-purple-500/10 hover:border-purple-500/20'
                              }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowingCard>

        {/* ── Summary ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {DAYS.map((day, i) => {
            const count = TIME_SLOTS.filter((t) => activeSlots.has(toKey(i, t))).length;
            return (
              <GlowingCard
                key={day}
                glow={count > 0 ? 'purple' : 'blue'}
                className={`text-center py-3 px-2 ${count === 0 ? 'opacity-50' : ''}`}
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{DAY_SHORT[i]}</p>
                <p className="text-lg font-bold gradient-text">{(count * 0.5).toFixed(1)}h</p>
              </GlowingCard>
            );
          })}
        </div>

        <p className="text-center text-gray-600 dark:text-gray-500 text-xs pb-4">
          Tip: Click a day name to toggle the entire day. Drag across multiple slots to select quickly.
        </p>
      </main>
    </div>
  );
}
