import { Router, Response } from 'express';
import { query } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';

const router = Router();

/**
 * GET /api/analytics/mentor
 * Returns aggregated stats for the logged-in mentor.
 * Protected: mentor role only.
 */
router.get('/mentor', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user?.id;

    // Role check
    const userRow = await query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1',
      [mentorId]
    );
    if (userRow.rows[0]?.role !== 'mentor') {
      return res.status(403).json({ error: 'Only mentors can view analytics' });
    }

    // ── 1. Aggregate stats ──────────────────────────────────────────────────
    const statsResult = await query<any>(
      `SELECT
         COUNT(*)                                                  AS total_sessions,
         COUNT(CASE WHEN status = 'completed' THEN 1 END)         AS completed_sessions,
         COUNT(CASE WHEN status = 'scheduled' THEN 1 END)         AS upcoming_sessions,
         COUNT(DISTINCT student_id)                               AS total_students,
         COALESCE(SUM(duration_minutes) FILTER (WHERE status = 'completed'), 0) AS total_minutes
       FROM sessions
       WHERE mentor_id = $1`,
      [mentorId]
    );

    // ── 2. Average rating ───────────────────────────────────────────────────
    const ratingResult = await query<any>(
      `SELECT
         COALESCE(AVG(rating), 0)::DECIMAL(3,2) AS avg_rating,
         COUNT(*)                               AS total_reviews
       FROM ratings
       WHERE mentor_id = $1`,
      [mentorId]
    );

    // ── 3. Sessions per week (last 8 weeks) ─────────────────────────────────
    const sessionsPerWeek = await query<any>(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', scheduled_at), 'Mon DD') AS week,
         COUNT(*)                                            AS count
       FROM sessions
       WHERE mentor_id = $1
         AND scheduled_at >= NOW() - INTERVAL '8 weeks'
       GROUP BY DATE_TRUNC('week', scheduled_at)
       ORDER BY DATE_TRUNC('week', scheduled_at)`,
      [mentorId]
    );

    // ── 4. Ratings history (last 10 ratings) ────────────────────────────────
    const ratingsHistory = await query<any>(
      `SELECT
         rating,
         TO_CHAR(created_at, 'Mon DD') AS date
       FROM ratings
       WHERE mentor_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [mentorId]
    );

    // ── 5. Recent sessions ──────────────────────────────────────────────────
    const recentSessions = await query<any>(
      `SELECT
         s.id, s.title, s.status, s.scheduled_at, s.duration_minutes,
         u.name AS student_name
       FROM sessions s
       LEFT JOIN users u ON u.id = s.student_id
       WHERE s.mentor_id = $1
       ORDER BY s.scheduled_at DESC
       LIMIT 5`,
      [mentorId]
    );

    const stats = statsResult.rows[0] ?? {};
    const ratingStats = ratingResult.rows[0] ?? {};

    res.json({
      success: true,
      data: {
        totalSessions:    parseInt(stats.total_sessions ?? '0'),
        completedSessions:parseInt(stats.completed_sessions ?? '0'),
        upcomingSessions: parseInt(stats.upcoming_sessions ?? '0'),
        totalStudents:    parseInt(stats.total_students ?? '0'),
        totalHours:       Math.round(parseInt(stats.total_minutes ?? '0') / 60),
        avgRating:        parseFloat(ratingStats.avg_rating ?? '0'),
        totalReviews:     parseInt(ratingStats.total_reviews ?? '0'),
        completionRate:   stats.total_sessions > 0
          ? Math.round((parseInt(stats.completed_sessions) / parseInt(stats.total_sessions)) * 100)
          : 0,
        sessionsByWeek:   sessionsPerWeek.rows,
        ratingsHistory:   ratingsHistory.rows.reverse(),
        recentSessions:   recentSessions.rows,
      },
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
