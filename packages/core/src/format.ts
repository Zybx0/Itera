/** Compact, locale-neutral interval label for answer buttons: "<1m", "10m", "3h", "4d", "2mo", "1.5y". */
export function formatInterval(fromMs: number, toMs: number): string {
  const minutes = Math.max(0, (toMs - fromMs) / 60_000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;
  const months = days / 30.4375;
  if (months < 12) return `${Math.round(months)}mo`;
  const years = days / 365.25;
  return `${Math.round(years * 10) / 10}y`;
}
