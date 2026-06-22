'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';
import { User } from '@/types';
import {
  GlowingButton,
  GlowingInput,
  GlowingCard,
  Avatar,
  LoadingSpinner,
  Badge,
} from '@/components/ui/GlowingComponents';

type Skill = {
  skill_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'expert';
  years_experience: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar_url: '',
    skills: [] as Skill[],
    email_notifications_enabled: true,
  });
  const [newSkill, setNewSkill] = useState<Skill>({
    skill_name: '',
    proficiency_level: 'intermediate',
    years_experience: 0,
  });

  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getProfile();
        if (response.success && response.data) {
          const profileData = response.data;
          setProfile(profileData);
          setFormData({
            name: profileData.name || '',
            bio: profileData.bio || '',
            avatar_url: profileData.avatar_url || '',
            skills: profileData.skills || [],
            email_notifications_enabled: profileData.email_notifications_enabled !== false,
          });
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'hourly_rate' ? parseInt(value) : value,
    }));
  };

  const handleAddSkill = () => {
    if (!newSkill.skill_name.trim()) {
      setError('Please enter a skill name');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill],
    }));

    setNewSkill({
      skill_name: '',
      proficiency_level: 'intermediate',
      years_experience: 0,
    });
    setError('');
  };

  const handleRemoveSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await apiClient.updateProfile(formData);
      if (response.success && response.data) {
        setProfile(response.data);
        setFormData({
          name: response.data.name || '',
          bio: response.data.bio || '',
          avatar_url: response.data.avatar_url || '',
          skills: response.data.skills || [],
          email_notifications_enabled: response.data.email_notifications_enabled !== false,
        });
        setEditing(false);
      } else {
        setError('Failed to save profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Profile</h1>
          <Link href="/dashboard">
            <GlowingButton variant="outline" className="text-sm">
              Back to Dashboard
            </GlowingButton>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {!editing ? (
          // View Mode
          <GlowingCard glow="purple" className="space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar name={profile?.name} size="lg" />
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{profile?.name}</h2>
                <p className="text-gray-600 dark:text-gray-400 capitalize">{profile?.role}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  📧 Email notifications: {formData.email_notifications_enabled ? 'On' : 'Off'}
                </p>
              </div>
              <GlowingButton onClick={() => setEditing(true)} className="w-full md:w-auto">
                Edit Profile
              </GlowingButton>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About</h3>
                <p className="text-gray-700 dark:text-gray-300">{profile.bio}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-100 dark:bg-dark-800/50 rounded-lg p-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Sessions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.total_sessions || 0}</p>
              </div>
              <div className="bg-gray-100 dark:bg-dark-800/50 rounded-lg p-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Rating</p>
                <p className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">
                  {(profile?.avg_rating && typeof profile.avg_rating === 'number') ? profile.avg_rating.toFixed(1) : '0.0'}
                </p>
              </div>
              {profile?.role === 'mentor' && (
                <div className="bg-gray-100 dark:bg-dark-800/50 rounded-lg p-4">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Hourly Rate</p>
                  <p className="text-2xl font-bold text-green-500 dark:text-green-400">
                    ${profile?.hourly_rate || 0}/hr
                  </p>
                </div>
              )}
              <div className="bg-gray-100 dark:bg-dark-800/50 rounded-lg p-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Member Since</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {new Date(profile?.created_at).getFullYear()}
                </p>
              </div>
            </div>

            {/* Skills */}
            {formData.skills.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, idx) => (
                    <Badge key={idx} color="purple">
                      {skill.skill_name}
                      <span className="ml-2 text-xs opacity-80">
                        {skill.proficiency_level}
                        {skill.years_experience > 0 && ` • ${skill.years_experience}y`}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Link href="/sessions/history" className="flex-1">
                <GlowingButton className="w-full">View Session History</GlowingButton>
              </Link>
              {profile?.role === 'mentor' && (
                <Link href="/session/create" className="flex-1">
                  <GlowingButton variant="secondary" className="w-full">
                    Create Session
                  </GlowingButton>
                </Link>
              )}
            </div>
          </GlowingCard>
        ) : (
          // Edit Mode
          <GlowingCard glow="green" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>

            {/* Basic Info */}
            <div className="space-y-4">
              <GlowingInput
                label="Full Name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_notifications_enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email_notifications_enabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email me about bookings, cancellations, and session reminders
                </span>
              </label>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Skills</h3>

              {/* Existing Skills */}
              {formData.skills.length > 0 && (
                <div className="mb-4 space-y-2">
                  {formData.skills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-100 dark:bg-dark-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700/30"
                    >
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{skill.skill_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {skill.proficiency_level}
                          {skill.years_experience > 0 && ` • ${skill.years_experience} years`}
                        </p>
                      </div>
                      <GlowingButton
                        variant="outline"
                        className="py-1 px-3 text-xs bg-white dark:bg-transparent"
                        onClick={() => handleRemoveSkill(idx)}
                      >
                        Remove
                      </GlowingButton>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Skill */}
              <div className="space-y-3 bg-gray-100/50 dark:bg-dark-800/30 p-4 rounded-lg border border-gray-200/50 dark:border-gray-700/20">
                <h4 className="text-gray-900 dark:text-white font-medium">Add Skill</h4>

                <GlowingInput
                  label="Skill Name"
                  type="text"
                  value={newSkill.skill_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
                  placeholder="e.g., React, Python, Node.js"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Proficiency
                    </label>
                    <select
                      value={newSkill.proficiency_level}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setNewSkill({
                          ...newSkill,
                          proficiency_level: e.target.value as 'beginner' | 'intermediate' | 'expert',
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-white text-sm"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>

                  <GlowingInput
                    label="Years Experience"
                    type="number"
                    min="0"
                    value={newSkill.years_experience}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewSkill({ ...newSkill, years_experience: parseInt(e.target.value) })
                    }
                  />
                </div>

                <GlowingButton
                  variant="secondary"
                  className="w-full"
                  onClick={handleAddSkill}
                  disabled={!newSkill.skill_name.trim()}
                >
                  Add Skill
                </GlowingButton>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <GlowingButton
                variant="secondary"
                className="flex-1"
                onClick={() => setEditing(false)}
              >
                Cancel
              </GlowingButton>
              <GlowingButton
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </GlowingButton>
            </div>
          </GlowingCard>
        )}
      </main>
    </div>
  );
}
