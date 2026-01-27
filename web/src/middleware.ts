import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// TODO: Create user_role enum in database, then import from database.types
type UserRole = 'admin' | 'editor' | 'reviewer' | 'viewer'

// Routes that require specific roles
// Format: { path: minimum required role }
// Role hierarchy: viewer < reviewer < editor < admin
const ROLE_ROUTES: Record<string, UserRole> = {
  '/admin': 'admin',
  '/associations': 'admin',
  '/stacks': 'admin',
  '/questions/new': 'admin',
  '/sheets/new': 'editor',
  '/customers': 'editor',
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: UserRole[] = ['viewer', 'reviewer', 'editor', 'admin']

function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole)
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)
  return userLevel >= requiredLevel
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[Middleware]', request.nextUrl.pathname, { userId: user?.id })

  // Public routes (login, home, etc.)
  const publicPaths = ['/', '/login', '/auth']
  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path)
  )

  if (isPublicPath) {
    // Redirect authenticated users away from login page
    if (request.nextUrl.pathname === '/login' && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // All other routes require authentication
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Get user's role from users table
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    // User exists in auth but not in users table - should not happen
    console.error('User authenticated but not found in users table:', user.id)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Super admins bypass all role checks
  if (userData.role === 'super_admin') {
    return supabaseResponse
  }

  // Check role-based route access
  const path = request.nextUrl.pathname

  // Check if this path requires a specific role
  for (const [routePath, requiredRole] of Object.entries(ROLE_ROUTES)) {
    if (path.startsWith(routePath)) {
      if (!hasMinimumRole(userData.role, requiredRole)) {
        // Insufficient permissions - redirect to dashboard
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
      break
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
