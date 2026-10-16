import { z } from 'zod';
import { supabaseAdmin } from './supabase/admin';
import type { Business } from './types';
import { formatLocal, isRealDate, localDateOf, slotsFor, weekdayOf, zonedToUtc } from './time';
import { sendBookingEmail } from './mail';

const LEAD_TIME_MS = 30 * 60 * 1000; // can't book within the next 30 minutes
const MAX_DAYS_AHEAD = 120;

const dateSchema = z.string().refine(isRealDate, 'date must be a real YYYY-MM-DD date');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM (24h)');
const text = (max: number) => z.string().trim().min(1).max(max);

const checkSchema = z.object({ date: dateSchema });
const bookSchema = z.object({
  date: dateSchema,
  time: timeSchema,
  customer_name: text(100),
  customer_phone: z.string().trim().regex(/^[+()\-.\s\d]{6,25}$/, 'phone looks invalid'),
  customer_email: z.string().trim().email().max(200).optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(500).optional(),
});
const leadSchema = z.object({
  name: text(100),
  phone: z.string().trim().regex(/^[+()\-.\s\d]{6,25}$/, 'phone looks invalid'),
  email: z.string().trim().email().max(200).optional().or(z.literal('').transform(() => undefined)),
  reason: z.string().trim().max(500).optional(),
});

type Result = Record<string, unknown>;
const fail = (error: string, extra: Result = {}): Result => ({ ok: false, error, ...extra });

async function openSlots(b: Business, date: string): Promise<string[]> {
  const candidates = slotsFor(b.hours, date, b.slot_minutes);
  if (!candidates.length) return [];
  const dayStart = zonedToUtc(date, '00:00', b.timezone);
  const dayEnd = new Date(dayStart.getTime() + 36 * 3600 * 1000); // generous; filtered by local date below
  const { data, error } = await supabaseAdmin()
    .from('appointments')
    .select('starts_at')
    .eq('business_id', b.id)
    .eq('status', 'confirmed')
    .gte('starts_at', dayStart.toISOString())
    .lt('starts_at', dayEnd.toISOString());
  if (error) throw error;
  const taken = new Set((data ?? []).map((r: { starts_at: string }) => new Date(r.starts_at).getTime()));
  const earliest = Date.now() + LEAD_TIME_MS;
  return candidates.filter((t) => {
    const start = zonedToUtc(date, t, b.timezone).getTime();
    return start >= earliest && !taken.has(start);
  });
}

function withinWindow(b: Business, date: string): string | null {
  const today = localDateOf(new Date(), b.timezone);
  if (date < today) return 'That date is in the past.';
  const limit = localDateOf(new Date(Date.now() + MAX_DAYS_AHEAD * 86400000), b.timezone);
  if (date > limit) return `We only book up to ${MAX_DAYS_AHEAD} days ahead.`;
  return null;
}

export async function runTool(b: Business, callId: string, name: string, rawArgs: unknown): Promise<Result> {
  switch (name) {
    case 'check_availability': {
      const p = checkSchema.safeParse(rawArgs);
      if (!p.success) return fail('invalid_arguments', { detail: p.error.issues[0]?.message });
      const bad = withinWindow(b, p.data.date);
      if (bad) return fail('date_not_bookable', { detail: bad });
      const day = weekdayOf(p.data.date);
      const slots = await openSlots(b, p.data.date);
      if (!slots.length) {
        return { ok: true, date: p.data.date, weekday: day, open_times: [], note: 'No openings that day (closed or fully booked). Try another date.' };
      }
      return { ok: true, date: p.data.date, weekday: day, open_times: slots.slice(0, 24), slot_minutes: b.slot_minutes };
    }

    case 'book_appointment': {
      const p = bookSchema.safeParse(rawArgs);
      if (!p.success) return fail('invalid_arguments', { detail: p.error.issues[0]?.message });
      const a = p.data;
      const bad = withinWindow(b, a.date);
      if (bad) return fail('date_not_bookable', { detail: bad });
      if (!slotsFor(b.hours, a.date, b.slot_minutes).includes(a.time)) {
        return fail('time_not_available', { detail: 'That time is outside opening hours or not on the slot grid. Call check_availability.' });
      }
      const start = zonedToUtc(a.date, a.time, b.timezone);
      if (start.getTime() < Date.now() + LEAD_TIME_MS) return fail('too_soon', { detail: 'That time is too soon to book.' });
      const end = new Date(start.getTime() + b.slot_minutes * 60000);
      const { error } = await supabaseAdmin().from('appointments').insert({
        business_id: b.id,
        call_id: callId,
        customer_name: a.customer_name,
        customer_phone: a.customer_phone,
        customer_email: a.customer_email ?? null,
        notes: a.notes ?? null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      });
      if (error) {
        if (error.code === '23505') return fail('slot_taken', { detail: 'Someone just booked that time. Call check_availability again.' });
        console.error('book_appointment insert failed', error.message);
        return fail('server_error');
      }
      const when = formatLocal(start, b.timezone);
      if (a.customer_email) void sendBookingEmail({ to: a.customer_email, businessName: b.name, when, name: a.customer_name });
      return { ok: true, confirmed_for: when, timezone: b.timezone };
    }

    case 'capture_lead': {
      const p = leadSchema.safeParse(rawArgs);
      if (!p.success) return fail('invalid_arguments', { detail: p.error.issues[0]?.message });
      const { error } = await supabaseAdmin().from('leads').insert({
        business_id: b.id, call_id: callId, name: p.data.name, phone: p.data.phone,
        email: p.data.email ?? null, reason: p.data.reason ?? null,
      });
      if (error) {
        console.error('capture_lead insert failed', error.message);
        return fail('server_error');
      }
      return { ok: true, message: 'Details saved. The team will call back.' };
    }

    default:
      return fail('unknown_tool');
  }
}
