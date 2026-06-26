export function isWithinCancellationWindow(scheduledAt: string | Date, minNoticeHours: number): boolean {
  const hoursUntil = (new Date(scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursUntil < minNoticeHours;
}
