import { resolveJoinDecision } from './sessionBooking';

describe('resolveJoinDecision', () => {
  const mentorId = 'mentor-1';
  const studentA = 'student-a';
  const studentB = 'student-b';

  it('allows the first student to claim an open session', () => {
    const session = { mentor_id: mentorId, student_id: null, status: 'scheduled' };
    expect(resolveJoinDecision(session, studentA)).toEqual({ action: 'claim' });
  });

  it('rejects a second student trying to claim a session already claimed by another student', () => {
    // This is the double-booking race condition: once one transaction has
    // committed student_id for the session, every later caller must see this
    // branch, not 'claim' — that's what makes the SELECT ... FOR UPDATE lock
    // in the route handler actually prevent concurrent double-booking.
    const session = { mentor_id: mentorId, student_id: studentA, status: 'in_progress' };
    expect(resolveJoinDecision(session, studentB)).toEqual({
      action: 'reject',
      status: 409,
      error: 'This session has already been joined by another student',
    });
  });

  it('treats the original student re-joining their own session as a no-op, not a conflict', () => {
    const session = { mentor_id: mentorId, student_id: studentA, status: 'in_progress' };
    expect(resolveJoinDecision(session, studentA)).toEqual({ action: 'noop' });
  });

  it('rejects a mentor trying to join their own session', () => {
    const session = { mentor_id: mentorId, student_id: null, status: 'scheduled' };
    expect(resolveJoinDecision(session, mentorId)).toEqual({
      action: 'reject',
      status: 400,
      error: 'Mentors cannot join their own sessions',
    });
  });

  it.each(['completed', 'cancelled'])('rejects joining a %s session even if unclaimed', (status) => {
    const session = { mentor_id: mentorId, student_id: null, status };
    expect(resolveJoinDecision(session, studentA)).toEqual({
      action: 'reject',
      status: 400,
      error: 'This session is no longer available to join',
    });
  });

  it('simulates two concurrent join attempts on the same slot: exactly one succeeds', () => {
    // Models what SELECT ... FOR UPDATE serializes in practice: both requests
    // start from the same unclaimed session, but only the request that wins
    // the row lock and commits first is evaluated against the pre-claim state.
    const initialSession = { mentor_id: mentorId, student_id: null as string | null, status: 'scheduled' };

    const first = resolveJoinDecision(initialSession, studentA);
    expect(first.action).toBe('claim');

    // After the first transaction commits, the row now has student_id set —
    // this is the state the second transaction's lock-protected SELECT sees.
    const sessionAfterFirstClaim = { ...initialSession, student_id: studentA, status: 'in_progress' };
    const second = resolveJoinDecision(sessionAfterFirstClaim, studentB);

    expect(second).toEqual({
      action: 'reject',
      status: 409,
      error: 'This session has already been joined by another student',
    });
  });
});
