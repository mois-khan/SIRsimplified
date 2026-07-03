const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables directly from .env.local
const envFile = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Could not find Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate 15 dummy submissions
const dummyData = Array.from({ length: 15 }).map((_, i) => ({
  name: `Test Voter ${i + 1}`,
  mobile: `98765432${(i % 10).toString().padStart(2, '0')}`,
  epic_no: `AP${1234567 + i}`,
  house_no: `1-23/${String.fromCharCode(65 + (i % 5))}`,
  status: i < 5 ? "Pending" : i < 10 ? "Found in 2002 Roll" : "Followed Up",
}));

async function seed() {
  console.log("Seeding database...");
  const { error } = await supabase.from('submissions').insert(dummyData);
  if (error) {
    console.error("Error inserting data:", error);
  } else {
    console.log("Successfully inserted 15 test members!");
  }
}

seed();
