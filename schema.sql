-- Table: submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    epic_no VARCHAR(50),
    house_no VARCHAR(50),
    booth_no VARCHAR(50),
    blo_name VARCHAR(255),
    id_photo_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    whatsapp_joined BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT epic_unique UNIQUE (epic_no)
);

-- Note: If you are adding the unique constraint, notes, booth_no, and blo_name columns to an existing database, run:
-- ALTER TABLE submissions ADD COLUMN notes TEXT;
-- ALTER TABLE submissions ADD COLUMN booth_no VARCHAR(50);
-- ALTER TABLE submissions ADD COLUMN blo_name VARCHAR(255);
-- ALTER TABLE submissions ADD CONSTRAINT epic_unique UNIQUE (epic_no);

-- Table: electors_2002
CREATE TABLE electors_2002 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no INT,
    house_no VARCHAR(50) NOT NULL,
    elector_name VARCHAR(255) NOT NULL,
    relation_name VARCHAR(255),
    epic_no VARCHAR(50) NOT NULL,
    age INT,
    gender VARCHAR(10),
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: You also need to create a Storage Bucket in Supabase named 'voter_ids' and make it public for uploads.
-- Run the following in your Supabase SQL editor to fix the "violates row-level security policy" error:

-- 1. Create the bucket programmatically (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voter_ids', 'voter_ids', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public uploads to the bucket
CREATE POLICY "Allow public uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'voter_ids');

-- 3. Allow public viewing
CREATE POLICY "Allow public viewing" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'voter_ids');

-- 4. Allow public deletion
CREATE POLICY "Allow public deletion" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'voter_ids');
