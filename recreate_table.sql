-- 1. Drop the old table completely to wipe all duplicates and old schema
DROP TABLE IF EXISTS public.electors_2002;

-- 2. Create the new table with EVERY edge case column from the electoral roll
CREATE TABLE public.electors_2002 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  epic_no text,
  name text,
  relative_name text,
  relation_type text,
  house_no text,
  age text,
  gender text,
  part_no text,
  serial_no text,
  section_no text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create indexes for lightning-fast searches
CREATE INDEX IF NOT EXISTS idx_electors_epic ON public.electors_2002(epic_no);
CREATE INDEX IF NOT EXISTS idx_electors_house ON public.electors_2002(house_no);

-- 4. Enable Row Level Security
ALTER TABLE public.electors_2002 ENABLE ROW LEVEL SECURITY;

-- 5. Allow Search Page to read data
CREATE POLICY "Allow public read access" ON public.electors_2002 FOR SELECT USING (true);

-- 6. Allow Local Script to insert data
CREATE POLICY "Allow public insert access" ON public.electors_2002 FOR INSERT WITH CHECK (true);

-- 7. Force cache reset
NOTIFY pgrst, 'reload schema';
