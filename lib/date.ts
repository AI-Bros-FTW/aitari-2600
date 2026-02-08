export function formatDate(isoDate: string): string {
  // Expecting YYYY-MM-DD (date-only).
  // Use UTC so it never shifts a day due to timezone.
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(isoDate.trim());
  if (!m) return isoDate;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  const d = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
