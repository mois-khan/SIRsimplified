const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function wipeAndRun() {
    console.log("Wiping all existing records from electors_2002 to remove duplicates...");
    
    let hasMore = true;
    let totalDeleted = 0;
    
    while (hasMore) {
        // Fetch 1000 IDs
        const { data, error } = await supabase.from('electors_2002').select('id').limit(1000);
        
        if (error) {
            console.error("Fetch Error:", error.message);
            break;
        }
        
        if (data && data.length > 0) {
            const ids = data.map(d => d.id);
            const { error: delError } = await supabase.from('electors_2002').delete().in('id', ids);
            if (delError) {
                console.error("Delete Error:", delError.message);
                break;
            }
            totalDeleted += ids.length;
            console.log(`Deleted ${totalDeleted} rows so far...`);
        } else {
            hasMore = false;
        }
    }
    
    console.log("Database perfectly clean!");
    console.log("Running PDF extraction script...");
    
    execSync('node scripts/process_pdfs.js', { stdio: 'inherit' });
    console.log("Extraction complete!");
}

wipeAndRun();
