import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('=== ACTUAL HTTP OAUTH PROOF ===');
  const targetUrl = 'http://127.0.0.1:3000/api/fcc/openart/auth/init?origin=' + encodeURIComponent('https://' + (process.env.APP_URL ? new URL(process.env.APP_URL).host : 'ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app'));
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'x-role': 'founder',
        'x-forwarded-host': process.env.APP_URL ? new URL(process.env.APP_URL).host : 'ais-dev-lhwcbpgrrfalopwm3dt5h2-654788409683.asia-southeast1.run.app',
        'x-forwarded-proto': 'https'
      }
    });
    const data = await res.json();
    console.log('authUrl =', data.authUrl);
    console.log('redirect_uri =', data.redirectUri);
  } catch (e: any) {
    console.error('Fetch failed:', e.message);
  }
}
run();
