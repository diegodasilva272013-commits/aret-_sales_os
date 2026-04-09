const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

const h = {
  'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
  'X-Li-Lang': 'es_ES',
};

const profileUrn = 'urn:li:fsd_profile:ACoAAAFiO7IBDcZIsFedGLi2iiXPTvZh0L5SUOs';

// This is how LinkedIn web actually fetches posts now
const endpoints = [
  // LinkedIn web uses this for the "Activity" tab
  `https://www.linkedin.com/voyager/api/graphql?variables=(memberIdentity:conradoarmandugon,count:3,start:0)&queryId=voyagerFeedDashProfileUpdates.2089f34ea53afd1a489b1c827b052900`,
  // Another variation
  `https://www.linkedin.com/voyager/api/graphql?variables=(profileUrn:urn%3Ali%3Afsd_profile%3AACoAAAFiO7IBDcZIsFedGLi2iiXPTvZh0L5SUOs,count:3,start:0)&queryId=voyagerFeedDashProfileUpdates.2089f34ea53afd1a489b1c827b052900`,
  // feed/updatesV2
  `https://www.linkedin.com/voyager/api/feed/updatesV2?profileId=ACoAAAFiO7IBDcZIsFedGLi2iiXPTvZh0L5SUOs&q=memberShareFeed&count=3`,
  // Recent activity endpoint
  `https://www.linkedin.com/voyager/api/identity/dash/profileActivities?q=memberIdentity&memberIdentity=conradoarmandugon&count=3`,
];

for (const url of endpoints) {
  const shortUrl = url.split('?')[0].split('/api/')[1] + '?' + (url.includes('queryId') ? url.split('queryId=')[1]?.slice(0,40) : url.split('?')[1]?.slice(0,40));
  const r = await fetch(url, { headers: h, redirect: 'manual' });
  console.log(`${r.status} | ${shortUrl}`);
  if (r.status === 200) {
    const d = await r.json();
    const included = d.included || [];
    const posts = included.filter(i => i.commentary?.text?.text);
    console.log(`  -> ${included.length} included, ${posts.length} posts`);
    for (const p of posts.slice(0, 2)) {
      console.log(`  -> "${p.commentary.text.text.slice(0, 80)}..."`);
      console.log(`     URN: ${p.entityUrn || p.updateUrn}`);
    }
  }
}
