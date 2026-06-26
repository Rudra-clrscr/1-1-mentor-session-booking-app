export interface SessionInput {
  title?: unknown;
  scheduled_at?: unknown;
  duration_minutes?: unknown;
}

export type SessionValidationResult = { valid: true } | { valid: false; error: string };

// Shared by single-session and recurring-series creation — both ultimately
// book a slot starting at `scheduled_at`, so both need the same guards
// against empty/malformed input and past-dated bookings reaching the DB.
export function validateSessionInput(input: SessionInput): SessionValidationResult {
  if (typeof input.title !== 'string' || input.title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }

  if (input.scheduled_at !== undefined && input.scheduled_at !== null && input.scheduled_at !== '') {
    const scheduledDate = new Date(input.scheduled_at as string);
    if (Number.isNaN(scheduledDate.getTime())) {
      return { valid: false, error: 'scheduled_at must be a valid date' };
    }
    if (scheduledDate.getTime() <= Date.now()) {
      return { valid: false, error: 'scheduled_at must be in the future' };
    }
  }

  if (input.duration_minutes !== undefined && input.duration_minutes !== null) {
    const duration = Number(input.duration_minutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      return { valid: false, error: 'duration_minutes must be a positive number' };
    }
  }

  return { valid: true };
}
