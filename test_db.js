const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log("Testing connection to Supabase...");
    
    // 1. Try to fetch a record to see what columns exist
    const { data: selectData, error: selectError } = await supabase.from('electors_2002').select('*').limit(1);
    
    if (selectError) {
        console.error("Select Error:", selectError.message);
    } else {
        console.log("Select Success. Columns retrieved:", selectData.length > 0 ? Object.keys(selectData[0]) : "Table is empty, no columns to infer from select.");
    }

    // 2. Try an insert
    console.log("\nAttempting to insert a test record...");
    const { data: insertData, error: insertError } = await supabase.from('electors_2002').insert({ 
        epic_no: 'TEST_EPIC', 
        name: 'TEST_NAME', 
        house_no: 'TEST_HOUSE' 
    }).select();

    if (insertError) {
        console.error("Insert Error:", insertError.message);
        
        // If it failed because 'name' is missing, let's try inserting without name
        if (insertError.message.includes("Could not find the 'name' column")) {
            console.log("\nTrying insert WITHOUT name...");
            const { data: insertNoName, error: noNameErr } = await supabase.from('electors_2002').insert({ epic_no: 'TEST_EPIC' });
            if (noNameErr) {
                console.error("Insert without name error:", noNameErr.message);
            } else {
                console.log("Insert without name SUCCESS. This means the 'name' column is truly missing in your DB.");
            }
        }
    } else {
        console.log("Insert Success! Record added:", insertData);
        await supabase.from('electors_2002').delete().eq('epic_no', 'TEST_EPIC');
        console.log("Test record cleaned up.");
    }
}

checkSchema();
