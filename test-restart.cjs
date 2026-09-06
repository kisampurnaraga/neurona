const http = require('http');

const projectId = "79070f9d-d47b-48a0-b93a-c488f6ecfafe";

function makeRequest(path, method="GET", payload="") {
  return new Promise((resolve, reject) => {
    const opts = { method, headers: {} };
    if (payload) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(`http://localhost:3000${path}`, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  const getRes = await makeRequest(`/api/projects/${projectId}`);
  console.log("Initial state after restart:", getRes.status);
  const prj = JSON.parse(getRes.data);
  console.log("Status:", prj.status, "| Title:", prj.title);

  console.log("Calling /approve...");
  const appRes = await makeRequest(`/api/projects/${projectId}/approve`, "POST", "{}");
  console.log("Approve response:", appRes.status);

  const getRes2 = await makeRequest(`/api/projects/${projectId}`);
  const prj2 = JSON.parse(getRes2.data);
  console.log("Status after approve:", prj2.status);
}
run();
