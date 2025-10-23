#!/usr/bin/env tsx

/**
 * Script pour lister tous les utilisateurs Supabase
 * Usage: npm run list:supabase-users
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";

async function listSupabaseUsers() {
  console.log("🔍 Listing Supabase users...");

  try {
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("❌ Error fetching users:", error);
      return null;
    }

    if (!users || users.length === 0) {
      console.log("❌ No users found in Supabase.");
      return null;
    }

    console.log(`✅ Found ${users.length} users in Supabase:`);
    console.log("");

    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email || "No email"}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at || "Never"}`);
      console.log("");
    });

    return users;
  } catch (error) {
    console.error("💥 Error:", error);
    return null;
  }
}

async function main() {
  console.log("👥 List Supabase Users CLI");
  console.log("==========================");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  try {
    const users = await listSupabaseUsers();

    if (users && users.length > 0) {
      console.log("🎉 Users found! You can now create subscriptions with:");
      console.log("npm run create:test-user [user-id]");
      console.log("");
      console.log("Example:");
      console.log(`npm run create:test-user ${users[0].id}`);
    } else {
      console.log(
        "❌ No users found. Please check your Supabase configuration."
      );
    }
  } catch (error) {
    console.error("\n💥 Error:", error);
    process.exit(1);
  }
}

// Gestion des signaux pour un arrêt propre
process.on("SIGINT", () => {
  console.log("\n🛑 Script interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Script terminated");
  process.exit(0);
});

// Exécuter le script
main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
