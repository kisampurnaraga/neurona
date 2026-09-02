import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `
      // Scan outputs directory & public videos
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
`;

content = content.replace('scanMediaDir(outputsDir, \'/outputs\');', replacement);

// Wait, handleGalleryAssets is currently a synchronous function! We need to make it async.
content = content.replace('const handleGalleryAssets = (req: any, res: express.Response) => {', 'const handleGalleryAssets = async (req: any, res: express.Response) => {');

fs.writeFileSync('server.ts', content);
