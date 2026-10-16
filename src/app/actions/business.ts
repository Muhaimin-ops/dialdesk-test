'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentBusiness } from '@/lib/business';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { parseOrigins } from '@/lib/origin';
import { DAYS, isValidTimeZone } from '@/lib/time';
import { INDUSTRIES, VOICES, type Hours } from '@/lib/types';

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'business';
const back = (path: string, key: string, msg: string): never => redirect(`${path}?${key}=${encodeURIComponent(msg)}`);

const onboardSchema = z.object({
  name: z.string().trim().min(2, 'Business name is too short').max(80),
  industry: z.enum(INDUSTRIES),
  timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
});

export async function createBusiness(form: FormData) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: existing } = await supabase.from('members').select('business_id').eq('user_id', user.id).limit(1).maybeSingle();
  if (existing) redirect('/dashboard');

  const p = onboardSchema.safeParse({ name: form.get('name'), industry: form.get('industry'), timezone: form.get('timezone') });
  if (!p.success) back('/onboarding', 'error', p.error.issues[0]?.message ?? 'Check your details');

  const db = supabaseAdmin();
  const { data: biz, error } = await db
    .from('businesses')
    .insert({ ...p.data!, slug: `${slugify(p.data!.name)}-${randomBytes(2).toString('hex')}` })
    .select('id')
    .single();
  if (error || !biz) {
    console.error('createBusiness failed', error?.message);
    back('/onboarding', 'error', 'Could not create your business. Please try again.');
  }
  const { error: mErr } = await db.from('members').insert({ business_id: biz!.id, user_id: user.id, role: 'owner' });
  if (mErr) {
    await db.from('businesses').delete().eq('id', biz!.id);
    back('/onboarding', 'error', 'Could not finish setup. Please try again.');
  }
  redirect('/dashboard');
}

const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const agentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  agent_name: z.string().trim().min(1).max(30),
  greeting: z.string().trim().min(3).max(300).refine((s) => !s.includes('"'), 'Greeting cannot contain double quotes'),
  instructions: z.string().trim().max(3000),
  knowledge: z.string().trim().max(6000),
  voice: z.enum(VOICES),
  industry: z.enum(INDUSTRIES),
  timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
  slot_minutes: z.coerce.number().int().min(10).max(240),
});

export async function saveAgent(form: FormData) {
  const { business, supabase } = await getCurrentBusiness();
  const p = agentSchema.safeParse(Object.fromEntries(['name', 'agent_name', 'greeting', 'instructions', 'knowledge', 'voice', 'industry', 'timezone', 'slot_minutes'].map((k) => [k, form.get(k) ?? ''])));
  if (!p.success) back('/dashboard/agent', 'error', p.error.issues[0]?.message ?? 'Check the form');

  const hours = {} as Hours;
  for (const d of DAYS) {
    const open = String(form.get(`${d}_open`) ?? '');
    const close = String(form.get(`${d}_close`) ?? '');
    const closed = form.get(`${d}_closed`) === 'on';
    if (closed) { hours[d] = null; continue; }
    if (!hm.safeParse(open).success || !hm.safeParse(close).success || open >= close) {
      back('/dashboard/agent', 'error', `Check the opening hours for ${d.toUpperCase()}: opening must be before closing.`);
    }
    hours[d] = { open, close };
  }

  const { error } = await supabase
    .from('businesses')
    .update({ ...p.data!, hours, allowed_origins: parseOrigins(String(form.get('allowed_origins') ?? '')) })
    .eq('id', business.id);
  if (error) {
    console.error('saveAgent failed', error.message);
    back('/dashboard/agent', 'error', 'Could not save changes.');
  }
  revalidatePath('/dashboard', 'layout');
  back('/dashboard/agent', 'saved', '1');
}

export async function cancelAppointment(form: FormData) {
  const { business, supabase } = await getCurrentBusiness();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return;
  await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id.data).eq('business_id', business.id);
  revalidatePath('/dashboard/appointments');
}
