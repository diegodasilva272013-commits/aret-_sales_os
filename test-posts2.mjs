const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

const h = {
  'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
  'X-Li-Lang': 'es_ES',
};

const id = 'conradoarmandugon';

// GraphQL feed query
console.log('--- GraphQL profileTabContentFeedUpdates ---');
const vars1 = `(profileUrn:urn%3Ali%3Afsd_profile%3A${id},count:3)`;
const r1 = await fetch(`https://www.linkedin.com/voyager/api/graphql?variables=${vars1}&queryId=voyagerFeedDashProfileFeedUpdates.c55ce89e6e77ee8fa51827a91ab3f6b8`, { headers: h, redirect: 'manual' });
console.log('Status:', r1.status);

// Alternative: dash feedUpdates 
console.log('\n--- /feed/dash/feedUpdates profileUrn ---');
const r2 = await fetch(`https://www.linkedin.com/voyager/api/feed/dash/feedUpdates?q=profileUpdates&profileUrn=urn:li:fsd_profile:${id}&count=3`, { headers: h, redirect: 'manual' });
console.log('Status:', r2.status);

// Identity dash profile activities
console.log('\n--- graphql activities ---');
const vars3 = `(memberIdentity:${id},count:3)`;
const r3 = await fetch(`https://www.linkedin.com/voyager/api/graphql?variables=${vars3}&queryId=voyagerFeedDashProfileUpdates.f72ede9c9c88a3e3d20954ea29bb0a5c`, { headers: h, redirect: 'manual' });
console.log('Status:', r3.status);
if (r3.status === 200) {
  const d = await r3.json();
  const elements = d.data?.feedDashProfileUpdatesByMemberIdentity?.elements || d.elements || [];
  console.log('Elements:', elements.length);
  console.log('Keys:', Object.keys(d).slice(0, 10));
  const included = d.included || [];
  console.log('Included:', included.length);
  // Find posts in included
  for (const item of included) {
    if (item.commentary?.text?.text) {
      console.log('  POST:', item.commentary.text.text.slice(0, 120));
      console.log('  URN:', item.updateUrn || item.entityUrn);
    }
  }
}

// Last try: simple v2 with different decoration
console.log('\n--- profileUpdatesV2 decorated ---');
const r4 = await fetch(`https://www.linkedin.com/voyager/api/feed/updatesV2?profileUrn=urn:li:fsd_profile:${id}&q=memberShareFeed&count=3&moduleKey=member-shares:phone`, { headers: h, redirect: 'manual' });
console.log('Status:', r4.status);
