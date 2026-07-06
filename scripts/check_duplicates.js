require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkDuplicates() {
  const { data, error } = await supabase.from('submissions').select('id, name, epic_no, created_at');
  
  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  const epicCounts = {};
  data.forEach(sub => {
    if (!sub.epic_no) return;
    const epic = sub.epic_no.toUpperCase().trim();
    if (!epicCounts[epic]) epicCounts[epic] = [];
    epicCounts[epic].push(sub);
  });

  const duplicates = Object.keys(epicCounts).filter(epic => epicCounts[epic].length > 1);

  if (duplicates.length === 0) {
    console.log("No duplicate EPIC numbers found! You are safe to add the unique constraint.");
  } else {
    console.log(`Found ${duplicates.length} duplicate EPIC numbers:`);
    duplicates.forEach(epic => {
      console.log(`\nEPIC No: ${epic} (${epicCounts[epic].length} occurrences)`);
      epicCounts[epic].forEach(sub => {
        console.log(`  - Name: ${sub.name} (ID: ${sub.id}, Created: ${new Date(sub.created_at).toLocaleString()})`);
      });
    });
  }
}

checkDuplicates();
