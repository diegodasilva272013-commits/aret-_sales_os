const cookie = 'AQEDARhNqeQBm-5PAAABnXJDuzsAAAGdllA_O00AcEMZZ_maerUE7W4jt8w8BBBhkjN5JwSluTFXDUYJL6R2RpFNyvq6c8lTnGu8N5EMCejzRxMawYErG6kdWD13FQvHoGEnTf1SJdFZBqLLL_ZASJyn';
const h = {
  'Cookie': `li_at=${cookie}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
};

// Test /me
const r1 = await fetch('https://www.linkedin.com/voyager/api/me', { headers: h, redirect: 'manual' });
console.log('/me status:', r1.status);

// Test search
const vars = `(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:${encodeURIComponent('gerentes')},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE)))))`;
const r2 = await fetch(`https://www.linkedin.com/voyager/api/graphql?variables=${vars}&queryId=voyagerSearchDashClusters.b0928897b71bd00a5a7291755dcd64f0`, { headers: h, redirect: 'manual' });
console.log('search status:', r2.status);
