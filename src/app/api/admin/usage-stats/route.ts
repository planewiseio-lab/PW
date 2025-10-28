import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Lire tous les enregistrements sans filtre de date pour le moment
    const { data, error } = await supabaseAdmin
      .from("api_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Usage Stats API] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: data?.length || 0, data });
  } catch (error: any) {
    console.error("[Usage Stats API] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
