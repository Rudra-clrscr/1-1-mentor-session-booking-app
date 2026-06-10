import { Router, Response } from 'express';
import { query, queryOne } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create rating/review for a session
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, mentor_id, rating, review } = req.body;
    const student_id = req.user?.id;

    if (!session_id || !mentor_id || !rating || (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Invalid rating data' });
    }

    const ratingId = uuidv4();
    const now = new Date().toISOString();

    // Insert rating
    await query(
      `INSERT INTO ratings (id, session_id, mentor_id, student_id, rating, review, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ratingId, session_id, mentor_id, student_id, rating, review || null, now]
    );

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

    res.json({
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
    const ratings = await query(
      `SELECT r.*, u.name as student_name, u.avatar_url
       FROM ratings r
       JOIN users u ON r.student_id = u.id
       WHERE r.mentor_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.params.mentor_id]
    );

    res.json({
      success: true,
      data: ratings.rows,
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
    const { rating, review } = req.body;
    const ratingId = req.params.rating_id;

    if (!rating || (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    await query(
      'UPDATE ratings SET rating = $1, review = $2 WHERE id = $3',
      [rating, review || null, ratingId]
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
