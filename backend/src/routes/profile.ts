import { Router, Response } from 'express';
import { query, queryOne } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';

const router = Router();

// Get own profile with skills (authenticated)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await queryOne(
      `SELECT id, email, name, role, avatar_url, bio, hourly_rate,
              total_sessions, avg_rating, verified, created_at, email_notifications_enabled
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch user skills
    const skills = await query(
      `SELECT skill_name, proficiency_level, years_experience
       FROM user_skills WHERE user_id = $1
       ORDER BY proficiency_level DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: { ...user, skills: skills.rows },
    });
  } catch (err) {
    console.error('Get own profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get user profile with skills by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne(
      `SELECT id, email, name, role, avatar_url, bio, hourly_rate, 
              total_sessions, avg_rating, verified, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch user skills
    const skills = await query(
      `SELECT skill_name, proficiency_level, years_experience 
       FROM user_skills WHERE user_id = $1 
       ORDER BY proficiency_level DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: { ...user, skills: skills.rows },
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Shared update handler
const updateProfileHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { name, bio, avatar_url, hourly_rate, skills, email_notifications_enabled } = req.body;
    const userId = req.user?.id;
    const now = new Date().toISOString();

    // Update user profile
    await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           hourly_rate = COALESCE($4, hourly_rate),
           email_notifications_enabled = COALESCE($5, email_notifications_enabled),
           updated_at = $6
       WHERE id = $7`,
      [name || null, bio || null, avatar_url || null, hourly_rate || null, email_notifications_enabled ?? null, now, userId]
    );

    // Update skills if provided
    if (skills && Array.isArray(skills)) {
      // Delete existing skills
      await query('DELETE FROM user_skills WHERE user_id = $1', [userId]);

      // Insert new skills
      for (const skill of skills) {
        if (skill.skill_name) {
          await query(
            `INSERT INTO user_skills (user_id, skill_name, proficiency_level, years_experience)
             VALUES ($1, $2, $3, $4)`,
            [userId, skill.skill_name, skill.proficiency_level || 'intermediate', skill.years_experience || 0]
          );
        }
      }
    }

    // Fetch updated profile
    const updatedUser = await queryOne(
      `SELECT id, email, name, role, avatar_url, bio, hourly_rate,
              total_sessions, avg_rating, verified, created_at, email_notifications_enabled
       FROM users WHERE id = $1`,
      [userId]
    );

    const updatedSkills = await query(
      `SELECT skill_name, proficiency_level, years_experience FROM user_skills WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: { ...updatedUser, skills: updatedSkills.rows },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Update user profile (authenticated)
router.put('/', authMiddleware, updateProfileHandler);
router.put('/profile/update', authMiddleware, updateProfileHandler);

// Add skill
router.post('/skills', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, proficiency_level, years_experience } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    // Check if skill already exists
    const existing = await queryOne(
      'SELECT * FROM user_skills WHERE user_id = $1 AND skill_name = $2',
      [userId, name]
    );

    if (existing) {
      return res.status(400).json({ error: 'Skill already exists' });
    }

    await query(
      `INSERT INTO user_skills (user_id, skill_name, proficiency_level, years_experience)
       VALUES ($1, $2, $3, $4)`,
      [userId, name, proficiency_level || 'intermediate', years_experience || 0]
    );

    const newSkill = await queryOne(
      `SELECT skill_name, proficiency_level, years_experience 
       FROM user_skills WHERE user_id = $1 AND skill_name = $2`,
      [userId, name]
    );

    res.json({
      success: true,
      data: newSkill,
    });
  } catch (err) {
    console.error('Add skill error:', err);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// Remove skill
router.delete('/skills/:skillName', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { skillName } = req.params;
    const userId = req.user?.id;

    await query(
      'DELETE FROM user_skills WHERE user_id = $1 AND skill_name = $2',
      [userId, skillName]
    );

    res.json({
      success: true,
      data: { skill_name: skillName },
    });
  } catch (err) {
    console.error('Remove skill error:', err);
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

// Get all mentors with skills
router.get('/mentors/all', async (req: AuthRequest, res: Response) => {
  try {
    const mentors = await query(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.bio, u.hourly_rate,
              u.total_sessions, u.avg_rating, u.verified, u.created_at
       FROM users u
       WHERE u.role = 'mentor'
       ORDER BY u.avg_rating DESC, u.total_sessions DESC
       LIMIT 100`
    );

    // Fetch skills for each mentor
    const mentorsList = await Promise.all(
      mentors.rows.map(async (mentor: any) => {
        const skills = await query(
          `SELECT skill_name, proficiency_level, years_experience FROM user_skills WHERE user_id = $1`,
          [mentor.id]
        );
        return { ...mentor, skills: skills.rows };
      })
    );

    res.json({
      success: true,
      data: mentorsList,
    });
  } catch (err) {
    console.error('Get mentors error:', err);
    res.status(500).json({ error: 'Failed to get mentors' });
  }
});

export default router;
