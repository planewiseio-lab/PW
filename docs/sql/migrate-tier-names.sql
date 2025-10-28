-- Migration des noms de tiers vers le nouveau format
-- Migration des noms de tiers vers le nouveau format
UPDATE api_requests SET tier = 'Tier 1' WHERE tier = 'tier1';
UPDATE api_requests SET tier = 'Tier 2' WHERE tier = 'tier2';
UPDATE api_requests SET tier = 'Tier 3' WHERE tier = 'tier3';
UPDATE api_requests SET tier = 'Tier 4' WHERE tier = 'tier4';

-- Vérification
SELECT tier, COUNT(*) as count FROM api_requests GROUP BY tier ORDER BY tier;

