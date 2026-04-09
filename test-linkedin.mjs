const LI_BASE = 'https://www.linkedin.com';
const cookie = 'AQEDARhNqeQDZMK1AAABnL3RlYIAAAGdeZ6q700ArsyENiC52GAjYz1dRO2oL8Zkz1bs1zdZdGnUR63O1MaJYpJia4t5hziFnKCJb0LK_gVAcdHtbk2BImHFEHJEhGwDtB1MhtO_WE8vdqj3-v9ONzpA';

const hdrs = {
  'Cookie': `li_at=${cookie}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Li-Lang': 'es_ES',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
};

async function test() {
  // Test 1: validate session
  console.log('=== Test 1: Validate session ===');
  try {
    const me = await fetch(LI_BASE + '/voyager/api/me', { headers: hdrs, redirect: 'manual' });
    console.log('Status:', me.status);
    console.log('Location:', me.headers.get('location'));
    const meText = await me.text();
    console.log('Body length:', meText.length);
    console.log('Body preview:', meText.slice(0, 200));
  } catch (e) { console.log('ERROR:', e.message); }

  // Test 2: try identity/profiles endpoint (different validation)
  console.log('\n=== Test 2: Identity profiles ===');
  try {
    const prof = await fetch(LI_BASE + '/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=me&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-19', { headers: hdrs, redirect: 'manual' });
    console.log('Status:', prof.status);
    const profText = await prof.text();
    console.log('Body length:', profText.length);
    if (profText.length > 0 && profText.length < 500) console.log('Body:', profText);
    else if (profText.length > 0) console.log('Body preview:', profText.slice(0, 300));
  } catch (e) { console.log('ERROR:', e.message); }

  // Test 3: REST search endpoint
  console.log('\n=== Test 3: Search REST ===');
  try {
    const url = `${LI_BASE}/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-175&origin=GLOBAL_SEARCH_HEADER&q=all&query=(keywords:gerentes%20hoteles,resultType:(PEOPLE))&start=0&count=10`;
    const res = await fetch(url, { headers: hdrs, redirect: 'manual' });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body length:', text.length);
    if (text.length > 0 && text.length < 500) console.log('Body:', text);
    else if (text.length > 0) {
      try {
        const data = JSON.parse(text);
        const included = data.included || [];
        console.log('Included items:', included.length);
        const profiles = included.filter(i => i.publicIdentifier);
        console.log('Profiles found:', profiles.length);
        for (const p of profiles.slice(0, 5)) {
          console.log(' -', p.firstName, p.lastName, '|', (p.headline || '').slice(0, 50), '|', p.publicIdentifier);
        }
      } catch { console.log('Body preview:', text.slice(0, 300)); }
    }
  } catch (e) { console.log('ERROR:', e.message); }

  // Test 4: GraphQL search (different format)
  console.log('\n=== Test 4: GraphQL search ===');
  try {
    const variables = encodeURIComponent('(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:gerentes hoteles,flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))),includeFiltersInResponse:false))');
    const url = `${LI_BASE}/voyager/api/graphql?variables=${variables}&queryId=voyagerSearchDashClusters.bb251bf4a82e80e325e48b3e72a0301a`;
    const res = await fetch(url, { headers: hdrs, redirect: 'manual' });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body length:', text.length);
    if (text.length > 0 && text.length < 500) console.log('Body:', text);
    else if (text.length > 0) {
      try {
        const data = JSON.parse(text);
        const included = data.included || [];
        console.log('Included items:', included.length);
        const profiles = included.filter(i => i.publicIdentifier);
        console.log('Profiles found:', profiles.length);
        for (const p of profiles.slice(0, 5)) {
          console.log(' -', p.firstName, p.lastName, '|', (p.headline || '').slice(0, 50), '|', p.publicIdentifier);
        }
      } catch { console.log('Body preview:', text.slice(0, 300)); }
    }
  } catch (e) { console.log('ERROR:', e.message); }
}
test().catch(e => console.error('FATAL:', e));
