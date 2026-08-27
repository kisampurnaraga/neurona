const fs = require('fs');
const file = 'server/orchestrator.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "export function loadProjects() {",
  `export function loadProjects() {
  (async () => {
    try {
      await db.insert(users).values({
        uid: 'default',
        email: 'default@example.com',
        name: 'Default User'
      }).onConflictDoNothing();
    } catch(e) {
      console.log('Seed default user error:', e.message);
    }
  })();`
);

code = code.replace(
  "import { users, projects as dbProjects } from '../src/db/schema';",
  "import { users, projects as dbProjects } from '../src/db/schema';"
);

fs.writeFileSync(file, code);
