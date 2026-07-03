-- Table: submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    epic_no VARCHAR(50),
    house_no VARCHAR(50),
    id_photo_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    whatsapp_joined BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
