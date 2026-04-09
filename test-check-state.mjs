import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://pckbyuijwdviuynvyvuo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2J5dWlqd2R2aXV5bnZ5dnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ3MDU1MiwiZXhwIjoyMDkwMDQ2NTUyfQ.HT_A3zI204scscEqU-JbMRgysu3XaPlEMWR21hCC2KA');

// Queue state
const {data: queue} = await sb.from('agent_queue').select('full_name, status, current_stage_started_at').eq('organization_id', '41bb4817-72d1-4bf4-89d3-029b094bce39').order('updated_at', {ascending: false});
console.log('=== QUEUE STATE ===');
for (const q of queue || []) console.log(`  ${q.status.padEnd(15)} | ${q.full_name}`);

// Recent logs
const {data: logs} = await sb.from('agent_logs').select('action_type, action_detail, success, error_message, created_at').eq('organization_id', '41bb4817-72d1-4bf4-89d3-029b094bce39').order('created_at', {ascending: false}).limit(20);
console.log('\n=== RECENT LOGS ===');
for (const l of logs || []) {
  const time = new Date(l.created_at).toLocaleTimeString();
  console.log(`  ${time} | ${l.action_type.padEnd(20)} | ${l.success ? 'OK' : 'FAIL'} | ${l.action_detail || l.error_message || ''}`);
}
