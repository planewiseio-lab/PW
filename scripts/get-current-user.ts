#!/usr/bin/env tsx

/**
 * Script pour obtenir l'ID de l'utilisateur actuellement connecté
 * Usage: npm run get:current-user
 */

// Charger les variables d'environnement
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "../src/lib/supabase/client";

async function getCurrentUser() {
  console.log("🔍 Getting current user...");

  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ Error getting user:", error);
      return null;
    }

    if (!user) {
      console.log("❌ No user found. Please make sure you're logged in.");
      return null;
    }

    console.log("✅ Current user found:");
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Created: ${user.created_at}`);

    return user;
  } catch (error) {
    console.error("💥 Error:", error);
    return null;
  }
}

async function main() {
  console.log("👤 Get Current User CLI");
  console.log("========================");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  try {
    const user = await getCurrentUser();

    if (user) {
      console.log("\n🎉 User found! You can now create a subscription with:");
      console.log(`npm run create:test-user ${user.id}`);
    } else {
      console.log("\n❌ No user found. Please:");
      console.log("1. Make sure you're logged in to your application");
      console.log("2. Open your browser's developer tools (F12)");
      console.log("3. Go to the Application/Storage tab");
      console.log("4. Look for 'supabase.auth.token' in localStorage");
      console.log("5. Copy the user ID from the token");
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
