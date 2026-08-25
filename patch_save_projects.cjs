const fs = require('fs');

let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

// Replace loadProjects and saveProjects
const replacement = `
import { db } from '../src/db/index';
import { projects as dbProjects, users as dbUsers } from '../src/db/schema';
import { eq } from 'drizzle-orm';

function saveProjects() {
  // Sync map to PostgreSQL
  (async () => {
    try {
      for (const [id, project] of projects.entries()) {
        const userId = (project as any).userId || (project as any).userId || 'default';
        
        // Ensure user exists first or handle missing user (since userId is a foreign key)
        // For simplicity, we just try to insert the project and ignore FK errors if user doesn't exist
        // Realistically, the user should be created during auth
        
        await db.insert(dbProjects).values({
          id,
          userId: userId,
          title: project.title || 'Untitled',
          status: project.status || 'PENDING',
          videoType: project.videoType || 'AFFILIATE',
          finalVideoUrl: project.finalVideoUrl || null,
          data: JSON.stringify(project)
        }).onConflictDoUpdate({
          target: dbProjects.id,
          set: {
            title: project.title || 'Untitled',
            status: project.status || 'PENDING',
            videoType: project.videoType || 'AFFILIATE',
            finalVideoUrl: project.finalVideoUrl || null,
            data: JSON.stringify(project)
          }
        }).catch(err => console.error("DB Save Error:", err.message));
      }
    } catch(e) {
      console.error("Failed to sync projects to Postgres:", e);
    }
  })();
}

function loadProjects() {
  (async () => {
    try {
      const rows = await db.select().from(dbProjects);
      for (const row of rows) {
        if (row.data) {
          projects.set(row.id, JSON.parse(row.data));
        }
      }
      console.log(\`Loaded \${projects.size} projects from Postgres DB.\`);
    } catch(e) {
      console.error("Failed to load projects from Postgres:", e);
    }
  })();
}
`;

// we need to inject the import statements at the top
// and replace the functions

content = content.replace(/import fs from 'fs';/, "import fs from 'fs';\nimport { db } from '../src/db/index';\nimport { projects as dbProjects, users as dbUsers } from '../src/db/schema';\nimport { eq } from 'drizzle-orm';");

content = content.replace(/function saveProjects\(\) \{[\s\S]*?\n\}/, `function saveProjects() {
  // Sync map to PostgreSQL
  (async () => {
    try {
      for (const [id, project] of projects.entries()) {
        const userId = (project as any).userId || 'default';
        await db.insert(dbProjects).values({
          id,
          userId: userId,
          title: project.title || 'Untitled',
          status: project.status || 'PENDING',
          videoType: project.videoType || 'AFFILIATE',
          finalVideoUrl: project.finalVideoUrl || null,
          data: JSON.stringify(project)
        }).onConflictDoUpdate({
          target: dbProjects.id,
          set: {
            title: project.title || 'Untitled',
            status: project.status || 'PENDING',
            videoType: project.videoType || 'AFFILIATE',
            finalVideoUrl: project.finalVideoUrl || null,
            data: JSON.stringify(project)
          }
        }).catch(err => console.error("DB Save Error (Project " + id + "):", err.message));
      }
    } catch(e) {
      console.error("Failed to sync projects to Postgres:", e);
    }
  })();
}`);

content = content.replace(/function loadProjects\(\) \{[\s\S]*?\n\}/, `function loadProjects() {
  (async () => {
    try {
      const rows = await db.select().from(dbProjects);
      for (const row of rows) {
        if (row.data) {
          projects.set(row.id, JSON.parse(row.data));
        }
      }
      console.log(\`Loaded \${projects.size} projects from Postgres DB.\`);
    } catch(e) {
      console.error("Failed to load projects from Postgres:", e);
    }
  })();
}`);

fs.writeFileSync('server/orchestrator.ts', content);
