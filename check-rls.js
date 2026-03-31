const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.pckbyuijwdviuynvyvuo:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2J5dWlqd2R2aXV5bnZ5dnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ3MDU1MiwiZXhwIjoyMDkwMDQ2NTUyfQ.HT_A3zI204scscEqU-JbMRgysu3XaPlEMWR21hCC2KA@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const rls = await pool.query("SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'whatsapp_messages'");
  console.log('RLS enabled:', JSON.stringify(rls.rows));

  const policies = await pool.query("SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'whatsapp_messages'");
  console.log('Policies:', JSON.stringify(policies.rows, null, 2));

  const pub = await pool.query("SELECT * FROM pg_publication_tables WHERE tablename = 'whatsapp_messages'");
  console.log('Realtime publication:', pub.rows.length > 0 ? 'YES' : 'NO');

  // Also check if there are other tables with RLS that DO have policies
  const allPolicies = await pool.query("SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename");
  console.log('All public table policies:', JSON.stringify(allPolicies.rows, null, 2));

  pool.end();
}

run().catch(e => { console.error('Error:', e.message); pool.end(); });
