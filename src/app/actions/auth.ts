'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getAppUrl } from '@/lib/env';
import { safeNext } from '@/lib/business';
import { supabaseServer } from '@/lib/supabase/server';

const creds = z.object({ email: z.string().trim().email().max(200), password: z.string().min(8, 'Password must be at least 8 characters').max(200) });
const go = (path: string, key: 'error' | 'notice', msg: string): never => redirect(`${path}?${key}=${encodeURIComponent(msg)}`);

export async function login(form: FormData) {
  const p = creds.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!p.success) go('/login', 'error', p.error.issues[0]?.message ?? 'Check your details');
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(p.data!);
  if (error) go('/login', 'error', 'Incorrect email or password');
  redirect(safeNext(form.get('next')) ?? '/dashboard');
}

export async function signup(form: FormData) {
  const p = creds.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!p.success) go('/signup', 'error', p.error.issues[0]?.message ?? 'Check your details');
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    ...p.data!,
    options: { emailRedirectTo: `${await getAppUrl()}/auth/callback` },
  });
  if (error) go('/signup', 'error', error.message);
  if (data.session) redirect('/onboarding');
  go('/login', 'notice', 'Check your email to confirm your account, then sign in.');
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/');
}
