export interface MentorSearchQuery {
  search?: string;
  skills?: string;
  minRating?: string;
  maxPrice?: string;
  industry?: string;
  language?: string;
  sortBy?: string;
  page?: string;
  limit?: string;
}

export interface MentorSearchPlan {
  whereClause: string;
  params: any[];
  sortColumn: string;
  page: number;
  limit: number;
  offset: number;
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

export function buildMentorSearchPlan(query: MentorSearchQuery): MentorSearchPlan {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit as string, 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const skillList = typeof query.skills === 'string' && query.skills.length > 0
    ? query.skills.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const conditions: string[] = [`u.role = 'mentor'`];
  const params: any[] = [];

  if (query.search) {
    params.push(`%${query.search}%`);
    const idx = params.length;
    conditions.push(
      `(u.name ILIKE $${idx} OR u.bio ILIKE $${idx} OR EXISTS (
         SELECT 1 FROM user_skills us WHERE us.user_id = u.id AND us.skill_name ILIKE $${idx}
       ))`
    );
  }

  if (skillList.length > 0) {
    params.push(skillList);
    conditions.push(
      `EXISTS (SELECT 1 FROM user_skills us WHERE us.user_id = u.id AND us.skill_name = ANY($${params.length}))`
    );
  }

  if (query.minRating) {
    params.push(parseFloat(query.minRating));
    conditions.push(`u.avg_rating >= $${params.length}`);
  }

  if (query.maxPrice) {
    params.push(parseFloat(query.maxPrice));
    conditions.push(`u.hourly_rate <= $${params.length}`);
  }

  if (query.industry) {
    params.push(query.industry);
    conditions.push(`u.industry = $${params.length}`);
  }

  if (query.language) {
    params.push(query.language);
    conditions.push(`u.language = $${params.length}`);
  }

  const sortColumn = query.sortBy === 'most_booked'
    ? 'u.total_sessions'
    : query.sortBy === 'newest'
      ? 'u.created_at'
      : 'u.avg_rating';

  return {
    whereClause: conditions.join(' AND '),
    params,
    sortColumn,
    page,
    limit,
    offset,
  };
}
