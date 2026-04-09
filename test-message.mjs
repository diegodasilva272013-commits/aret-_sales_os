const LI_BASE = 'https://www.linkedin.com';
const cookie = 'AQEDARhNqeQFieqoAAABnXIc258AAAGdlilfn04AyhfzeWFH07Nk7ssFGa64JduVHM2KwYgWRkMGofJ4u2E6EC_Nc_oTXojcekZPiqkPOni-fYpa-2zRXN1vxCrUS7JZFdjilkLo3-5uvWUX9d7XErVY';
const h = {
  'Cookie': `li_at=${cookie}; JSESSIONID="ajax:0"`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'X-Restli-Protocol-Version': '2.0.0',
  'Csrf-Token': 'ajax:0',
  'Content-Type': 'application/json'
};

// Test sendMessage endpoint (to someone we're connected with)
// Using conradoarmandugon since we just sent a connection request
async function testMessage() {
  console.log('=== Test sendMessage endpoint ===');
  const res = await fetch(`${LI_BASE}/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      message: { body: { text: 'Test - ignore this message' } },
      mailboxUrn: 'urn:li:fsd_profile:me',
      recipients: ['urn:li:fsd_profile:conradoarmandugon'],
    })
  });
  console.log('Status:', res.status);
  const t = await res.text();
  console.log('Response:', t.substring(0, 500));
}

testMessage().catch(console.error);
