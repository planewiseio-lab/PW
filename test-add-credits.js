// Script de test pour ajouter des crédits via l'API REST Supabase
// Remplace les valeurs par tes vraies données

const SUPABASE_URL = "TON_SUPABASE_URL";
const SUPABASE_SERVICE_KEY = "TON_SERVICE_KEY";

async function addCreditsDirectly() {
  const userId = "38fc6fe6-e3b2-406d-b5db-a8a68e6b3242"; // ID de jrdenis34@gmail.com
  const amount = 50;

  // 1. Ajouter dans credit_ledger
  const ledgerResponse = await fetch(`${SUPABASE_URL}/rest/v1/credit_ledger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      userId: userId,
      delta: amount,
      reason: "MANUAL_ADJUST",
      metadata: { note: "Test admin adjustment" },
      createdAt: new Date().toISOString(),
    }),
  });

  console.log("Ledger response:", await ledgerResponse.json());

  // 2. Mettre à jour credit_balances
  const balanceResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/credit_balances`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        userId: userId,
        credits: amount,
        updatedAt: new Date().toISOString(),
      }),
    }
  );

  console.log("Balance response:", await balanceResponse.json());
}

// Exécuter le script
addCreditsDirectly();
