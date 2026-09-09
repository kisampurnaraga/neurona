import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('=== ACTUAL HTTP OAUTH PROOF ===');
  
  const targetUrl = 'http://127.0.0.1:3000/api/fcc/openart/auth/init?origin=https://neurona-os.ai.studio';
  
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'x-role': 'founder',
        'x-forwarded-host': process.env.APP_URL ? new URL(process.env.APP_URL).host : 'ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app',
        'x-forwarded-proto': 'https'
      }
    });
    
    const data = await res.json();
    
    console.log('Application URL =', process.env.APP_URL || 'undefined');
    console.log('HTTP endpoint =', targetUrl);
    console.log('authUrl =', data.authUrl);
    console.log('redirectUri =', data.redirectUri);
    console.log('clientId =', data.clientId);
    console.log('endpoint =', data.endpoint);
    
    console.log('\n--- DECODED PARAMS ---');
    if (data.authUrl) {
      const urlObj = new URL(data.authUrl);
      const callbackUrlStr = urlObj.searchParams.get('callbackUrl');
      if (callbackUrlStr) {
        // e.g. /suite/api/auth/oauth/authorize?client_id=...
        const mockUrl = new URL('https://openart.ai' + callbackUrlStr);
        console.log('redirect_uri =', mockUrl.searchParams.get('redirect_uri'));
        console.log('response_type =', mockUrl.searchParams.get('response_type'));
        console.log('scope =', mockUrl.searchParams.get('scope'));
        console.log('state =', mockUrl.searchParams.get('state'));
        console.log('code_challenge =', mockUrl.searchParams.get('code_challenge'));
        console.log('code_challenge_method =', mockUrl.searchParams.get('code_challenge_method'));
      }
    }

  } catch (e: any) {
    console.error('Fetch failed:', e.message);
  }
}

run();
