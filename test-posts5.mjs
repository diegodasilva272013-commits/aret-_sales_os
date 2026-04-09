const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

const h = {
  'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
  'X-Li-Lang': 'es_ES',
};

// Search for posts BY a specific person using GraphQL search (same pattern as people search)
const kw = encodeURIComponent('');
const authorId = 'ACoAAAFiO7IBDcZIsFedGLi2iiXPTvZh0L5SUOs';

// Use search with CONTENT type filtered by author
const vars = `(start:0,origin:MEMBER_PROFILE_CANNED_SEARCH,query:(flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(CONTENT)),(key:authorProfileId,value:List(${authorId}))),includeFiltersInResponse:false))`;
const url = `https://www.linkedin.com/voyager/api/graphql?variables=${vars}&queryId=voyagerSearchDashClusters.b0928897b71bd00a5a7291755dcd64f0`;

console.log('=== Search for posts by author ===');
const r = await fetch(url, { headers: h, redirect: 'manual' });
console.log('Status:', r.status);
if (r.status === 200) {
  const d = await r.json();
  const included = d.included || [];
  console.log('Included items:', included.length);
  
  // Find items with text content
  for (const item of included) {
    if (item.commentary?.text?.text) {
      console.log('\nPOST:', item.commentary.text.text.slice(0, 150));
      console.log('URN:', item.entityUrn || item.updateUrn || item.backendUrn);
    }
    if (item.actorNavigationUrl) {
      console.log('\nActor:', item.actorNavigationUrl, '| Text:', item.commentary?.text?.text?.slice(0, 80));
    }
  }
  
  // Show types
  const types = [...new Set(included.map(i => i.$type))];
  console.log('\nTypes found:', types);
}
