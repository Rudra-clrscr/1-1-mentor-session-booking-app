export interface JoinableSession {
  mentor_id: string;
  student_id: string | null;
  status: string;
}

export type JoinDecision =
  | { action: 'reject'; status: number; error: string }
  | { action: 'noop' }
  | { action: 'claim' };

// Called while the session row is held under `SELECT ... FOR UPDATE`, so the
// 'reject' branch for an already-claimed slot is what actually closes the
// double-booking race: only one concurrent transaction can observe
// student_id === null and reach 'claim'.
export function resolveJoinDecision(session: JoinableSession, studentId: string): JoinDecision {
  if (session.mentor_id === studentId) {
    return { action: 'reject', status: 400, error: 'Mentors cannot join their own sessions' };
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    return { action: 'reject', status: 400, error: 'This session is no longer available to join' };
  }

  if (session.student_id === studentId) {
    return { action: 'noop' };
  }

  if (session.student_id) {
    return { action: 'reject', status: 409, error: 'This session has already been joined by another student' };
  }

  return { action: 'claim' };
}
