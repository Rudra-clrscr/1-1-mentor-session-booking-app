import { getTimezoneOffsetMs, zonedTimeToUtc } from './timezone';

describe('getTimezoneOffsetMs', () => {
  it('returns the standard-time offset outside DST', () => {
    // 2026-03-07 is the day before the US spring-forward transition.
    const offset = getTimezoneOffsetMs(new Date('2026-03-07T12:00:00.000Z'), 'America/New_York');
    expect(offset).toBe(-5 * 60 * 60 * 1000);
  });

  it('returns the daylight-saving offset once DST is in effect', () => {
    // 2026-03-08 is the day of the US spring-forward transition (2am -> 3am).
    const offset = getTimezoneOffsetMs(new Date('2026-03-08T12:00:00.000Z'), 'America/New_York');
    expect(offset).toBe(-4 * 60 * 60 * 1000);
  });

  it('returns to the standard-time offset after the fall-back transition', () => {
    // 2026-11-01 is the day of the US fall-back transition (2am -> 1am).
    const offset = getTimezoneOffsetMs(new Date('2026-11-01T12:00:00.000Z'), 'America/New_York');
    expect(offset).toBe(-5 * 60 * 60 * 1000);
  });

  it('returns UTC (zero offset) for the UTC zone', () => {
    const offset = getTimezoneOffsetMs(new Date('2026-06-01T12:00:00.000Z'), 'UTC');
    expect(offset).toBe(0);
  });
});

describe('zonedTimeToUtc', () => {
  it('converts a winter wall-clock time using the standard-time offset', () => {
    // 9am EST (UTC-5) on a January day is 14:00 UTC.
    const result = zonedTimeToUtc('2026-01-15', '09:00', 'America/New_York');
    expect(result.toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });

  it('converts a summer wall-clock time using the daylight-saving offset', () => {
    // 9am EDT (UTC-4) on a July day is 13:00 UTC.
    const result = zonedTimeToUtc('2026-07-15', '09:00', 'America/New_York');
    expect(result.toISOString()).toBe('2026-07-15T13:00:00.000Z');
  });

  it('produces a one-hour-earlier UTC instant the day after spring-forward vs the day before', () => {
    const dayBefore = zonedTimeToUtc('2026-03-07', '09:00', 'America/New_York');
    const dayAfter = zonedTimeToUtc('2026-03-08', '09:00', 'America/New_York');

    // Same wall-clock time (9am) on consecutive days is normally 24h apart in
    // UTC. Across the spring-forward transition it's 23h apart, because the
    // zone's offset from UTC shrank by an hour.
    expect(dayAfter.getTime() - dayBefore.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it('produces a one-hour-later UTC instant the day after fall-back vs the day before', () => {
    const dayBefore = zonedTimeToUtc('2026-10-31', '09:00', 'America/New_York');
    const dayAfter = zonedTimeToUtc('2026-11-01', '09:00', 'America/New_York');

    // Across the fall-back transition, the same wall-clock time is 25h apart
    // in UTC, because the zone's offset from UTC grew by an hour.
    expect(dayAfter.getTime() - dayBefore.getTime()).toBe(25 * 60 * 60 * 1000);
  });
});
