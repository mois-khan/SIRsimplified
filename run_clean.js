const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanAndRun() {
    console.log("Truncating public.electors_2002...");
    const { error } = await supabase.from('electors_2002').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error("Truncate Error:", error.message);
    else console.log("Database wiped clean!");
    
    console.log("Running process_pdfs.js...");
    execSync('node scripts/process_pdfs.js', { stdio: 'inherit' });
    console.log("Finished!");
}

cleanAndRun();
