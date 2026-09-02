import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// We want to wrap the scanMediaDir and GCS scan with a role check or just return all for founder
const replacement = `
      // ONLY scan floating files (outputs directory & GCS) if the user is a founder
      // For regular users, floating assets without a project ID cannot be securely attributed to them.
      if (req.user?.role === 'founder' || req.user?.user_id === 'founder_root_001') {
        scanMediaDir(outputsDir, '/outputs');
        
        // NEW: Scan GCS Bucket if enabled
        if (process.env.GCS_BUCKET_NAME) {
          try {
            const { Storage } = require('@google-cloud/storage');
            const storage = new Storage({
              projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
              keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
            });
            const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
            const [files] = await bucket.getFiles({ prefix: 'assets/' });
            for (const file of files) {
              const url = \`https://storage.googleapis.com/\${process.env.GCS_BUCKET_NAME}/\${file.name}\`;
              if (!assetMap.has(url)) {
                const isImg = /\\.(png|jpg|jpeg|webp)$/i.test(file.name);
                const isVid = /\\.(mp4|mov|webm)$/i.test(file.name);
                if (isImg || isVid) {
                  let inferredSource = 'fal-ai';
                  let inferredEngine = isVid ? 'fal-ai/video-render' : 'fal-ai/flux/schnell';
                  let promptDesc = isVid ? 'GCS Video Asset' : 'GCS Image Asset';
                  
                  assetMap.set(url, {
                    id: \`gcs_\${file.name}_\${Date.now()}\`,
                    type: isVid ? 'video' : 'image',
                    url: url,
                    thumbnailUrl: url,
                    prompt: promptDesc,
                    engine: inferredEngine,
                    source: inferredSource,
                    projectId: 'floating',
                    projectTitle: 'Unassigned Asset',
                    createdAt: file.metadata.timeCreated || new Date().toISOString()
                  });
                }
              }
            }
          } catch (err) {
            console.warn('[handleGalleryAssets] Failed to scan GCS Bucket:', err);
          }
        }
      }
`;

// It might already have the block we injected previously. Let's do a smart replace.
const regex = /\/\/ Scan outputs directory & public videos[\s\S]*?console\.warn\('\[handleGalleryAssets\] Failed to scan GCS Bucket:', err\);\n\s*\}\n\s*\}/;
if (regex.test(content)) {
  content = content.replace(regex, replacement.trim());
} else {
  console.log("Could not find the block to replace.");
}

fs.writeFileSync('server.ts', content);
