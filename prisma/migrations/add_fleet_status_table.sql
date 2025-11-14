-- Create fleet_status table to store aircraft status information
CREATE TABLE IF NOT EXISTS public.fleet_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_registration TEXT NOT NULL,
  status TEXT NOT NULL, -- 'in_flight', 'on_ground', 'scheduled', 'no_flights', 'unknown'
  message TEXT,
  location TEXT,
  flight_info JSONB, -- Store flight information as JSON
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one status per user per aircraft
  UNIQUE(user_id, aircraft_registration)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fleet_status_user_id ON public.fleet_status(user_id);
CREATE INDEX IF NOT EXISTS idx_fleet_status_registration ON public.fleet_status(aircraft_registration);
CREATE INDEX IF NOT EXISTS idx_fleet_status_updated_at ON public.fleet_status(updated_at);

-- Enable RLS
ALTER TABLE public.fleet_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own fleet status
CREATE POLICY "Users can view their own fleet status"
  ON public.fleet_status
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own fleet status
CREATE POLICY "Users can insert their own fleet status"
  ON public.fleet_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own fleet status
CREATE POLICY "Users can update their own fleet status"
  ON public.fleet_status
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own fleet status
CREATE POLICY "Users can delete their own fleet status"
  ON public.fleet_status
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.fleet_status IS 'Stores the current status of aircraft in user fleets';





