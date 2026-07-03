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

async function updateImages() {
  console.log("Fetching submissions to update...");
  const { data: submissions, error: fetchErr } = await supabase.from('submissions').select('id').limit(3);
  
  if (fetchErr || !submissions || submissions.length === 0) {
    console.error("Error fetching:", fetchErr);
    return;
  }

  const dummyImage = "https://images.unsplash.com/photo-1634224765620-80c7f2129845?q=80&w=600&auto=format&fit=crop";

  for (const sub of submissions) {
    await supabase.from('submissions').update({ id_photo_url: dummyImage }).eq('id', sub.id);
    console.log(`Updated submission ${sub.id} with dummy image.`);
  }
  console.log("Done!");
}

updateImages();
