import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://pckbyuijwdviuynvyvuo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2J5dWlqd2R2aXV5bnZ5dnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ3MDU1MiwiZXhwIjoyMDkwMDQ2NTUyfQ.HT_A3zI204scscEqU-JbMRgysu3XaPlEMWR21hCC2KA');

const cookie = 'AQEDARhNqeQAozJfAAABnXMblucAAAGdlyga500AaKo_0fH3HUfr6iOTwsdbxYuBQprl448muuqFNDv334QBVgG0wYUiAaQ4j_YOfxEY9daOlwwnUFcElO6y3gqt3Nl14acdvdzL4X5Bo2qzFAQJqRTN';

// Update both accounts
for (const id of ['a1924904-d808-4e24-b198-0cdf0a691ce2', 'b079eb97-04ae-4966-984e-0224877209fb']) {
  const {error} = await sb.from('agent_linkedin_accounts').update({ session_cookie: cookie, status: 'active' }).eq('id', id);
  console.log(id, error ? 'ERROR: '+error.message : 'UPDATED');
}

// Show queue state
const {data: queue} = await sb.from('agent_queue').select('full_name, status').eq('organization_id', '41bb4817-72d1-4bf4-89d3-029b094bce39').order('status');
console.log('\nQueue:');
const counts = {};
for (const q of queue || []) { counts[q.status] = (counts[q.status]||0)+1; }
console.log(counts);
