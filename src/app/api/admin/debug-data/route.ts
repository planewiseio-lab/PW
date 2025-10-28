import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Vérifier la table api_requests
    const { data: apiRequests, error: apiError } = await supabaseAdmin
      .from("api_requests")
      .select("*")
      .limit(10);

    if (apiError) {
      console.error("Error querying api_requests:", apiError);
      return NextResponse.json({ error: apiError.message }, { status: 500 });
    }

    // Vérifier la table profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .limit(5);

    if (profilesError) {
      console.error("Error querying profiles:", profilesError);
    }

    return NextResponse.json({
      api_requests: {
        count: apiRequests?.length || 0,
        sample: apiRequests?.slice(0, 3) || [],
        error: apiError?.message,
      },
      profiles: {
        count: profiles?.length || 0,
        sample: profiles?.slice(0, 3) || [],
        error: profilesError?.message,
      },
    });
  } catch (error: any) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
