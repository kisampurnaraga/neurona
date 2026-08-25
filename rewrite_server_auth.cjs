const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace synchronous userDatabase calls with await
content = content.replace(/const existing = userDatabase\.getUserByEmail/g, "const existing = await userDatabase.getUserByEmail");
content = content.replace(/userDatabase\.setUser\(/g, "await userDatabase.setUser(");
content = content.replace(/const founderUser = userDatabase\.getUserByEmail\('ia.asep12@gmail.com'\) \|\| userDatabase\.getUser\('founder_root_001'\)!;/g, 
  "const founderUser = await userDatabase.getUserByEmail('ia.asep12@gmail.com') || await userDatabase.getUser('founder_root_001');");
content = content.replace(/const user = userDatabase\.getUserByEmail\(/g, "const user = await userDatabase.getUserByEmail(");
content = content.replace(/const users = userDatabase\.getAllUsers\(\)/g, "const users = await userDatabase.getAllUsers()");
content = content.replace(/const updated = userDatabase\.activateUser\(/g, "const updated = await userDatabase.activateUser(");
content = content.replace(/const updated = userDatabase\.resetPassword\(/g, "const updated = await userDatabase.resetPassword(");
content = content.replace(/const deleted = userDatabase\.deleteUser\(/g, "const deleted = await userDatabase.deleteUser(");
content = content.replace(/const updated = userDatabase\.adjustCredits\(/g, "const updated = await userDatabase.adjustCredits(");

// Make sure the route handlers are async
// Replace ANY app.post or app.get up to the (req, res) =>
content = content.replace(/app\.post\([\'\"]\/api\/auth\/register[\'\"],\s*\(req,\s*res\)\s*=>/g, "app.post('/api/auth/register', async (req, res) =>");
content = content.replace(/app\.post\([\'\"]\/api\/auth\/login[\'\"],\s*\(req,\s*res\)\s*=>/g, "app.post('/api/auth/login', async (req, res) =>");
content = content.replace(/app\.post\([\'\"]\/api\/auth\/founder-login[\'\"],\s*\(req,\s*res\)\s*=>/g, "app.post('/api/auth/founder-login', async (req, res) =>");

content = content.replace(/app\.post\([\'\"]\/api\/admin\/users\/create[\'\"],\s*verifyToken,\s*requireRole\(\[\'founder\',\s*\'admin\'\]\),\s*\(req:\s*AuthenticatedRequest,\s*res\)\s*=>/g, "app.post('/api/admin/users/create', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) =>");
content = content.replace(/app\.post\([\'\"]\/api\/admin\/users\/:id\/activate[\'\"],\s*verifyToken,\s*requireRole\(\[\'founder\',\s*\'admin\'\]\),\s*\(req:\s*AuthenticatedRequest,\s*res\)\s*=>/g, "app.post('/api/admin/users/:id/activate', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) =>");
content = content.replace(/app\.post\([\'\"]\/api\/admin\/users\/:id\/reset-password[\'\"],\s*verifyToken,\s*requireRole\(\[\'founder\',\s*\'admin\'\]\),\s*\(req:\s*AuthenticatedRequest,\s*res\)\s*=>/g, "app.post('/api/admin/users/:id/reset-password', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) =>");
content = content.replace(/app\.post\([\'\"]\/api\/admin\/users\/:id\/credits[\'\"],\s*verifyToken,\s*requireRole\(\[\'founder\',\s*\'admin\'\]\),\s*\(req:\s*AuthenticatedRequest,\s*res\)\s*=>/g, "app.post('/api/admin/users/:id/credits', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) =>");

content = content.replace(/app\.get\([\'\"]\/api\/admin\/users[\'\"],\s*verifyToken,\s*requireRole\(\[\'founder\',\s*\'admin\'\]\),\s*\(req:\s*AuthenticatedRequest,\s*res\)\s*=>/g, "app.get('/api/admin/users', verifyToken, requireRole(['founder', 'admin']), async (req: AuthenticatedRequest, res) =>");

// Fix db object mapping since we are reading from postgres
// UserSession schema compatibility
content = content.replace(/existing\.user_id/g, "existing.uid");
content = content.replace(/existing\.status_aktif/g, "existing.statusAktif");
content = content.replace(/existing\.password_plain/g, "existing.passwordPlain");
content = content.replace(/user\.password_plain/g, "user.passwordPlain");
content = content.replace(/user\.status_aktif/g, "user.statusAktif");

// Fix the import of generateUserToken which is generateToken
content = content.replace(/generateUserToken/g, "generateToken");

fs.writeFileSync('server.ts', content);
