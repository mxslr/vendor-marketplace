const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  console.log('URL:', url);
  console.log('Key length:', key?.length);
  
  if (!url || !key) {
    console.error('Credentials missing');
    return;
  }
  
  const supabase = createClient(url, key);
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Buckets:', data);
  }
}

run();
