import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired - required for Server Components
  try {
    // Debug: Log all cookies
    const allCookies = request.cookies.getAll();
    console.log(`[Middleware] 🍪 Cookies count: ${allCookies.length}`);
    allCookies.forEach((cookie) => {
      if (cookie.name.includes("sb-") || cookie.name.includes("supabase")) {
        console.log(
          `[Middleware] 🍪 Auth cookie: ${
            cookie.name
          } = ${cookie.value.substring(0, 20)}...`
        );
      }
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log(`[Middleware] 🔍 User:`, user ? user.id : "null");
    console.log(`[Middleware] 🔍 Error:`, error ? error.message : "none");

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
