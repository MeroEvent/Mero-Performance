import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes — no auth required
  const publicRoutes = ['/login', '/forgot-password', '/register', '/leave-action'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // 1. Not logged in + trying to access protected route → redirect to /login
  if (!user && !isPublicRoute && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Determine user role from database (no hardcoded email checks)
  let userRole = 'staff';
  if (user) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && profile?.role) {
        userRole = profile.role;
      } else {
        console.error('Failed to fetch user role from database:', error);
      }
    } catch (e) {
      console.error('Error fetching user role:', e);
    }
  }

  // 3. Logged in + trying to access login/register/root → redirect to their dashboard
  if (user && (isPublicRoute || pathname === '/')) {
    const url = request.nextUrl.clone();
    if (userRole === 'admin') {
      url.pathname = '/admin';
    } else if (userRole === 'manager') {
      url.pathname = '/manager';
    } else {
      url.pathname = '/employee';
    }
    return NextResponse.redirect(url);
  }

  // 4. Role-based route protection
  if (user) {
    // Block non-admins from /admin routes
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = userRole === 'manager' ? '/manager' : '/employee';
      return NextResponse.redirect(url);
    }

    // Block staff from /manager routes
    if (pathname.startsWith('/manager') && userRole === 'staff') {
      const url = request.nextUrl.clone();
      url.pathname = '/employee';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static, _next/image (Next.js assets)
     * - favicon.ico, static files (.svg, .png, .jpg, .json, .ico, etc.)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico|txt)$|api/).*)',
  ],
};

