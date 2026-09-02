import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// 1. We must add verifyToken to handleGalleryAssets routes
if (!content.includes('app.get(\'/api/gallery\', verifyToken,')) {
    content = content.replace('app.get(\'/api/gallery\', (req, res) => {', 'app.get(\'/api/gallery\', verifyToken, (req: AuthenticatedRequest, res) => {');
}

// Ensure AuthenticatedRequest is imported? It is.
// But wait, the `handleGalleryAssets` function needs to accept AuthenticatedRequest
content = content.replace('const handleGalleryAssets = (req: express.Request, res: express.Response) => {', 'const handleGalleryAssets = (req: any, res: express.Response) => {');

// 2. Filter projects in GET /api/gallery
content = content.replace(
    'const allProjects = Array.from(projects.values())\n        .filter(p => (p.status as string) !== \'deleted\')',
    'const allProjects = Array.from(projects.values())\n        .filter(p => (p.status as string) !== \'deleted\' && p.userId === req.user?.user_id)'
);

// 3. Filter projects in handleGalleryAssets
content = content.replace(
    'for (const p of projects.values()) {',
    'for (const p of Array.from(projects.values()).filter((proj: any) => proj.userId === req.user?.user_id)) {'
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts for user isolation on gallery.");
