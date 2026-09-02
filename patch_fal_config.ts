import fs from 'fs';

let content = fs.readFileSync('server/falModelConfig.ts', 'utf8');

// 1. Add Storage import
if (!content.includes('import { Storage }')) {
  content = content.replace('import path from "path";', 'import path from "path";\nimport { Storage } from "@google-cloud/storage";');
}

// 2. Add Storage Client cache
const storageClientCode = `
let storageClient: Storage | null = null;
function getStorageClient(): Storage {
  if (!storageClient) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
    storageClient = new Storage({
      projectId: projectId || undefined,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
    });
  }
  return storageClient;
}
`;
if (!content.includes('function getStorageClient')) {
  content = content.replace('export type FalTier', storageClientCode + '\nexport type FalTier');
}

// 3. Rewrite resolveToDataUriOrPublic
const newResolveCode = `export async function resolveToDataUriOrPublic(imageUrl?: string): Promise<string> {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  const trimmed = imageUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('storage.googleapis.com')) {
      try {
        const res = await fetch(trimmed);
        if (res.ok) {
          return trimmed;
        } else if (res.status === 403 || res.status === 401 || res.status === 404) {
          // Private bucket - download via GCS SDK
          const urlObj = new URL(trimmed);
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          const bucketName = pathParts[0];
          const objectName = pathParts.slice(1).join('/');
          if (bucketName && objectName) {
            const bucket = getStorageClient().bucket(bucketName);
            const file = bucket.file(objectName);
            const [buffer] = await file.download();
            const ext = objectName.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
            return \`data:\${mime};base64,\${buffer.toString('base64')}\`;
          }
        }
      } catch (e) {
        console.warn(\`[resolveToDataUriOrPublic] Failed to fetch/download GCS URL \${trimmed}:\`, e);
      }
    }
    return trimmed;
  }

  const localFile = resolveLocalFilePath(trimmed);
  if (localFile) {
    try {
      const ext = path.extname(localFile).toLowerCase().replace('.', '') || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
      const buf = fs.readFileSync(localFile);
      return \`data:\${mime};base64,\${buf.toString('base64')}\`;
    } catch (e) {
      console.warn(\`[resolveToDataUriOrPublic] Could not read local file \${localFile}:\`, e);
    }
  }

  return trimmed;
}`;
content = content.replace(/export function resolveToDataUriOrPublic[\s\S]*?return trimmed;\n\}/, newResolveCode);

// 4. Update buildFalPayload
content = content.replace('export function buildFalPayload', 'export async function buildFalPayload');
content = content.replace('resolveToDataUriOrPublic(params.imageUrl)', 'await resolveToDataUriOrPublic(params.imageUrl)');
content = content.replace('resolveToDataUriOrPublic(params.endImageUrl)', 'await resolveToDataUriOrPublic(params.endImageUrl)');

// 5. Update sanitizeReferenceImageUrls
content = content.replace('export function sanitizeReferenceImageUrls', 'export async function sanitizeReferenceImageUrls');
content = content.replace('urls?: string | string[]): string[] {', 'urls?: string | string[]): Promise<string[]> {');
content = content.replace(
  /return rawArray[\s\S]*?\.slice\(0, 14\);/m,
  `const resolved = await Promise.all(
    rawArray
      .filter(u => typeof u === 'string' && u.trim().length > 0)
      .map(u => resolveToDataUriOrPublic(u.trim()))
  );
  return resolved.filter(u => u.length > 0).slice(0, 14);`
);

fs.writeFileSync('server/falModelConfig.ts', content);
