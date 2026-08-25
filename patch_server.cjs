const fs = require('fs');

const serverFile = 'server.ts';
let content = fs.readFileSync(serverFile, 'utf8');

// Mount founderPaymentRouter if not already mounted
if (!content.includes("app.use('/api/v1/founder/payment'")) {
  content = content.replace(
    "app.use('/api/v1/tasks', workerRouter);",
    "app.use('/api/v1/tasks', workerRouter);\n  app.use('/api/v1/founder/payment', founderPaymentRouter);"
  );
}

// Mount /api/v1/projects if not present
if (!content.includes("app.get('/api/v1/projects'")) {
  content = content.replace(
    "app.get('/api/gallery', (req, res) => {",
    "app.get('/api/v1/projects', (req, res) => {\n    res.json({ success: true, projects: Array.from(projects.values()) });\n  });\n\n  app.get('/api/gallery', (req, res) => {"
  );
}

fs.writeFileSync(serverFile, content);
console.log('Successfully patched server.ts');
