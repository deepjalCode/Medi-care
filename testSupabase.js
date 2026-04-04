const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://houuwfihumnrudczjynl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXV3ZmlodW1ucnVkY3pqeW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzg2NTAsImV4cCI6MjA4ODgxNDY1MH0.gy5c7tuDTPvp8cuo9aAi0wnzRP4NRz1O13JWzCCywD0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('doctors')
    .select('id, speciality, availability, users ( name )')
    .order('availability', { ascending: false });
  console.log(JSON.stringify({data, error}, null, 2));
}

run();
