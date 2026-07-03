-- Run this in your Supabase SQL Editor

-- 1. Create the electors table for the 2002 roll
CREATE TABLE IF NOT EXISTS public.electors_2002 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  epic_no text NOT NULL,
  name text NOT NULL,
  house_no text,
  part_no text,
  serial_no text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create an index on epic_no and house_no for lightning-fast searches
CREATE INDEX IF NOT EXISTS idx_electors_epic ON public.electors_2002(epic_no);
CREATE INDEX IF NOT EXISTS idx_electors_house ON public.electors_2002(house_no);

-- 3. Set up Row Level Security (RLS) to allow public read access
ALTER TABLE public.electors_2002 ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (SELECT) the data for the public search page
CREATE POLICY "Allow public read access"
  ON public.electors_2002
  FOR SELECT
  USING (true);

-- Allow authenticated admins to INSERT/UPDATE/DELETE (optional, if you want admin UI later)
-- CREATE POLICY "Allow authenticated full access"
--   ON public.electors_2002
--   FOR ALL
--   USING (auth.role() = 'authenticated');
