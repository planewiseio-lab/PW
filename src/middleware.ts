import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Request ID propagation
  const reqId = request.headers.get("x-request-id") || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  
  // Logger les requêtes HTTP en production (optionnel, activé via variable d'environnement)
  const shouldLogRequests = process.env.LOG_REQUESTS === "true" || process.env.NODE_ENV === "development";
  const startTime = Date.now();
  
  if (shouldLogRequests) {
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname}${request.nextUrl.search}`);
  }
  
  // Redirect www to non-www (SEO best practice)
  const hostname = request.headers.get("host") || "";
  if (hostname.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.hostname = hostname.replace("www.", "");
    const res = NextResponse.redirect(url);
    res.headers.set("X-Request-Id", reqId);
    return res;
  }

  // Vérification du mode test - RESTREINT L'ACCÈS AU SITE
  const isTestMode = process.env.TEST_MODE === "true";
  const testAccessToken = process.env.TEST_ACCESS_TOKEN || "test-paddle-2024";
  const pathname = request.nextUrl.pathname;

  // Routes autorisées même en mode test
  const allowedPaths = [
    "/maintenance",
    "/api/test-access",
    "/api/health",
    "/api/metrics",
  ];

  // Vérifier si on est en mode test et si la route n'est pas autorisée
  if (isTestMode && !allowedPaths.some((path) => pathname.startsWith(path))) {
    // Vérifier si l'utilisateur a un token d'accès valide dans les cookies
    const testToken = request.cookies.get("test_access_token")?.value;

    if (testToken !== testAccessToken) {
      // Rediriger vers la page de maintenance
      const maintenanceUrl = new URL("/maintenance", request.url);
      // Préserver le token dans l'URL si présent
      if (request.nextUrl.searchParams.get("token")) {
        maintenanceUrl.searchParams.set("token", request.nextUrl.searchParams.get("token") || "");
      }
      const res = NextResponse.redirect(maintenanceUrl);
      res.headers.set("X-Request-Id", reqId);
      return res;
    }
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
      // Ne pas logger les erreurs de connexion réseau courantes (ECONNRESET, fetch failed)
      const isNetworkError = 
        error.message?.includes("fetch failed") ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("ECONNREFUSED") ||
        error.message?.includes("ETIMEDOUT");
      
      if (!isNetworkError) {
      console.log(`[Middleware] 🔍 Error:`, error.message);
      }
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
  } catch (err: any) {
    // Ne pas logger les erreurs de connexion réseau courantes
    const isNetworkError = 
      err?.message?.includes("fetch failed") ||
      err?.message?.includes("ECONNRESET") ||
      err?.message?.includes("ECONNREFUSED") ||
      err?.message?.includes("ETIMEDOUT") ||
      err?.cause?.code === "ECONNRESET";
    
    if (!isNetworkError) {
    console.error("Error in middleware auth check:", err);
    }
  }

  supabaseResponse.headers.set("X-Request-Id", reqId);
  
  // Logger la requête (le temps de réponse sera loggé par Next.js ou dans les routes API)
  // Note: En production, Next.js ne log pas automatiquement les requêtes HTTP
  // Pour voir les logs, activez LOG_REQUESTS=true dans .env.local
  if (shouldLogRequests && request.nextUrl.pathname.startsWith('/api')) {
    // Pour les routes API, on log juste la requête
    // Le temps de réponse sera loggé dans les routes individuelles si nécessaire
    console.log(`[API] ${request.method} ${request.nextUrl.pathname}${request.nextUrl.search}`);
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
