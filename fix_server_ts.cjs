const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/await userDatabase\.setUser\(existing\.uid,\s*existing\.uid\)/g, "await userDatabase.setUser(existing.uid, existing)");
content = content.replace(/await userDatabase\.setUser\(userId,\s*userId\)/g, "await userDatabase.setUser(userId, newUser)");
content = content.replace(/await userDatabase\.setUser\(sample\.uid,\s*sample\.uid,\s*sample\.uid,\s*sample\)/g, "await userDatabase.setUser(sample.uid, sample)");
content = content.replace(/await userDatabase\.setUser\(sample\.uid,\s*sample\.uid\)/g, "await userDatabase.setUser(sample.uid, sample)");
content = content.replace(/updated_at:/g, "// updated_at:");
content = content.replace(/app\.delete\([\'\"]\/api\/fcc\/users\/:id[\'\"],\s*verifyToken,\s*requireRole\(\'founder\'\),\s*\(req,\s*res\)\s*=>/g, "app.delete('/api/fcc/users/:id', verifyToken, requireRole('founder'), async (req, res) =>");

fs.writeFileSync('server.ts', content);
