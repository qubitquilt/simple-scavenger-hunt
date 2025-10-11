const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testQuery() {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('id, created_at', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('Query error:', error);
    } else {
      console.log('Query success:', data);
      console.log('Count:', data?.length || 0);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

testQuery();