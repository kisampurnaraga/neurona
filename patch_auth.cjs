const fs = require('fs');
let path = 'server/middleware/auth.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /if \(!session \|\| !session\.user_id\) \{/,
  `if (!session || (!session.user_id && !(session as any).uid)) {`
);

c = c.replace(
  /const dbUsers = await db\.select\(\)\.from\(users\)\.where\(eq\(users\.uid, session\.user_id\)\)\.limit\(1\);/,
  `const dbUsers = await db.select().from(users).where(eq(users.uid, session.user_id || (session as any).uid)).limit(1);`
);

fs.writeFileSync(path, c);
