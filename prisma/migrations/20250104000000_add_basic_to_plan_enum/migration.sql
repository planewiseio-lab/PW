-- AlterEnum
-- Add 'BASIC' to the Plan enum and replace 'BUSINESS' with 'BASIC' in all data
-- Note: PostgreSQL doesn't allow removing enum values, so 'BUSINESS' will remain in the enum but should not be used

-- Step 1: Add 'BASIC' to the enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BASIC' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Plan')
    ) THEN
        ALTER TYPE "Plan" ADD VALUE 'BASIC';
    END IF;
END $$;

-- Step 2: Update all subscriptions that use 'BUSINESS' to use 'BASIC' instead
UPDATE subscriptions 
SET plan = 'BASIC'::"Plan"
WHERE plan = 'BUSINESS'::"Plan";

