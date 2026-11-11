const DAY_MS = 86_400_000;

/** Local calendar day as YYYY-MM-DD. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Day count on a timezone-free scale, so DST never shifts a difference. */
function toDayCount(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function diffDays(from: string, to: string): number {
  return toDayCount(to) - toDayCount(from);
}

export function addDays(key: string, days: number): string {
  const date = new Date((toDayCount(key) + days) * DAY_MS);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
