import { REMINDER_ELIGIBLE_STATUSES } from './reminderService';

describe('REMINDER_ELIGIBLE_STATUSES', () => {
  it('includes scheduled and confirmed sessions', () => {
    expect(REMINDER_ELIGIBLE_STATUSES).toContain('scheduled');
    expect(REMINDER_ELIGIBLE_STATUSES).toContain('confirmed');
  });

  it('excludes sessions that are no longer upcoming', () => {
    expect(REMINDER_ELIGIBLE_STATUSES).not.toContain('completed');
    expect(REMINDER_ELIGIBLE_STATUSES).not.toContain('cancelled');
    expect(REMINDER_ELIGIBLE_STATUSES).not.toContain('in_progress');
  });
});
