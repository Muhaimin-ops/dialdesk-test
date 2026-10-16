import type { DayKey, Hours } from './types';

export const DAYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_LABELS: Record<DayKey, string> = {
  sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
};

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function offsetMinutes(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const p: Record<string, number> = {};
  for (const x of parts) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000) / 60000;
}

/** Convert a wall-clock date (YYYY-MM-DD) + time (HH:MM) in `tz` to a UTC Date. DST-safe. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - offsetMinutes(guess, tz) * 60000;
  const second = guess - offsetMinutes(first, tz) * 60000;
  return new Date(second);
}

export function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === date;
}

export function weekdayOf(date: string): DayKey {
  const [y, m, d] = date.split('-').map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const toHm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** All bookable start times ("HH:MM") for a date given opening hours and slot length. */
export function slotsFor(hours: Hours, date: string, slotMinutes: number): string[] {
  const day = hours[weekdayOf(date)];
  if (!day) return [];
  const out: string[] = [];
  for (let t = toMin(day.open); t + slotMinutes <= toMin(day.close); t += slotMinutes) out.push(toHm(t));
  return out;
}

export function localDateOf(utc: Date, tz: string): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(utc);
  return p; // en-CA => YYYY-MM-DD
}

export function formatLocal(utc: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(utc);
}

export function describeHours(hours: Hours): string {
  return DAYS.slice(1).concat(DAYS[0]).map((d) => {
    const h = hours[d];
    return `${DAY_LABELS[d]}: ${h ? `${h.open}-${h.close}` : 'closed'}`;
  }).join('; ');
}
