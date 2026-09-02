import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `
  app.delete('/api/gallery/images/:filename', verifyToken, async (req: any, res: express.Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const isFounder = req.user?.role === 'founder' || req.user?.user_id === 'founder_root_001';
      
      // Ownership Check
      let isOwner = false;
      const fileUrl = \`/outputs/\${filename}\`;
      const gcsUrl = \`https://storage.googleapis.com/\${process.env.GCS_BUCKET_NAME || 'neuronna_bucket'}/assets/\${filename}\`;
      
      for (const p of Array.from(projects.values())) {
        if ((p as any).userId === req.user?.user_id) {
          if (p.storyboard && Array.isArray(p.storyboard.scenes)) {
            for (const scene of p.storyboard.scenes) {
              const url = scene.imageUrl || scene.assetUrl || scene.remoteUrl || scene.falUrl || '';
              if (url.includes(filename)) {
                isOwner = true;
                break;
              }
            }
          }
        }
        if (isOwner) break;
      }
      
      if (!isOwner && !isFounder) {
        return res.status(403).json({ success: false, error: 'Access denied. You do not own this asset or the asset is not tied to your project.' });
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
        res.status(404).json({ success: false, error: 'File not found on server or GCS.' });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
`;

const regex = /app\.delete\('\/api\/gallery\/images\/:filename', verifyToken, \(req: any, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ success: false, error: e\.message \}\);\n\s*\}\n\s*\}\);/;
if (regex.test(content)) {
  content = content.replace(regex, replacement.trim());
} else {
  console.log("Could not find the DELETE route to replace.");
}

fs.writeFileSync('server.ts', content);
