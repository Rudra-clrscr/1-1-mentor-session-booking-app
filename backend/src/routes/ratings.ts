import { Router, Response } from 'express';
import { query, queryOne } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { moderateReviewText } from '@/utils/moderation';

const router = Router();

// Create rating/review for a session
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, rating, review, comment } = req.body;
    const reviewText = review ?? comment ?? null;
    const student_id = req.user?.id;

    if (!session_id || !rating || (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Invalid rating data' });
    }

    if (reviewText && reviewText.length > 300) {
      return res.status(400).json({ error: 'Review must be 300 characters or less' });
    }

    const moderation = moderateReviewText(reviewText);
    if (!moderation.allowed) {
      return res.status(400).json({ error: moderation.reason });
    }

    const session = await queryOne('SELECT * FROM sessions WHERE id = $1', [session_id]);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Session must be completed before it can be reviewed' });
    }

    if (session.student_id !== student_id) {
      return res.status(403).json({ error: 'Only the student in this session can leave a review' });
    }

    const mentor_id = session.mentor_id;
    const ratingId = uuidv4();
    const now = new Date().toISOString();

    try {
      await query(
        `INSERT INTO ratings (id, session_id, mentor_id, student_id, rating, review, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ratingId, session_id, mentor_id, student_id, rating, reviewText, now]
      );
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'You have already reviewed this session' });
      }
      throw err;
    }

    // Update mentor's average rating
    const avgRatingResult = await queryOne(
      `SELECT AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as count
       FROM ratings WHERE mentor_id = $1`,
      [mentor_id]
    );

    if (avgRatingResult) {
      await query(
        `UPDATE users SET avg_rating = $1, total_sessions = $2 WHERE id = $3`,
        [avgRatingResult.avg_rating || 0, avgRatingResult.count || 0, mentor_id]
      );
    }

    const newRating = await queryOne('SELECT * FROM ratings WHERE id = $1', [ratingId]);

    res.status(201).json({
      success: true,
      data: newRating,
    });
  } catch (err) {
    console.error('Create rating error:', err);
    res.status(500).json({ error: 'Failed to create rating' });
  }
});

// Shared ratings getter handler
const getRatingsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.params.mentor_id;

    const ratings = await query(
      `SELECT r.*, u.name as student_name, u.avatar_url as student_avatar
       FROM ratings r
       JOIN users u ON r.student_id = u.id
       WHERE r.mentor_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [mentorId]
    );

    const summary = await queryOne(
      `SELECT COALESCE(AVG(rating)::numeric(3,2), 0) as avg_rating, COUNT(*) as total_reviews
       FROM ratings WHERE mentor_id = $1`,
      [mentorId]
    );

    res.json({
      success: true,
      data: ratings.rows,
      avg_rating: Number(summary?.avg_rating || 0),
      total_reviews: Number(summary?.total_reviews || 0),
    });
  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
};

// Get ratings for a mentor
router.get('/mentor/:mentor_id', getRatingsHandler);
router.get('/user/:mentor_id', getRatingsHandler);

// Get rating for a session (check if already rated)
router.get('/session/:session_id', async (req: AuthRequest, res: Response) => {
  try {
    const rating = await queryOne(
      'SELECT * FROM ratings WHERE session_id = $1',
      [req.params.session_id]
    );

    res.json({
      success: true,
      data: rating || null,
    });
  } catch (err) {
    console.error('Get session rating error:', err);
    res.status(500).json({ error: 'Failed to get rating' });
  }
});

// Update rating
router.put('/:rating_id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, review, comment } = req.body;
    const reviewText = review ?? comment ?? null;
    const ratingId = req.params.rating_id;
    const studentId = req.user?.id;

    if (!rating || (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    if (reviewText && reviewText.length > 300) {
      return res.status(400).json({ error: 'Review must be 300 characters or less' });
    }

    const moderation = moderateReviewText(reviewText);
    if (!moderation.allowed) {
      return res.status(400).json({ error: moderation.reason });
    }

    const existingRating = await queryOne('SELECT * FROM ratings WHERE id = $1', [ratingId]);

    if (!existingRating) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    // Only the student who wrote the review can edit it — mentors (and
    // everyone else) may view feedback but never modify it.
    if (existingRating.student_id !== studentId) {
      return res.status(403).json({ error: 'Unauthorized to update this rating' });
    }

    await query(
      'UPDATE ratings SET rating = $1, review = $2 WHERE id = $3',
      [rating, reviewText, ratingId]
    );

    // Review text/score changed, so the mentor's average needs recomputing too.
    const avgRatingResult = await queryOne(
      `SELECT AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as count
       FROM ratings WHERE mentor_id = $1`,
      [existingRating.mentor_id]
    );

    await query(
      `UPDATE users SET avg_rating = $1, total_sessions = $2 WHERE id = $3`,
      [avgRatingResult?.avg_rating || 0, avgRatingResult?.count || 0, existingRating.mentor_id]
    );

    const updated = await queryOne('SELECT * FROM ratings WHERE id = $1', [ratingId]);

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('Update rating error:', err);
    res.status(500).json({ error: 'Failed to update rating' });
  }
});

// Delete rating
router.delete('/:rating_id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const ratingId = req.params.rating_id;
    const studentId = req.user?.id;

    // Find rating to check authorization and get mentor_id
    const rating = await queryOne(
      'SELECT * FROM ratings WHERE id = $1',
      [ratingId]
    );

    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    // Check if user is the student who wrote the review
    if (rating.student_id !== studentId) {
      return res.status(403).json({ error: 'Unauthorized to delete this rating' });
    }

    await query('DELETE FROM ratings WHERE id = $1', [ratingId]);

    // Recalculate mentor's average rating
    const avgRatingResult = await queryOne(
      `SELECT AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as count
       FROM ratings WHERE mentor_id = $1`,
      [rating.mentor_id]
    );

    await query(
      `UPDATE users SET avg_rating = $1, total_sessions = $2 WHERE id = $3`,
      [avgRatingResult?.avg_rating || 0, avgRatingResult?.count || 0, rating.mentor_id]
    );

    res.json({
      success: true,
      data: { id: ratingId },
    });
  } catch (err) {
    console.error('Delete rating error:', err);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

export default router;
