const fs = require('fs');

const path = 'src/components/FounderDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /fetch\('\/api\/v1\/founder\/payment'[^)]*\)\s*\.then\(r => r\.json\(\)\)/g,
  `fetch('/api/v1/founder/payment', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('neuronna_token') || '') } })
      .then(r => r.ok ? r.json() : null)`
);

fs.writeFileSync(path, content);
console.log('Patched FounderDashboard.tsx');
