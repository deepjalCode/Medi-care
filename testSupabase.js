const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://houuwfihumnrudczjynl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXV3ZmlodW1ucnVkY3pqeW5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzODY1MCwiZXhwIjoyMDg4ODE0NjUwfQ.lWjPH4sJ6XUE1l1gZ-Me1Ej_25mizf5acevC6SQU4KQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log("Listing auth users...");
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
       console.error("Admin listUsers Error:", error.message);
    } else {
       console.log("Total users found:", data.users.length);
       const doc = data.users.find(u => u.email === 'doc-000001@opd.internal');
       console.log("doc-000001 found:", !!doc);
    }

    console.log("Trying to sign in with doc-000001@opd.internal...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'doc-000001@opd.internal', 
        password: 'password123'
    });
    console.log("SignIn doc-000001 Error:", authError?.message || "Success");

  } catch(e) {
    console.error("Caught Exception:", e);
  }
}

testConnection();
