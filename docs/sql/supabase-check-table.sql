-- Vérifier si la table user_favorites existe et a les bonnes permissions

-- 1. Vérifier l'existence de la table
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'user_favorites';

-- 2. Vérifier la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_favorites'
ORDER BY ordinal_position;

-- 3. Vérifier les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_favorites';

-- 4. Vérifier si RLS est activé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_favorites';

-- 5. Tester une insertion simple (remplacer USER_ID par ton ID utilisateur)
-- SELECT auth.uid(); -- Pour obtenir ton user_id
-- INSERT INTO user_favorites (user_id, aircraft_registration, aircraft_type, aircraft_airline) 
-- VALUES (auth.uid(), 'TEST-123', 'Test Type', 'Test Airline');
