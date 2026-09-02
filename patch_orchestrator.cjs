const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const oldFunc = `export async function saveFileLocally(urlOrData: string, prefix: string, extension: string, project?: ProductionProject): Promise<string> {
  if (!urlOrData || typeof urlOrData !== 'string') return urlOrData;

  // If it is already a local URL or GCS public URL, don't re-download
  if (urlOrData.startsWith('/outputs/') || urlOrData.includes('storage.googleapis.com')) {
    return urlOrData;
  }

  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const filename = \`\${prefix}_\${uniqueId}.\${extension}\`;

  const isReferenceImage = /reference|ref_|face|profile|upload|avatar|product_image/i.test(filename);

  // Register external HTTP/HTTPS source into persistent remoteOutputsMap
  if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
    setRemoteUrlForFilename(filename, urlOrData);
  }

  // === CLOUD RUN PRODUCTION HARDENING (DIRECT STREAMING TO GCS) ===
  // If GCS_BUCKET_NAME is configured and available, stream directly to GCS
  if (process.env.GCS_BUCKET_NAME && GCSStreamService.isAvailable()) {
    try {
      console.log(\`[LocalSaver] GCS Bucket defined. Initiating direct streaming upload of '\${filename}' to GCS...\`);
      const category = isReferenceImage ? 'reference_image' : 'final_output';
      
      if (urlOrData.startsWith('data:')) {
        // Handle data URI (base64) directly via buffer stream
        const matches = urlOrData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const buffer = Buffer.from(matches[2], 'base64');
          const gcsUrl = await GCSStreamService.uploadStream(buffer, \`assets/\${filename}\`, { isPublic: !isReferenceImage, category });
          console.log(\`[LocalSaver] Saved base64 data directly to persistent GCS: \${gcsUrl}\`);
          return gcsUrl;
        }
      } else if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
        // Stream download directly from HTTP to GCS write stream
        console.log(\`[LocalSaver] Streaming external asset with retries from \${urlOrData} directly to GCS...\`);
        const response = await fetchWithRetry(urlOrData);
        // Node-fetch response.body is a readable stream of the response payload
        const gcsUrl = await GCSStreamService.uploadStream(response.body, \`assets/\${filename}\`, { isPublic: !isReferenceImage, category });
        console.log(\`[LocalSaver] Streaming download and persistent GCS upload successful: \${gcsUrl}\`);
        return gcsUrl;
      }
    } catch (gcsErr: any) {
      console.log(\`[LocalSaver] GCS direct streaming notice (\${gcsErr.message}). Gracefully securing asset in local storage.\`);
      if (project) {
        try {
          (project as any).storageStatus = "local_storage";
          appendLog(project, 'STORAGE', \`Aset tersimpan aman di media vault lokal: \${filename}\`, 'INFO');
          saveProjects();
        } catch (dbErr: any) {
          console.error('[LocalSaver] Failed to flag project storage status in DB:', dbErr);
        }
      }
    }
  }

  // === LOCAL FALLBACK (FOR DEVELOPMENT / PREVIEW / LOCAL WORKSPACE) ===
  // Ensure outputs directory exists
  const outputsDir = path.join(process.cwd(), 'outputs');
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }
  const localFilePath = path.join(outputsDir, filename);

  try {
    if (urlOrData.startsWith('data:')) {
      // Handle data URI (base64)
      const matches = urlOrData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(localFilePath, buffer);
        console.log(\`[LocalSaver-Fallback] Saved base64 data to local file: \${filename}\`);
      }
    } else if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
      // Handle external HTTP URL with exponential backoff retry mechanism
      console.log(\`[LocalSaver-Fallback] Downloading external asset with retries from \${urlOrData} ...\`);
      const response = await fetchWithRetry(urlOrData);
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(localFilePath, Buffer.from(arrayBuffer));
      console.log(\`[LocalSaver-Fallback] Successfully downloaded and saved external asset to: \${filename}\`);
    }

    return \`/outputs/\${filename}\`;
  } catch (err: any) {
    console.error(\`[LocalSaver-Fallback] Gagal mengamankan file ke penyimpanan lokal:\`, err);
  }

  return urlOrData;
}`;

const newFunc = `export async function saveFileLocally(urlOrData: string, prefix: string, extension: string, project?: ProductionProject): Promise<string> {
  if (!urlOrData || typeof urlOrData !== 'string') return urlOrData;

  // If it is already a local URL or GCS public URL, don't re-download
  if (urlOrData.startsWith('/outputs/') || urlOrData.includes('storage.googleapis.com')) {
    return urlOrData;
  }

  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const filename = \`\${prefix}_\${uniqueId}.\${extension}\`;

  const isReferenceImage = /reference|ref_|face|profile|upload|avatar|product_image/i.test(filename);

  // Register external HTTP/HTTPS source into persistent remoteOutputsMap
  if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
    setRemoteUrlForFilename(filename, urlOrData);
  }

  // Ensure outputs directory exists
  const outputsDir = path.join(process.cwd(), 'outputs');
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }
  const localFilePath = path.join(outputsDir, filename);

  let fileBuffer: Buffer | null = null;
  let downloadedLocally = false;

  try {
    if (urlOrData.startsWith('data:')) {
      const matches = urlOrData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        fileBuffer = Buffer.from(matches[2], 'base64');
      }
    } else if (urlOrData.startsWith('http://') || urlOrData.startsWith('https://')) {
      console.log(\`[LocalSaver] Downloading external asset with retries from \${urlOrData} ...\`);
      const response = await fetchWithRetry(urlOrData);
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    if (fileBuffer) {
      fs.writeFileSync(localFilePath, fileBuffer);
      downloadedLocally = true;
      
      // RE-ENCODE WHATSAPP COMPATIBILITY (H.264, AAC, faststart)
      if (extension === 'mp4') {
        try {
          const reencodedPath = localFilePath + '.reencode.mp4';
          console.log(\`[LocalSaver] Re-encoding \${filename} for WhatsApp compatibility...\`);
          await execAsync(\`ffmpeg -y -i "\${localFilePath}" -c:v libx264 -profile:v main -pix_fmt yuv420p -c:a aac -movflags +faststart "\${reencodedPath}"\`);
          if (fs.existsSync(reencodedPath) && fs.statSync(reencodedPath).size > 0) {
            fs.copyFileSync(reencodedPath, localFilePath);
            fs.unlinkSync(reencodedPath);
            fileBuffer = fs.readFileSync(localFilePath); // update buffer if uploading to GCS
            console.log(\`[LocalSaver] Re-encoded \${filename} successfully.\`);
          }
        } catch (ffErr) {
          console.warn(\`[LocalSaver] Re-encoding failed, keeping original for \${filename}:\`, ffErr);
        }
      }
    }
  } catch (err: any) {
    console.error(\`[LocalSaver] Failed to download or process file locally:\`, err);
  }

  // === CLOUD RUN PRODUCTION HARDENING (DIRECT STREAMING TO GCS) ===
  if (process.env.GCS_BUCKET_NAME && GCSStreamService.isAvailable() && fileBuffer) {
    try {
      console.log(\`[LocalSaver] GCS Bucket defined. Uploading '\${filename}' to GCS...\`);
      const category = isReferenceImage ? 'reference_image' : 'final_output';
      const gcsUrl = await GCSStreamService.uploadStream(fileBuffer, \`assets/\${filename}\`, { isPublic: !isReferenceImage, category });
      console.log(\`[LocalSaver] Persistent GCS upload successful: \${gcsUrl}\`);
      
      // Clean up local file since it's on GCS
      try { fs.unlinkSync(localFilePath); } catch (e) {}
      
      return gcsUrl;
    } catch (gcsErr: any) {
      console.log(\`[LocalSaver] GCS upload failed (\${gcsErr.message}). Falling back to local storage.\`);
      if (project) {
        try {
          (project as any).storageStatus = "local_storage";
          appendLog(project, 'STORAGE', \`Aset tersimpan aman di media vault lokal: \${filename}\`, 'INFO');
          saveProjects();
        } catch (dbErr: any) {}
      }
    }
  }

  if (downloadedLocally) {
    return \`/outputs/\${filename}\`;
  }
  return urlOrData;
}`;

if (code.includes(oldFunc)) {
  code = code.replace(oldFunc, newFunc);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
