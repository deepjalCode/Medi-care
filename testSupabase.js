import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://houuwfihumnrudczjynl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXV3ZmlodW1ucnVkY3pqeW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzg2NTAsImV4cCI6MjA4ODgxNDY1MH0.gy5c7tuDTPvp8cuo9aAi0wnzRP4NRz1O13JWzCCywD0';

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

  } catch (e) {
    console.error("Caught Exception:", e);
  }
}

testConnection();
