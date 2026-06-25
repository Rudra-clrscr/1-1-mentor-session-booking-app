'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import {
  GlowingButton,
  GlowingCard,
  Badge,
  Avatar,
  LoadingSpinner,
} from '@/components/ui/GlowingComponents';

const PAGE_SIZE = 12;

export default function AdvancedBrowsePage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [minRating, setMinRating] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [maxHourlyRate, setMaxHourlyRate] = useState(500);
  const [industry, setIndustry] = useState('');
  const [language, setLanguage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'most_booked' | 'newest'>('rating');

  const availableSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript',
    'Java', 'C++', 'SQL', 'Web Development', 'Data Science', 'Machine Learning',
  ];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMentors = async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const response = await apiClient.getAllMentors({
        search: searchQuery || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills.join(',') : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        maxPrice: maxHourlyRate < 500 ? maxHourlyRate : undefined,
        industry: industry || undefined,
        language: language || undefined,
        sortBy,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      const data = (response as any)?.data ?? [];
      const pagination = (response as any)?.pagination;

      setMentors((prev) => (append ? [...prev, ...data] : data));
      setPage(targetPage);
      setTotalPages(pagination?.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to fetch mentors:', err);
      if (!append) setMentors([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Refetch from page 1 whenever a filter changes
  useEffect(() => {
    fetchMentors(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedSkills, minRating, maxHourlyRate, industry, language, sortBy]);

  const handleLoadMore = () => {
    if (page < totalPages) fetchMentors(page + 1, true);
  };

  const clearFilters = () => {
    setMinRating(0);
    setSelectedSkills([]);
    setMaxHourlyRate(500);
    setIndustry('');
    setLanguage('');
    setSearchInput('');
    setSearchQuery('');
  };

  const hasActiveFilters =
    minRating > 0 || selectedSkills.length > 0 || maxHourlyRate < 500 || industry || language || searchQuery;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm sticky-top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Find Your Mentor</h1>
            <Link href="/dashboard">
              <GlowingButton variant="outline" className="text-sm">
                Back
              </GlowingButton>
            </Link>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search by name, bio, or skill..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <GlowingCard glow="purple" className="p-4 md:p-6 sticky top-24 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>

              {/* Minimum Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Minimum Rating: {minRating.toFixed(1)}★
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-primary-500"
                />
              </div>

              {/* Maximum Hourly Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Max Hourly Rate: ${maxHourlyRate}
                </label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={maxHourlyRate}
                  onChange={(e) => setMaxHourlyRate(parseInt(e.target.value))}
                  className="w-full cursor-pointer accent-primary-500"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fintech, Healthcare"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <input
                  type="text"
                  placeholder="e.g. English, Spanish"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Skills Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Skills
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableSkills.map((skill) => (
                    <label key={skill} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(skill)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSkills([...selectedSkills, skill]);
                          } else {
                            setSelectedSkills(selectedSkills.filter((s) => s !== skill));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'rating' | 'most_booked' | 'newest')}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white text-sm"
                >
                  <option value="rating" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Highest Rated</option>
                  <option value="most_booked" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Most Booked</option>
                  <option value="newest" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Newest</option>
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <GlowingButton
                  variant="outline"
                  className="w-full text-sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </GlowingButton>
              )}
            </GlowingCard>
          </div>

          {/* Mentors Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center min-h-96">
                <LoadingSpinner />
              </div>
            ) : mentors.length === 0 ? (
              <GlowingCard glow="yellow" className="text-center py-12">
                <p className="text-yellow-600 dark:text-yellow-400 text-lg mb-4">No mentors found</p>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Try adjusting your filters or search criteria
                </p>
                {hasActiveFilters && (
                  <GlowingButton variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </GlowingButton>
                )}
              </GlowingCard>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mentors.map((mentor) => (
                    <GlowingCard
                      key={mentor.id}
                      glow="green"
                      className="p-6 flex flex-col hover:shadow-glow-green transition"
                    >
                      {/* Mentor Header */}
                      <div className="flex gap-4 mb-4">
                        <Avatar name={mentor.name} size="md" />
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{mentor.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{mentor.role}</p>
                          {mentor.avg_rating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-yellow-500 dark:text-yellow-400">★</span>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {mentor.avg_rating.toFixed(1)} ({mentor.total_sessions} reviews)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {mentor.bio && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">{mentor.bio}</p>
                      )}

                      {/* Skills */}
                      {mentor.skills && mentor.skills.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-2">
                            {mentor.skills.slice(0, 3).map((skill: any, idx: number) => (
                              <Badge key={idx} color="purple">
                                {skill.skill_name}
                              </Badge>
                            ))}
                            {mentor.skills.length > 3 && (
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                +{mentor.skills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Price & Button */}
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200 dark:border-gray-700/30">
                        {mentor.hourly_rate > 0 && (
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            ${mentor.hourly_rate}/hr
                          </span>
                        )}
                        <Link href={`/mentor/${mentor.id}`}>
                          <GlowingButton className="text-sm">View Profile</GlowingButton>
                        </Link>
                      </div>
                    </GlowingCard>
                  ))}
                </div>

                {page < totalPages && (
                  <div className="flex justify-center mt-8">
                    <GlowingButton
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </GlowingButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
