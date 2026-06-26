// Formats an instant for a specific recipient with an explicit timezone
// abbreviation/offset, so the same email/notification reads unambiguously
// for a mentor and student in different zones instead of silently rendering
// in the server's own timezone with no indication of what zone that is.
export function formatSessionTime(date: Date, recipientTimezone?: string): string {
  return date.toLocaleString('en-US', {
    timeZone: recipientTimezone || undefined,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
