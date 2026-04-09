import { createClient } from '@supabase/supabase-js';

(async () => {
  const sb = createClient(
    'https://pckbyuijwdviuynvyvuo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2J5dWlqd2R2aXV5bnZ5dnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ3MDU1MiwiZXhwIjoyMDkwMDQ2NTUyfQ.HT_A3zI204scscEqU-JbMRgysu3XaPlEMWR21hCC2KA'
  );

  const { data } = await sb.from('agent_linkedin_accounts').select('session_cookie').eq('status', 'active').limit(1);
  const cookie = data[0].session_cookie;

  const hdrs = {
    'Cookie': `li_at=${cookie}; JSESSIONID="ajax:0"`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'X-Li-Lang': 'es_ES',
    'X-Restli-Protocol-Version': '2.0.0',
    'Csrf-Token': 'ajax:0',
  };

  // Test 1: Typeahead
  console.log('--- Test 1: Typeahead ---');
  try {
    const r1 = await fetch('https://www.linkedin.com/voyager/api/typeahead/hitsV2?keywords=gerente%20hotel&origin=GLOBAL_SEARCH_HEADER&q=blended&type=PEOPLE', { headers: hdrs, redirect: 'manual' });
    console.log('Status:', r1.status);
    if (r1.status === 200) {
      const d = await r1.json();
      console.log('Elements:', d?.elements?.length || 0);
      if (d?.elements?.length) console.log('First:', JSON.stringify(d.elements[0]).slice(0, 200));
    } else {
      const t = await r1.text();
      console.log('Body:', t.slice(0, 200));
    }
  } catch (e) { console.log('Error:', e.message); }

  // Test 2: search/blended
  console.log('\n--- Test 2: search/blended ---');
  try {
    const r2 = await fetch('https://www.linkedin.com/voyager/api/search/blended?keywords=gerente%20hotel&origin=GLOBAL_SEARCH_HEADER&q=all&filters=List(resultType-%3EPEOPLE)&count=10&start=0', { headers: hdrs, redirect: 'manual' });
    console.log('Status:', r2.status);
    if (r2.status === 200) {
      const d = await r2.text();
      console.log('Body:', d.slice(0, 300));
    } else {
      const t = await r2.text();
      console.log('Body:', t.slice(0, 200));
    }
  } catch (e) { console.log('Error:', e.message); }

  // Test 3: graphql with correct queryId format
  console.log('\n--- Test 3: graphql ---');
  try {
    const r3 = await fetch('https://www.linkedin.com/voyager/api/graphql?variables=(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:gerente%20hotel,flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))),includeFiltersInResponse:false))&queryId=voyagerSearchDashClusters.66cf6e86bb2bba425e3bef87df34d4f8', { headers: hdrs, redirect: 'manual' });
    console.log('Status:', r3.status);
    if (r3.status === 200) {
      const d = await r3.text();
      console.log('Body:', d.slice(0, 300));
    } else {
      const t = await r3.text();
      console.log('Body:', t.slice(0, 200));
    }
  } catch (e) { console.log('Error:', e.message); }

  // Test 4: dash/clusters REST
  console.log('\n--- Test 4: dash/clusters REST ---');
  try {
    const url = 'https://www.linkedin.com/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-175&origin=GLOBAL_SEARCH_HEADER&q=all&query=(keywords:gerente%20hotel,filterClauses:List((config:List(resultType-%3EPEOPLE),type:PLATFORM_FILTER)))&start=0&count=10';
    const r4 = await fetch(url, { headers: hdrs, redirect: 'manual' });
    console.log('Status:', r4.status);
    if (r4.status === 200) {
      const d = await r4.text();
      console.log('Body:', d.slice(0, 300));
    } else {
      const t = await r4.text();
      console.log('Body:', t.slice(0, 200));
    }
  } catch (e) { console.log('Error:', e.message); }
})();
