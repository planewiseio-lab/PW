import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCreditTables() {
  try {
    console.log("Creating credit system tables...");

    // Read the SQL file
    const sql = fs.readFileSync("create-credit-tables.sql", "utf8");

    // Execute the SQL
    const { data, error } = await supabase.rpc("exec_sql", { sql });

    if (error) {
      console.error("Error creating tables:", error);
      return;
    }

    console.log("✅ Credit system tables created successfully!");
    console.log("Tables created:");
    console.log("- subscriptions");
    console.log("- creditBalance");
    console.log("- creditLedger");
    console.log("- usageEvents");
  } catch (error) {
    console.error("Error:", error);
  }
}

createCreditTables();
