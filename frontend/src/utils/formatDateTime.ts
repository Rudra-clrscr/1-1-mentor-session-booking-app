// Renders a session time with an explicit timezone abbreviation/offset
// (e.g. "Jun 27, 3:00 PM GMT+5:30") so the same instant isn't ambiguous
// between participants viewing it from different timezones — `toLocaleString`
// alone silently uses the viewer's zone with no indication of what it is.
export function formatSessionDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
