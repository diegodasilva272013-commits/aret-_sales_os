const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

const h = {
  'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
  'X-Li-Lang': 'es_ES',
};

// Test getProfilePosts - old endpoint
const id = 'conradoarmandugon';
console.log('--- Posts (old profileUpdatesV2) ---');
const r1 = await fetch(`https://www.linkedin.com/voyager/api/identity/profileUpdatesV2?profileUrn=urn:li:fsd_profile:${id}&q=memberShareFeed&count=3`, { headers: h, redirect: 'manual' });
console.log('Status:', r1.status);

// Test feed/dash endpoint (newer)
console.log('\n--- Posts (feed/dash) ---');
const r2 = await fetch(`https://www.linkedin.com/voyager/api/feed/dash/feedUpdates?q=memberShareFeed&memberIdentity=${id}&count=3`, { headers: h, redirect: 'manual' });
console.log('Status:', r2.status);
if (r2.status === 200) {
  const d = await r2.json();
  const elements = d.elements || [];
  console.log('Posts found:', elements.length);
  for (const el of elements.slice(0, 3)) {
    const text = el?.commentary?.text?.text || el?.resharedUpdate?.commentary?.text?.text || '';
    console.log('  -', text.slice(0, 100), '| URN:', el.updateUrn || el['*socialDetail'] || 'none');
  }
}

// Test profileUpdatesV2 with dash
console.log('\n--- Posts (identity/dash) ---');
const r3 = await fetch(`https://www.linkedin.com/voyager/api/identity/dash/profile?q=memberIdentity&memberIdentity=${id}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-20`, { headers: h, redirect: 'manual' });
console.log('Status:', r3.status);
