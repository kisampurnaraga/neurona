const { createServer } = require('vite');
const express = require('express');
async function run() {
  const app = express();
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  app.listen(3003, () => console.log('started'));
}
run();
