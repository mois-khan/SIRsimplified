const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSearch() {
    const query = "9-10";
    const { data, error } = await supabase
      .from("electors_2002")
      .select("*")
      .or(`epic_no.ilike.%${query}%,house_no.ilike.%${query}%`)
      .limit(5);
      
    if (error) console.error("Search Error:", error.message);
    else console.log("Search Results for 9-10:", data);
}

testSearch();
