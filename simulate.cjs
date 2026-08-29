fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'hello',
    attachedAssets: [],
    videoModel: 'fal'
  })
}).then(res => res.json()).then(console.log).catch(console.error);
