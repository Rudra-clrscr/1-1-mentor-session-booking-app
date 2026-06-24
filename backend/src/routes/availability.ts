import express, { Request, Response } from 'express';
import * as db from '../database';
import { authMiddleware } from '../middleware/auth';
import { zonedTimeToUtc } from '../utils/timezone';

const router = express.Router();

// Get mentor's availability
router.get('/mentor/:mentorId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.params;

    const result = await db.query(
      `SELECT * FROM mentor_availability
       WHERE mentor_id = $1
       ORDER BY day_of_week, start_time`,
      [mentorId]
    );

    const mentor = await db.query('SELECT timezone FROM users WHERE id = $1', [mentorId]);

    res.json({
      success: true,
      data: result.rows,
      timezone: mentor.rows[0]?.timezone || 'UTC',
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Set availability slots
router.post('/mentor/slots', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { slots } = req.body;
    const userId = (req as any).user.id;

    // Delete existing slots
    await db.query('DELETE FROM mentor_availability WHERE mentor_id = $1', [userId]);

    // Insert new slots
    for (const slot of slots) {
      const { dayOfWeek, startTime, endTime } = slot;
      
      await db.query(
        `INSERT INTO mentor_availability (mentor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [userId, dayOfWeek, startTime, endTime]
      );
    }

    res.json({
      success: true,
      message: 'Availability updated successfully',
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Get available time slots for booking
router.get('/available/:mentorId', async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.params;
    const { date } = req.query;

    const mentorRow = await db.query('SELECT timezone FROM users WHERE id = $1', [mentorId]);
    const mentorTimezone = mentorRow.rows[0]?.timezone || 'UTC';

    // Day-of-week for the requested date, evaluated in the mentor's own
    // timezone (not the server's), since availability is defined relative
    // to the mentor's local calendar.
    const dayOfWeek = zonedTimeToUtc(date as string, '12:00', mentorTimezone).getUTCDay();

    const availabilityResult = await db.query(
      `SELECT start_time, end_time FROM mentor_availability
       WHERE mentor_id = $1 AND day_of_week = $2`,
      [mentorId, dayOfWeek]
    );

    if (availabilityResult.rows.length === 0) {
      return res.json({ success: true, data: [], slots: [], timezone: mentorTimezone });
    }

    // Get booked sessions for this date
    const bookedResult = await db.query(
      `SELECT scheduled_at, INTERVAL '1 hour' as duration
       FROM sessions
       WHERE mentor_id = $1 AND DATE(scheduled_at) = $2`,
      [mentorId, date]
    );

    const bookedTimes = bookedResult.rows.map((r: any) => new Date(r.scheduled_at).getTime());
    const availability = availabilityResult.rows[0];

    // Generate 1-hour time slots as absolute UTC instants, anchoring the
    // mentor's local start/end-of-day times via their stored timezone so
    // the result is correct across DST transitions.
    const slots: string[] = [];
    const start = zonedTimeToUtc(date as string, availability.start_time.slice(0, 5), mentorTimezone);
    const end = zonedTimeToUtc(date as string, availability.end_time.slice(0, 5), mentorTimezone);

    for (let time = start.getTime(); time < end.getTime(); time += 60 * 60 * 1000) {
      const isBooked = bookedTimes.some((bt) => bt === time);
      if (!isBooked) {
        slots.push(new Date(time).toISOString());
      }
    }

    res.json({ success: true, data: slots, slots, timezone: mentorTimezone });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// Calendar events for mentor
router.get('/calendar/:mentorId', async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.params;
    const { startDate, endDate } = req.query;

    // Determine user role to query correct sessions
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [mentorId]);
    const role = userResult.rows[0]?.role;

    let result;
    if (role === 'student') {
      result = await db.query(
        `SELECT id, title, scheduled_at, status 
         FROM sessions 
         WHERE student_id = $1 
         AND scheduled_at BETWEEN $2 AND $3
         ORDER BY scheduled_at`,
        [mentorId, startDate, endDate]
      );
    } else {
      result = await db.query(
        `SELECT id, title, scheduled_at, status 
         FROM sessions 
         WHERE mentor_id = $1 
         AND scheduled_at BETWEEN $2 AND $3
         ORDER BY scheduled_at`,
        [mentorId, startDate, endDate]
      );
    }

    const events = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      start: row.scheduled_at,
      status: row.status,
      color: row.status === 'completed' ? 'green' : row.status === 'cancelled' ? 'red' : 'blue',
    }));

    res.json({ success: true, data: events, events });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

export default router;
