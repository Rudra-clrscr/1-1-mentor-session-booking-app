import { buildMentorSearchPlan } from './mentorSearch';

describe('buildMentorSearchPlan', () => {
  it('defaults to page 1, limit 12, sorted by rating, verified mentor-only filter', () => {
    const plan = buildMentorSearchPlan({});
    expect(plan.page).toBe(1);
    expect(plan.limit).toBe(12);
    expect(plan.offset).toBe(0);
    expect(plan.sortColumn).toBe('u.avg_rating');
    expect(plan.whereClause).toBe(`u.role = 'mentor' AND u.verified = true`);
    expect(plan.params).toEqual([]);
  });

  it('caps limit at 50 and floors page/limit at 1', () => {
    expect(buildMentorSearchPlan({ limit: '500' }).limit).toBe(50);
    expect(buildMentorSearchPlan({ page: '0' }).page).toBe(1);
    expect(buildMentorSearchPlan({ limit: '-5' }).limit).toBe(1);
  });

  it('computes offset from page and limit', () => {
    const plan = buildMentorSearchPlan({ page: '3', limit: '10' });
    expect(plan.offset).toBe(20);
  });

  it('builds a search condition spanning name, bio, and skills', () => {
    const plan = buildMentorSearchPlan({ search: 'react' });
    expect(plan.whereClause).toContain('u.name ILIKE $1');
    expect(plan.whereClause).toContain('u.bio ILIKE $1');
    expect(plan.whereClause).toContain('us.skill_name ILIKE $1');
    expect(plan.params).toEqual(['%react%']);
  });

  it('splits comma-separated skills into an array param', () => {
    const plan = buildMentorSearchPlan({ skills: 'React, Python ,Node.js' });
    expect(plan.params).toEqual([['React', 'Python', 'Node.js']]);
    expect(plan.whereClause).toContain('us.skill_name = ANY($1)');
  });

  it('adds rating, price, industry, and language filters as separate params', () => {
    const plan = buildMentorSearchPlan({
      minRating: '4.5',
      maxPrice: '100',
      industry: 'Fintech',
      language: 'English',
    });
    expect(plan.params).toEqual([4.5, 100, 'Fintech', 'English']);
    expect(plan.whereClause).toContain('u.avg_rating >= $1');
    expect(plan.whereClause).toContain('u.hourly_rate <= $2');
    expect(plan.whereClause).toContain('u.industry = $3');
    expect(plan.whereClause).toContain('u.language = $4');
  });

  it('maps sortBy to the correct column', () => {
    expect(buildMentorSearchPlan({ sortBy: 'most_booked' }).sortColumn).toBe('u.total_sessions');
    expect(buildMentorSearchPlan({ sortBy: 'newest' }).sortColumn).toBe('u.created_at');
    expect(buildMentorSearchPlan({ sortBy: 'rating' }).sortColumn).toBe('u.avg_rating');
    expect(buildMentorSearchPlan({}).sortColumn).toBe('u.avg_rating');
  });
});
