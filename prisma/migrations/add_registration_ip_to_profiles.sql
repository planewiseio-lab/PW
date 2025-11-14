-- Migration: Add registration_ip to profiles table
-- Date: 2025-01-11
-- Description: Add registration_ip field to track IP addresses used during account registration
--              This helps prevent users from creating multiple accounts from the same IP within 90 days

-- Add registration_ip column to profiles table
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "registration_ip" VARCHAR(64);

-- Create index for efficient lookups of accounts by registration IP and creation date
CREATE INDEX IF NOT EXISTS "idx_profiles_registration_ip_created_at" 
ON "public"."profiles" ("registration_ip", "created_at");

-- Comment on column
COMMENT ON COLUMN "public"."profiles"."registration_ip" IS 'IP address used during account registration. Used to detect and prevent duplicate account creation from the same IP within 90 days.';

