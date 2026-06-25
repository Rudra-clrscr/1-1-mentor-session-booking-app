// A lightweight, dependency-free content filter for user-submitted review
// text. It isn't meant to catch everything a full moderation service would —
// just to block the obvious cases (slurs/profanity, links, spam patterns)
// before a comment is ever stored or shown on a mentor's profile.

const PROFANITY_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'piss',
  'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard',
];

function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase();
  return PROFANITY_WORDS.some((word) => new RegExp(`\\b${word}\\w*\\b`, 'i').test(normalized));
}

function containsUrl(text: string): boolean {
  return /(https?:\/\/|www\.)\S+/i.test(text);
}

function isExcessiveRepetition(text: string): boolean {
  // Same character repeated 6+ times in a row (e.g. "soooooo good", "!!!!!!!").
  return /(.)\1{5,}/.test(text);
}

function isShoutingSpam(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 12) return false;
  const upperRatio = (letters.match(/[A-Z]/g) || []).length / letters.length;
  return upperRatio > 0.8;
}

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

export function moderateReviewText(text: string | null | undefined): ModerationResult {
  if (!text) {
    return { allowed: true };
  }

  if (containsProfanity(text)) {
    return { allowed: false, reason: 'Review contains inappropriate language' };
  }

  if (containsUrl(text)) {
    return { allowed: false, reason: 'Review cannot contain links' };
  }

  if (isExcessiveRepetition(text) || isShoutingSpam(text)) {
    return { allowed: false, reason: 'Review looks like spam' };
  }

  return { allowed: true };
}
