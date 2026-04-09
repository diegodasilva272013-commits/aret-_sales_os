const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

const h = {
  'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
  'X-Li-Lang': 'es_ES',
};

const testIds = ['rodolfo-fern%C3%A1ndez-a335bb14', 'conradoarmandugon', 'mariel-latarowski'];

for (const id of testIds) {
  const decoded = decodeURIComponent(id);
  console.log(`\n--- Profile: ${decoded} ---`);
  
  // Method A: /identity/profiles/ (current code)
  const rA = await fetch(`https://www.linkedin.com/voyager/api/identity/profiles/${encodeURIComponent(decoded)}`, { headers: h, redirect: 'manual' });
  console.log(`  A /identity/profiles/: ${rA.status}`);
  
  // Method B: /identity/dash/profiles (newer)
  const rB = await fetch(`https://www.linkedin.com/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=${encodeURIComponent(decoded)}`, { headers: h, redirect: 'manual' });
  console.log(`  B /identity/dash/profiles: ${rB.status}`);
  
  // Method C: GraphQL profileView
  const rC = await fetch(`https://www.linkedin.com/voyager/api/graphql?variables=(vanityName:${encodeURIComponent(decoded)})&queryId=voyagerIdentityDashProfiles.53d2c245dff224da498df1db84bfe979`, { headers: h, redirect: 'manual' });
  console.log(`  C graphql profileView: ${rC.status}`);

  // Method D: simple profile page fetch to register view
  const rD = await fetch(`https://www.linkedin.com/in/${decoded}/`, { 
    headers: { 
      'Cookie': `li_at=${c}; JSESSIONID="ajax:0"`,
      'User-Agent': h['User-Agent'],
    },
    redirect: 'manual' 
  });
  console.log(`  D /in/ page: ${rD.status}`);

  // If any 200, show some data
  for (const [name, r] of [['A', rA], ['B', rB], ['C', rC]]) {
    if (r.status === 200) {
      const text = await r.text();
      console.log(`  ${name} response size: ${text.length} bytes`);
      try {
        const j = JSON.parse(text);
        if (j.firstName) console.log(`  ${name} name: ${j.firstName} ${j.lastName}`);
        if (j.included) console.log(`  ${name} included items: ${j.included.length}`);
      } catch {}
    }
  }
}
