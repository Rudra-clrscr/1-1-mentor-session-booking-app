import { validateSessionInput } from './sessionValidation';

describe('validateSessionInput', () => {
  it('rejects a missing title', () => {
    expect(validateSessionInput({})).toEqual({ valid: false, error: 'Title is required' });
  });

  it('rejects an empty/whitespace-only title', () => {
    expect(validateSessionInput({ title: '' })).toEqual({ valid: false, error: 'Title is required' });
    expect(validateSessionInput({ title: '   ' })).toEqual({ valid: false, error: 'Title is required' });
  });

  it('rejects a non-string title', () => {
    expect(validateSessionInput({ title: 123 })).toEqual({ valid: false, error: 'Title is required' });
  });

  it('accepts a session with no scheduled_at (defaults to "now" downstream)', () => {
    expect(validateSessionInput({ title: 'Intro to React' })).toEqual({ valid: true });
  });

  it('rejects a malformed scheduled_at', () => {
    expect(validateSessionInput({ title: 'Intro', scheduled_at: 'not-a-date' })).toEqual({
      valid: false,
      error: 'scheduled_at must be a valid date',
    });
  });

  it('rejects a past-dated scheduled_at — the literal #107 repro', () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    expect(validateSessionInput({ title: 'Intro', scheduled_at: pastDate })).toEqual({
      valid: false,
      error: 'scheduled_at must be in the future',
    });
  });

  it('rejects a scheduled_at of exactly now', () => {
    expect(validateSessionInput({ title: 'Intro', scheduled_at: new Date(Date.now()) })).toEqual({
      valid: false,
      error: 'scheduled_at must be in the future',
    });
  });

  it('accepts a future-dated scheduled_at', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
    expect(validateSessionInput({ title: 'Intro', scheduled_at: futureDate })).toEqual({ valid: true });
  });

  it('rejects a zero or negative duration_minutes', () => {
    expect(validateSessionInput({ title: 'Intro', duration_minutes: 0 })).toEqual({
      valid: false,
      error: 'duration_minutes must be a positive number',
    });
    expect(validateSessionInput({ title: 'Intro', duration_minutes: -30 })).toEqual({
      valid: false,
      error: 'duration_minutes must be a positive number',
    });
  });

  it('rejects a non-numeric duration_minutes', () => {
    expect(validateSessionInput({ title: 'Intro', duration_minutes: 'sixty' })).toEqual({
      valid: false,
      error: 'duration_minutes must be a positive number',
    });
  });

  it('accepts a valid positive duration_minutes', () => {
    expect(validateSessionInput({ title: 'Intro', duration_minutes: 45 })).toEqual({ valid: true });
  });
});
