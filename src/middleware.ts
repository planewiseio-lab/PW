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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Si erreur 403, nettoyer les cookies de session
    if (
      error &&
      (error.message.includes("403") || error.message.includes("Forbidden"))
    ) {
      console.log("403 error in middleware, clearing session...");
      // Nettoyer les cookies de session
      supabaseResponse.cookies.delete("sb-ssqqbcniphbdjttxgcug-auth-token");
      supabaseResponse.cookies.delete("sb-ssqqbcniphbdjttxgcug-auth-token.0");
      supabaseResponse.cookies.delete("sb-ssqqbcniphbdjttxgcug-auth-token.1");
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
