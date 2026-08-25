const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/app\.delete\([\'\"]\/api\/admin\/users\/:id[\'\"],\s*verifyToken,\s*requireRole\(\[\'founder\',\s*\'admin\'\]\),\s*\(req:\s*AuthenticatedRequest,\s*res\)\s*=>/g, "app.delete('/api/admin/users/:id', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) =>");
content = content.replace(/app\.post\([\'\"]\/api\/fcc\/seed[\'\"],\s*verifyToken,\s*requireRole\(\'founder\'\),\s*\(req,\s*res\)\s*=>/g, "app.post('/api/fcc/seed', verifyToken, requireRole('founder'), async (req, res) =>");
content = content.replace(/await userDatabase\.setUser\(sample\.user_id,\s*sample,\s*sample\.user_id,\s*sample\);/g, "await userDatabase.setUser(sample.uid, sample);");
content = content.replace(/sample\.user_id/g, "sample.uid");
content = content.replace(/existing\.user_id/g, "existing.uid");
content = content.replace(/user\.user_id/g, "user.uid");

fs.writeFileSync('server.ts', content);
