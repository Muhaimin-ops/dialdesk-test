import { describe, expect, it } from 'vitest';
import { isRealDate, slotsFor, weekdayOf, zonedToUtc } from './time';
import type { Hours } from './types';

const hours: Hours = {
  sun: null, mon: { open: '09:00', close: '11:00' }, tue: { open: '09:00', close: '17:00' },
  wed: null, thu: null, fri: null, sat: null,
};

describe('zonedToUtc', () => {
  it('handles winter and summer offsets in New York', () => {
    expect(zonedToUtc('2026-01-15', '09:00', 'America/New_York').toISOString()).toBe('2026-01-15T14:00:00.000Z');
    expect(zonedToUtc('2026-07-15', '09:00', 'America/New_York').toISOString()).toBe('2026-07-15T13:00:00.000Z');
  });
  it('handles the DST switch day', () => {
    expect(zonedToUtc('2026-03-08', '12:00', 'America/New_York').toISOString()).toBe('2026-03-08T16:00:00.000Z');
  });
  it('handles zones without DST', () => {
    expect(zonedToUtc('2026-10-14', '09:00', 'Asia/Dhaka').toISOString()).toBe('2026-10-14T03:00:00.000Z');
  });
});

describe('dates and slots', () => {
  it('validates real dates', () => {
    expect(isRealDate('2026-02-29')).toBe(false);
    expect(isRealDate('2026-02-28')).toBe(true);
    expect(isRealDate('tomorrow')).toBe(false);
  });
  it('finds the weekday', () => {
    expect(weekdayOf('2026-10-15')).toBe('thu');
  });
  it('builds slot grids and respects closed days', () => {
    expect(slotsFor(hours, '2026-10-19', 30)).toEqual(['09:00', '09:30', '10:00', '10:30']); // Monday
    expect(slotsFor(hours, '2026-10-20', 120)).toHaveLength(4);
    expect(slotsFor(hours, '2026-10-21', 30)).toEqual([]); // Wednesday closed
  });
});
