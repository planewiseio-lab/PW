import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Request ID propagation
  const reqId = request.headers.get("x-request-id") || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  // Redirect www to non-www (SEO best practice)
  const hostname = request.headers.get("host") || "";
  if (hostname.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.hostname = hostname.replace("www.", "");
    const res = NextResponse.redirect(url);
    res.headers.set("X-Request-Id", reqId);
    return res;
  }

  // Vérifier si Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si Supabase n'est pas configuré, passer la requête sans authentification
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl === "https://your-project.supabase.co" ||
    supabaseAnonKey === "your-anon-key-here"
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired - required for Server Components
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Only log errors for debugging, but don't block requests
    if (error && !error.message.includes("Auth session missing")) {
      console.log(`[Middleware] 🔍 Error:`, error.message);
    }

    // Si erreur 403, nettoyer les cookies de session
    if (
      error &&
      (error.message.includes("403") || error.message.includes("Forbidden"))
    ) {
      console.log("403 error in middleware, clearing session...");
      // Nettoyer tous les cookies de session Supabase
      const allCookies = request.cookies.getAll();
      allCookies.forEach((cookie) => {
        if (
          cookie.name.includes("sb-") &&
          cookie.name.includes("-auth-token")
        ) {
          supabaseResponse.cookies.delete(cookie.name);
        }
      });
    }
  } catch (err) {
    console.error("Error in middleware auth check:", err);
  }

  supabaseResponse.headers.set("X-Request-Id", reqId);
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
