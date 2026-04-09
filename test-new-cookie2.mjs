const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

// Try multiple header combos
const combos = [
  { name: 'li_at only', cookie: `li_at=${c}`, csrf: 'ajax:0' },
  { name: 'li_at + JSESSIONID quoted', cookie: `li_at=${c}; JSESSIONID="ajax:0"`, csrf: 'ajax:0' },
  { name: 'li_at + JSESSIONID unquoted', cookie: `li_at=${c}; JSESSIONID=ajax:0`, csrf: 'ajax:0' },
];

for (const combo of combos) {
  console.log(`\n--- ${combo.name} ---`);
  const r = await fetch('https://www.linkedin.com/voyager/api/me', {
    headers: {
      'Cookie': combo.cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/vnd.linkedin.normalized+json+2.1',
      'X-Restli-Protocol-Version': '2.0.0',
      'Csrf-Token': combo.csrf,
      'X-Li-Lang': 'es_ES',
    },
    redirect: 'manual',
  });
  console.log('Status:', r.status, r.statusText);
  if (r.status === 200) {
    const d = await r.json();
    console.log('VALIDA! Nombre:', d.miniProfile?.firstName, d.miniProfile?.lastName, '| ID:', d.plainId);
    
    // If valid, also try search
    console.log('\n--- SEARCH TEST ---');
    const kw = encodeURIComponent('gerentes hoteles');
    const vars = `(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:${kw},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE)))))`;
    const url = `https://www.linkedin.com/voyager/api/graphql?variables=${vars}&queryId=voyagerSearchDashClusters.b0928897b71bd00a5a7291755dcd64f0`;
    const r2 = await fetch(url, {
      headers: {
        'Cookie': combo.cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.linkedin.normalized+json+2.1',
        'X-Restli-Protocol-Version': '2.0.0',
        'Csrf-Token': combo.csrf,
        'X-Li-Lang': 'es_ES',
      },
      redirect: 'manual',
    });
    console.log('Search status:', r2.status);
    if (r2.status === 200) {
      const d2 = await r2.json();
      const people = (d2.included || []).filter(i => i.navigationUrl && i.navigationUrl.includes('/in/'));
      console.log('Personas:', people.length);
      for (const p of people.slice(0, 5)) {
        const m = p.navigationUrl.match(/\/in\/([^/?]+)/);
        console.log(`  - ${p.title?.text} | ${p.primarySubtitle?.text} | linkedin.com/in/${m?.[1]}`);
      }
    }
    break;
  } else if (r.status === 302) {
    console.log('Redirect to:', r.headers.get('location'));
  }
}
