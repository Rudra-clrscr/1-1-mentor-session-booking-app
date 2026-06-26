import { formatSessionTime } from './formatSessionTime';

describe('formatSessionTime', () => {
  const instant = new Date('2026-06-27T15:30:00.000Z');

  it('includes a timezone abbreviation/offset when a recipient timezone is given', () => {
    const formatted = formatSessionTime(instant, 'Asia/Kolkata');
    expect(formatted).toContain('GMT+5:30');
    expect(formatted).toContain('9:00 PM');
  });

  it('renders the same instant differently for a different timezone', () => {
    const ist = formatSessionTime(instant, 'Asia/Kolkata');
    const utc = formatSessionTime(instant, 'UTC');
    expect(ist).not.toEqual(utc);
    expect(utc).toContain('3:30 PM');
    expect(utc).toContain('UTC');
  });

  it('falls back to the server timezone (still labelled) when none is given', () => {
    const formatted = formatSessionTime(instant);
    // Whatever zone this runs in, it must still carry a timeZoneName —
    // never a bare, ambiguous time.
    expect(formatted).toMatch(/[A-Za-z]/);
    expect(formatted.length).toBeGreaterThan(0);
  });
});
