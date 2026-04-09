import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://pckbyuijwdviuynvyvuo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2J5dWlqd2R2aXV5bnZ5dnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ3MDU1MiwiZXhwIjoyMDkwMDQ2NTUyfQ.HT_A3zI204scscEqU-JbMRgysu3XaPlEMWR21hCC2KA');

const cookie = 'AQEDARhNqeQBm-5PAAABnXJDuzsAAAGdllA_O00AcEMZZ_maerUE7W4jt8w8BBBhkjN5JwSluTFXDUYJL6R2RpFNyvq6c8lTnGu8N5EMCejzRxMawYErG6kdWD13FQvHoGEnTf1SJdFZBqLLL_ZASJyn';

// 1. Validate cookie first
const h = {
  'Cookie': `li_at=${cookie}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
};
const r = await fetch('https://www.linkedin.com/voyager/api/me', { headers: h, redirect: 'manual' });
console.log('Cookie validation:', r.status);
if (r.status !== 200) { console.log('COOKIE INVALID'); process.exit(1); }

// 2. Update both accounts
for (const id of ['a1924904-d808-4e24-b198-0cdf0a691ce2', 'b079eb97-04ae-4966-984e-0224877209fb']) {
  const {error} = await sb.from('agent_linkedin_accounts').update({ session_cookie: cookie, status: 'active' }).eq('id', id);
  console.log(id, error ? 'ERROR: '+error.message : 'UPDATED');
}

// 3. Check current queue state before running
const {data: queue} = await sb.from('agent_queue').select('full_name, status').eq('organization_id', '41bb4817-72d1-4bf4-89d3-029b094bce39');
console.log('\nQueue BEFORE cycle:');
for (const q of queue || []) console.log(`  ${q.full_name} → ${q.status}`);
