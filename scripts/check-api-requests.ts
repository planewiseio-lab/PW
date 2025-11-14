import { supabaseAdmin } from "../src/lib/supabase/admin";

async function checkApiRequests() {
  try {
    console.log("Checking api_requests table...");

    // Vérifier la structure de la table
    const { data, error } = await supabaseAdmin
      .from("api_requests")
      .select("*")
      .limit(5);

    if (error) {
      console.error("Error querying api_requests:", error);
      return;
    }

    console.log("Found", data?.length || 0, "records in api_requests");

    if (data && data.length > 0) {
      console.log("Sample record:", data[0]);

      // Compter les utilisateurs uniques
      const { data: allData, error: countError } = await supabaseAdmin
        .from("api_requests")
        .select("user_id");

      if (!countError && allData) {
        const uniqueUsers = new Set(
          allData.map((r) => r.user_id).filter(Boolean)
        );
        console.log("Unique users:", uniqueUsers.size);
        console.log("User IDs:", Array.from(uniqueUsers));
      }
    } else {
      console.log("No data found in api_requests table");
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

checkApiRequests();
