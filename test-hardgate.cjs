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

    const videoReqPayload = JSON.stringify({ sceneId: "test_scene_1", videoModel: "fal" });
    const videoReq = http.request(`http://localhost:3000/api/projects/${projectId}/generate-scene-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': videoReqPayload.length
      }
    }, (vres) => {
      let vdata = '';
      vres.on('data', chunk => vdata += chunk);
      vres.on('end', () => {
         console.log("Generate Scene Video Response:", vres.statusCode, vdata);
      });
    });
    videoReq.write(videoReqPayload);
    videoReq.end();
  });
});

req.write(payload);
req.end();
