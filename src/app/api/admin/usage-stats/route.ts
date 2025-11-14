import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Lire tous les enregistrements sans limite pour avoir toutes les données
    const { data, error: dbError } = await supabaseAdmin
      .from("api_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error("[Usage Stats API] Error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    console.log(
      "[Usage Stats API] Found",
      data?.length || 0,
      "api_requests records"
    );

    // Si pas de données, retourner des données de test
    if (!data || data.length === 0) {
      console.log("[Usage Stats API] No data found, returning empty array");
      return NextResponse.json({ count: 0, data: [] });
    }

    return NextResponse.json({ count: data?.length || 0, data });
  } catch (error: any) {
    console.error("[Usage Stats API] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
