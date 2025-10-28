-- Script SQL pour ajouter des crédits directement dans Supabase
-- Remplace 'USER_ID' et AMOUNT par les vraies valeurs

-- 1. Ajouter une entrée dans le ledger
INSERT INTO credit_ledger (
  id,
  "userId", 
  delta,
  reason,
  metadata,
  "createdAt"
) VALUES (
  gen_random_uuid(),
  'USER_ID', -- Remplace par l'ID de l'utilisateur
  AMOUNT,    -- Remplace par le nombre de crédits à ajouter
  'MANUAL_ADJUST',
  '{"note": "Admin adjustment", "adminAction": true}',
  NOW()
);

-- 2. Mettre à jour le solde
INSERT INTO credit_balances (
  "userId",
  credits,
  "updatedAt"
) VALUES (
  'USER_ID', -- Même ID utilisateur
  AMOUNT,    -- Même nombre de crédits
  NOW()
)
ON CONFLICT ("userId") 
DO UPDATE SET 
  credits = credit_balances.credits + EXCLUDED.credits,
  "updatedAt" = NOW();
