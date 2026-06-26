import { isWithinCancellationWindow } from './cancellationPolicy';

describe('isWithinCancellationWindow', () => {
  const HOUR = 1000 * 60 * 60;

  it('blocks cancellation when the session starts in 1 minute', () => {
    const scheduledAt = new Date(Date.now() + 60 * 1000).toISOString();
    expect(isWithinCancellationWindow(scheduledAt, 2)).toBe(true);
  });

  it('blocks cancellation when the session has already started', () => {
    const scheduledAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(isWithinCancellationWindow(scheduledAt, 2)).toBe(true);
  });

  it('blocks cancellation right at the edge of the notice window', () => {
    const scheduledAt = new Date(Date.now() + 1.9 * HOUR).toISOString();
    expect(isWithinCancellationWindow(scheduledAt, 2)).toBe(true);
  });

  it('allows cancellation comfortably outside the notice window', () => {
    const scheduledAt = new Date(Date.now() + 5 * HOUR).toISOString();
    expect(isWithinCancellationWindow(scheduledAt, 2)).toBe(false);
  });

  it('respects a configurable threshold', () => {
    const scheduledAt = new Date(Date.now() + 3 * HOUR).toISOString();
    expect(isWithinCancellationWindow(scheduledAt, 2)).toBe(false);
    expect(isWithinCancellationWindow(scheduledAt, 4)).toBe(true);
  });

  it('accepts a Date object as well as a string', () => {
    const scheduledAt = new Date(Date.now() + 30 * 1000);
    expect(isWithinCancellationWindow(scheduledAt, 2)).toBe(true);
  });
});
