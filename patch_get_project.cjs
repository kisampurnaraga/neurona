const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `  app.get('/api/projects/:id', (req, res) => {
     const project = projects.get(req.params.id);
     if (!project) return res.status(404).json({error: "Not found"});
     checkAndValidateProjectVideo(project);
     res.json(project);
  });`;

const replacement = `  app.get('/api/projects/:id', async (req, res) => {
     let project = projects.get(req.params.id);
     if (!project) {
        // Fallback to SQLite
        try {
          const { db } = require('./src/db/index.ts');
          const { projects: dbProjects } = require('./src/db/schema.ts');
          const { eq } = require('drizzle-orm');
          const row = db.select().from(dbProjects).where(eq(dbProjects.id, req.params.id)).get();
          if (row && row.data) {
             project = JSON.parse(row.data);
             if (project) {
               projects.set(req.params.id, project);
             }
          }
        } catch (e) {
          console.warn('[GET Project] SQLite fallback error:', e);
        }
     }
     if (!project) return res.status(404).json({error: "Not found"});
     checkAndValidateProjectVideo(project);
     res.json(project);
  });`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log('PATCHED GET PROJECT');
} else {
  console.log('TARGET NOT FOUND');
}
