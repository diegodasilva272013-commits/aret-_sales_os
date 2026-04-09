const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

const h = {
  'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
  'X-Li-Lang': 'es_ES',
};

// Need the numeric profile ID, not the vanity URL
// First get profile to find the numeric URN
const id = 'conradoarmandugon';
console.log('=== Step 1: Get profile URN ===');
const rP = await fetch(`https://www.linkedin.com/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=${id}`, { headers: h });
const pData = await rP.json();
// Find the profile entityUrn in included
const profile = (pData.included || []).find(i => i.publicIdentifier === id || i.$type?.includes('Profile'));
const urn = profile?.entityUrn || profile?.['*miniProfile'];
console.log('Profile URN:', urn);
console.log('Profile type:', profile?.$type);

// Try getting posts with the proper URN  
if (urn) {
  console.log('\n=== Step 2: Get posts with URN ===');
  
  // Method: GraphQL with proper URN encoding
  const encodedUrn = encodeURIComponent(urn);
  
  // Try voyagerFeedDashTimeline
  const r1 = await fetch(`https://www.linkedin.com/voyager/api/feed/dash/feedUpdates?q=profileUpdates&profileUrn=${encodedUrn}&count=3`, { headers: h, redirect: 'manual' });
  console.log('dash/feedUpdates:', r1.status);
  
  // Try GraphQL with numeric ID
  const numericId = urn?.split(':').pop();
  console.log('Numeric ID:', numericId);
  
  const r2 = await fetch(`https://www.linkedin.com/voyager/api/graphql?variables=(count:3,profileUrn:${encodedUrn})&queryId=voyagerFeedDashProfileUpdates.0b1ce273aceb72f0f0e49283e8e38b07`, { headers: h, redirect: 'manual' });
  console.log('graphql profileUpdates:', r2.status);
  if (r2.status === 200) {
    const d = await r2.json();
    console.log('included count:', d.included?.length);
    for (const item of (d.included || [])) {
      if (item.commentary?.text?.text) {
        console.log('  POST:', item.commentary.text.text.slice(0, 100));
        console.log('  URN:', item.entityUrn);
      }
    }
  }
  
  // Try another queryId pattern
  const r3 = await fetch(`https://www.linkedin.com/voyager/api/graphql?variables=(profileUrn:${encodedUrn},count:3,start:0)&queryId=voyagerFeedDashProfileUpdates.6c37b03798079eb1d16412f04398d403`, { headers: h, redirect: 'manual' });
  console.log('graphql alt queryId:', r3.status);
}
