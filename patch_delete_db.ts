import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `
  app.delete('/api/gallery/images/:filename', verifyToken, async (req: any, res: express.Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const isFounder = req.user?.role === 'founder' || req.user?.user_id === 'founder_root_001';
      
      // Ownership Check & Database Cleanup
      let isOwner = false;
      let projectModified = false;
      
      for (const p of Array.from(projects.values())) {
        let isProjectModified = false;
        if ((p as any).userId === req.user?.user_id || isFounder) {
          if (p.storyboard && Array.isArray(p.storyboard.scenes)) {
            for (const scene of p.storyboard.scenes) {
              const imgUrl = scene.imageUrl || scene.assetUrl || scene.remoteUrl || scene.falUrl || '';
              const vidUrl = scene.videoUrl || '';
              
              if (imgUrl.includes(filename)) {
                isOwner = true;
                scene.imageUrl = '';
                scene.assetUrl = '';
                scene.remoteUrl = '';
                scene.falUrl = '';
                isProjectModified = true;
              }
              if (vidUrl.includes(filename)) {
                isOwner = true;
                scene.videoUrl = '';
                (scene as any).remoteVideoUrl = '';
                isProjectModified = true;
              }
            }
          }
          if (p.finalVideoUrl && p.finalVideoUrl.includes(filename)) {
            isOwner = true;
            p.finalVideoUrl = '';
            (p as any).remoteFinalVideoUrl = '';
            isProjectModified = true;
          }
        }
        if (isProjectModified) {
          projectModified = true;
        }
      }
      
      if (!isOwner && !isFounder) {
        return res.status(403).json({ success: false, error: 'Access denied. You do not own this asset or the asset is not tied to your project.' });
      }

      if (projectModified) {
        const { saveProjects } = require('./server/orchestrator');
        saveProjects(); // This syncs the memory Map to SQLite
      }

      let deleted = false;

      // 1. Delete from local /outputs/
      const filePath = path.join(process.cwd(), 'outputs', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      }
      
      // 2. Delete from GCS
      if (process.env.GCS_BUCKET_NAME) {
        try {
          const { Storage } = require('@google-cloud/storage');
          const storage = new Storage({
            projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
          });
          const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
          const file = bucket.file(\`assets/\${filename}\`);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            deleted = true;
          }
        } catch (err) {
          console.warn('[DELETE Asset] GCS deletion error:', err);
        }
      }

      if (deleted) {
        res.json({ success: true });
      } else {
        // If it was removed from DB but not found physically, still count as success
        res.json({ success: projectModified, message: projectModified ? 'Removed from database, but file not found on disk.' : 'Not found.' });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
`;

const regex = /app\.delete\('\/api\/gallery\/images\/:filename', verifyToken, async \(req: any, res: express\.Response\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ success: false, error: e\.message \}\);\n\s*\}\n\s*\}\);/;
if (regex.test(content)) {
  content = content.replace(regex, replacement.trim());
} else {
  console.log("Could not find the DELETE route to replace.");
}

fs.writeFileSync('server.ts', content);
