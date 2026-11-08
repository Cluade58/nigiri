// Calendar days, kept apart from review moments (D58).
// A calendar day is the phone's local date as 'YYYY-MM-DD' text, never a moment, so a test day
// can't shift with time zones or daylight saving (D31). Every function takes `now`; none reads the clock.

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The local calendar day of a moment, as 'YYYY-MM-DD'. */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses 'YYYY-MM-DD' and checks it's a real calendar day ('2026-02-30' is not). */
export function parseDayKey(key: string): { y: number; m: number; d: number } | null {
  const match = DAY_KEY.exec(key);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

export function isDayKey(key: unknown): key is string {
  return typeof key === 'string' && parseDayKey(key) !== null;
}

/** Calendar days from one day key to another (negative if `to` is earlier). Counts dates, not 24-hour blocks. */
export function daysBetweenKeys(from: string, to: string): number {
  const a = parseDayKey(from);
  const b = parseDayKey(to);
  if (!a || !b) throw new Error(`Not a calendar day: ${!a ? from : to}`);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** Calendar days between the local days of two moments. */
export function calendarDaysBetween(from: Date, to: Date): number {
  return daysBetweenKeys(localDayKey(from), localDayKey(to));
}

/** The start of the local calendar day that contains `d`. */
export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** The start of the local day `n` calendar days after the day containing `d` (n may be negative). */
export function startOfLocalDayOffset(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Adds calendar days to a day key. */
export function addDaysToKey(key: string, n: number): string {
  const p = parseDayKey(key);
  if (!p) throw new Error(`Not a calendar day: ${key}`);
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}
