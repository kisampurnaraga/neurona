const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `  app.get('/api/projects/:id', async (req, res) => {
     let project = projects.get(req.params.id);
     if (!project) {
        // Fallback to SQLite
        try {
          const { db } = require('./src/db/index.ts');
          const { projects: dbProjects } = require('./src/db/schema.ts');
          const { eq } = require('drizzle-orm');`;

const replacement = `  app.get('/api/projects/:id', async (req, res) => {
     let project = projects.get(req.params.id);
     if (!project) {
        // Fallback to SQLite
        try {
          const { db } = await import('./src/db/index.ts');
          const { projects: dbProjects } = await import('./src/db/schema.ts');
          const { eq } = await import('drizzle-orm');`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log('PATCHED GET PROJECT ESM');
} else {
  console.log('TARGET NOT FOUND');
}
