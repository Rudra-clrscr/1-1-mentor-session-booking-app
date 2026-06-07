'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { User, Session } from '@/types';
import {
  GlowingButton,
  GlowingCard,
  Badge,
  Avatar,
  LoadingSpinner,
} from '@/components/ui/GlowingComponents';

export default function AdvancedBrowsePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [mentors, setMentors] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [minRating, setMinRating] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [maxHourlyRate, setMaxHourlyRate] = useState(500);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  // Available skills for filtering
  const availableSkills = [
    'JavaScript',
    'Python',
    'React',
    'Node.js',
    'TypeScript',
    'Java',
    'C++',
    'SQL',
    'Web Development',
    'Data Science',
    'Machine Learning',
  ];

  useEffect(() => {
    // TODO: Fetch mentors with skill data
    setLoading(false);
  }, []);

  // Filter and sort mentors
  const filteredMentors = mentors
    .filter((mentor) => {
      // Rating filter
      if (mentor.avg_rating < minRating) return false;

      // Hourly rate filter
      if (mentor.hourly_rate > maxHourlyRate) return false;

      // Skills filter
      if (selectedSkills.length > 0) {
        const mentorSkills = mentor.skills?.map((s: any) => s.skill_name) || [];
        const hasSkill = selectedSkills.some((skill) =>
          mentorSkills.some((ms: string) => ms.toLowerCase().includes(skill.toLowerCase()))
        );
        if (!hasSkill) return false;
      }

      // Search filter
      if (searchQuery) {
        return (
          mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          mentor.bio?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.avg_rating || 0) - (a.avg_rating || 0);
      if (sortBy === 'price') return a.hourly_rate - b.hourly_rate;
      if (sortBy === 'experience') return (b.total_sessions || 0) - (a.total_sessions || 0);
      return 0;
    });

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
            placeholder="Search by name or bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white text-sm"
                >
                  <option value="rating" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Highest Rated</option>
                  <option value="price" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Lowest Price</option>
                  <option value="experience" className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">Most Experienced</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(minRating > 0 || selectedSkills.length > 0 || maxHourlyRate < 500) && (
                <GlowingButton
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => {
                    setMinRating(0);
                    setSelectedSkills([]);
                    setMaxHourlyRate(500);
                    setSearchQuery('');
                  }}
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
            ) : filteredMentors.length === 0 ? (
              <GlowingCard glow="yellow" className="text-center py-12">
                <p className="text-yellow-600 dark:text-yellow-400 text-lg mb-4">No mentors found</p>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Try adjusting your filters or search criteria
                </p>
              </GlowingCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMentors.map((mentor) => (
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
