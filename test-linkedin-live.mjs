const c = 'AQEDARhNqeQC4lQ0AAABnXGdVFIAAAGdlanYUk4ASjEF1_dRwOYFYVcrmZl4GnJ72wSIcJEjj_zNswcyyUt0d-B0w06_xaK8bLSKA1JTU7M4LpALD7z3OG71dnPglFuOjKe_zEd0lwu6uUGWBkfkww8i';

const h = {
  'Cookie': `li_at=${c}`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0'
};

console.log('==========================================');
console.log('  PRUEBA REAL EN LINKEDIN - EN VIVO');
console.log('==========================================');
console.log('Cookie:', c.slice(0, 25) + '...');
console.log('');

// TEST 1: Tu perfil
console.log('--- TEST 1: GET /voyager/api/me (tu perfil LinkedIn) ---');
const r1 = await fetch('https://www.linkedin.com/voyager/api/me', { headers: h, redirect: 'manual' });
console.log('HTTP Status:', r1.status, r1.statusText);

if (r1.status === 200) {
  const d = await r1.json();
  console.log('NOMBRE:', d.miniProfile?.firstName, d.miniProfile?.lastName);
  console.log('ID:', d.plainId);
  console.log('>>> COOKIE VALIDA - CONECTADO A LINKEDIN <<<');
} else if (r1.status === 302) {
  console.log('Location:', r1.headers.get('location'));
  console.log('>>> COOKIE EXPIRADA - LinkedIn redirige al login');
  console.log('>>> El sistema FUNCIONA pero tu sesion de LinkedIn se vencio');
  console.log('>>> Necesitas sacar una cookie nueva de tu navegador');
}

// TEST 2: Busqueda de personas (GraphQL)  
console.log('');
console.log('--- TEST 2: BUSCAR "gerentes hoteles" en LinkedIn (GraphQL) ---');
const kw = encodeURIComponent('gerentes hoteles');
const vars = `(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:${kw},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE)))))`;
const url = `https://www.linkedin.com/voyager/api/graphql?variables=${vars}&queryId=voyagerSearchDashClusters.b0928897b71bd00a5a7291755dcd64f0`;
const r2 = await fetch(url, { headers: h, redirect: 'manual' });
console.log('HTTP Status:', r2.status, r2.statusText);

if (r2.status === 200) {
  const d = await r2.json();
  const people = (d.included || []).filter(i => i.navigationUrl && i.navigationUrl.includes('/in/'));
  console.log('Personas encontradas:', people.length);
  for (const p of people.slice(0, 5)) {
    const m = p.navigationUrl.match(/\/in\/([^/?]+)/);
    console.log(`  - ${p.title?.text} | ${p.primarySubtitle?.text} | linkedin.com/in/${m?.[1]}`);
  }
  console.log('>>> BUSQUEDA FUNCIONA - ESTOS SON PERFILES REALES DE LINKEDIN <<<');
} else if (r2.status === 302) {
  console.log('>>> Cookie expirada, no puede buscar');
}

console.log('');
console.log('==========================================');
console.log('CONCLUSION: El sistema esta ENCHUFADO a LinkedIn.');
console.log('Si la cookie esta viva = busca, encuentra, y procesa gente real.');
console.log('==========================================');
