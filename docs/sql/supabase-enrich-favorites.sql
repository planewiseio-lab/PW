-- Ajouter des colonnes supplémentaires à la table user_favorites
-- pour enrichir les informations des avions favoris

ALTER TABLE user_favorites 
ADD COLUMN IF NOT EXISTS aircraft_manufacturer TEXT,
ADD COLUMN IF NOT EXISTS aircraft_model TEXT,
ADD COLUMN IF NOT EXISTS aircraft_seats INTEGER,
ADD COLUMN IF NOT EXISTS aircraft_age INTEGER,
ADD COLUMN IF NOT EXISTS aircraft_engines TEXT,
ADD COLUMN IF NOT EXISTS aircraft_hex TEXT;

-- Commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN user_favorites.aircraft_manufacturer IS 'Aircraft manufacturer (e.g., Boeing, Airbus)';
COMMENT ON COLUMN user_favorites.aircraft_model IS 'Aircraft model (e.g., B789, A320)';
COMMENT ON COLUMN user_favorites.aircraft_seats IS 'Number of seats';
COMMENT ON COLUMN user_favorites.aircraft_age IS 'Aircraft age in years';
COMMENT ON COLUMN user_favorites.aircraft_engines IS 'Engine information (e.g., 2 x Jet)';
COMMENT ON COLUMN user_favorites.aircraft_hex IS 'ICAO hex code';

-- Mettre à jour les enregistrements existants avec des valeurs par défaut
UPDATE user_favorites 
SET 
  aircraft_manufacturer = 'Unknown',
  aircraft_model = 'Unknown',
  aircraft_seats = NULL,
  aircraft_age = NULL,
  aircraft_engines = NULL,
  aircraft_hex = NULL
WHERE aircraft_manufacturer IS NULL;
