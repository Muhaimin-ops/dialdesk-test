import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase session cookie and guards the dashboard.
// Public routes (widget, embed, API, landing) are intentionally excluded by the matcher.
export async function proxy(req: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const guarded = path.startsWith('/dashboard') || path.startsWith('/onboarding');

  if (guarded && !user) {
    const to = req.nextUrl.clone();
    to.pathname = '/login';
    to.search = '';
    to.searchParams.set('next', path);
    return NextResponse.redirect(to);
  }
  if (user && (path === '/login' || path === '/signup')) {
    const to = req.nextUrl.clone();
    to.pathname = '/dashboard';
    to.search = '';
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = { matcher: ['/dashboard/:path*', '/onboarding', '/login', '/signup'] };
