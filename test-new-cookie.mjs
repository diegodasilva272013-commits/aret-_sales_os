const c = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';

const h = {
  'Cookie': `li_at=${c}`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0'
};

// TEST 1: Perfil
console.log('=== TEST 1: /voyager/api/me ===');
const r1 = await fetch('https://www.linkedin.com/voyager/api/me', { headers: h, redirect: 'manual' });
console.log('Status:', r1.status);
if (r1.status === 200) {
  const d = await r1.json();
  console.log('Nombre:', d.miniProfile?.firstName, d.miniProfile?.lastName);
  console.log('ID:', d.plainId);
  console.log('COOKIE VALIDA!');
} else {
  console.log('COOKIE INVALIDA - status', r1.status);
  process.exit(1);
}

// TEST 2: Busqueda real
console.log('\n=== TEST 2: Buscar "gerentes hoteles" ===');
const kw = encodeURIComponent('gerentes hoteles');
const vars = `(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:${kw},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE)))))`;
const url = `https://www.linkedin.com/voyager/api/graphql?variables=${vars}&queryId=voyagerSearchDashClusters.b0928897b71bd00a5a7291755dcd64f0`;
const r2 = await fetch(url, { headers: h, redirect: 'manual' });
console.log('Status:', r2.status);
if (r2.status === 200) {
  const d = await r2.json();
  const people = (d.included || []).filter(i => i.navigationUrl && i.navigationUrl.includes('/in/'));
  console.log('Personas encontradas:', people.length);
  for (const p of people.slice(0, 10)) {
    const m = p.navigationUrl.match(/\/in\/([^/?]+)/);
    console.log(`  - ${p.title?.text} | ${p.primarySubtitle?.text} | linkedin.com/in/${m?.[1]}`);
  }
} else {
  console.log('Search failed:', r2.status);
}
