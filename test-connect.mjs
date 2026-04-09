const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

const h = {
  'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
  'X-Li-Lang': 'es_ES',
};

// The approach: scrape the profile page HTML and find posts in the embedded JSON
// This is what LinekdIn actually loads
console.log('=== Fetching profile page with embedded data ===');
const r = await fetch('https://www.linkedin.com/in/conradoarmandugon/recent-activity/all/', {
  headers: {
    'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
    'User-Agent': h['User-Agent'],
    'Accept': 'text/html',
  },
  redirect: 'follow',
});
console.log('Status:', r.status);

if (r.status === 200) {
  const html = await r.text();
  console.log('HTML size:', html.length);
  
  // Try to find embedded JSON data
  const codeMatch = html.match(/<code[^>]*id="bpr-guid-\d+"[^>]*>(.*?)<\/code>/s);
  if (codeMatch) {
    console.log('Found embedded code block, length:', codeMatch[1].length);
  }
  
  // Check for included data in scripts
  const scriptMatches = html.match(/included.*?commentary/g);
  console.log('Commentary references in HTML:', scriptMatches?.length || 0);
}

// Alternative: Just use connection/message endpoints without worrying about posts
// The agent can work with: discover -> view profile -> connect -> message
// Skip warming (likes) and commenting phases entirely if posts API doesn't work
console.log('\n=== Test connection request endpoint ===');
// Don't actually send - just check if endpoint responds
const connTest = await fetch('https://www.linkedin.com/voyager/api/voyagerRelationshipsDashMemberRelationships?action=verifyQuotaAndCreate', {
  method: 'POST',
  headers: { ...h, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trackingId: crypto.randomUUID(),
    inviteeProfileUrn: 'urn:li:fsd_profile:ACoAAAFiO7IBDcZIsFedGLi2iiXPTvZh0L5SUOs',
    message: 'Test',
  }),
  redirect: 'manual',
});
console.log('Connection endpoint status:', connTest.status);
const connBody = await connTest.text();
console.log('Response:', connBody.slice(0, 200));
