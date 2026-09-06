const http = require('http');

const payload = JSON.stringify({
  prompt: "Sebuah video test",
  videoModel: "fal"
});

const req = http.request('http://localhost:3000/api/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const projectId = json.id; // assume it's json.id
    console.log("Created Project:", projectId);

    const stitchReqPayload = JSON.stringify({ subtitleStyle: "Bold Pop" });
    const stitchReq = http.request(`http://localhost:3000/api/projects/${projectId}/stitch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': stitchReqPayload.length
      }
    }, (vres) => {
      let vdata = '';
      vres.on('data', chunk => vdata += chunk);
      vres.on('end', () => {
         console.log("Stitch Video Response:", vres.statusCode, vdata);
      });
    });
    stitchReq.write(stitchReqPayload);
    stitchReq.end();
  });
});

req.write(payload);
req.end();
