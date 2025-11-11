import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET: Récupérer les statuts de la flotte depuis la DB
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer les statuts depuis la base de données
    // Si la table n'existe pas encore, retourner un tableau vide
    let statuses: any[] = [];
    try {
      statuses = await prisma.fleet_status.findMany({
        where: {
          user_id: user.id,
        },
        orderBy: {
          updated_at: "desc",
        },
      });
    } catch (error: any) {
      // Si la table n'existe pas encore (erreur 42P01 = table does not exist)
      if (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("relation") && error.message?.includes("does not exist")) {
        console.log("[FleetStatus] Table fleet_status does not exist yet, returning empty array");
        return NextResponse.json({
          statuses: [],
        });
      }
      // Sinon, propager l'erreur
      throw error;
    }

    const mappedStatuses = statuses.map((s) => {
      // Simplifier les statuts : tout sauf "in_flight" devient "on_ground"
      const validStatus = s.status === "in_flight" ? "in_flight" : "on_ground";
      
      return {
        registration: s.aircraft_registration,
        status: validStatus,
        message: s.message || "",
        location: s.location || "",
        flightInfo: s.flight_info || null,
        updatedAt: s.updated_at.toISOString(),
      };
    });

    console.log(`[FleetStatus] Returning ${mappedStatuses.length} statuses:`, mappedStatuses.map(s => ({ reg: s.registration, status: s.status })));

    return NextResponse.json({
      statuses: mappedStatuses,
    });
  } catch (error: any) {
    console.error("[FleetStatus] Error fetching statuses:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

// POST: Sauvegarder les statuts de la flotte dans la DB
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { statuses } = body;

    if (!Array.isArray(statuses)) {
      return NextResponse.json(
        { error: "statuses must be an array" },
        { status: 400 }
      );
    }

    // Sauvegarder chaque statut (upsert)
    for (const status of statuses) {
      const { registration, status: statusValue, message, location, flightInfo } = status;

      await prisma.fleet_status.upsert({
        where: {
          user_id_aircraft_registration: {
            user_id: user.id,
            aircraft_registration: registration,
          },
        },
        update: {
          status: statusValue,
          message: message || null,
          location: location || null,
          flight_info: flightInfo || null,
          updated_at: new Date(),
        },
        create: {
          user_id: user.id,
          aircraft_registration: registration,
          status: statusValue,
          message: message || null,
          location: location || null,
          flight_info: flightInfo || null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[FleetStatus] Error saving statuses:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

