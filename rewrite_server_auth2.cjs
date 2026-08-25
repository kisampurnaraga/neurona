const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/existing\.phone_wa/g, "existing.phoneWa");
content = content.replace(/existing\.updated_at = new Date\(\)\.toISOString\(\);/g, "// removed updated_at");
content = content.replace(/created_at:/g, "// created_at:");
content = content.replace(/userDatabase\.setUser\(existing\.uid,\s*existing\)/g, "userDatabase.setUser(existing.uid)");
content = content.replace(/userDatabase\.setUser\(userId,\s*newUser\)/g, "userDatabase.setUser(userId)");
content = content.replace(/app\.delete\([\'\"]\/api\/fcc\/users\/:id[\'\"],\s*verifyToken,\s*requireRole\(\'founder\'\),\s*\(req,\s*res\)\s*=>/g, "app.delete('/api/fcc/users/:id', verifyToken, requireRole('founder'), async (req, res) =>");
content = content.replace(/app\.post\([\'\"]\/api\/fcc\/seed[\'\"],\s*verifyToken,\s*requireRole\(\'founder\'\),\s*\(req,\s*res\)\s*=>/g, "app.post('/api/fcc/seed', verifyToken, requireRole('founder'), async (req, res) =>");
content = content.replace(/userDatabase\.setUser\(sample\.uid,\s*sample\)/g, "userDatabase.setUser(sample.uid)");

fs.writeFileSync('server.ts', content);
