-- Corriger le type de colonne aircraft_age pour accepter les décimales

-- Changer le type de INTEGER à NUMERIC pour accepter les décimales
ALTER TABLE user_favorites 
ALTER COLUMN aircraft_age TYPE NUMERIC(3,1);

-- Commentaire pour documenter le changement
COMMENT ON COLUMN user_favorites.aircraft_age IS 'Aircraft age in years (can include decimals like 15.9)';

-- Vérifier que la colonne a été modifiée
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns 
WHERE table_name = 'user_favorites' AND column_name = 'aircraft_age';
