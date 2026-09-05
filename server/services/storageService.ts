import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { GCSStreamService } from './gcsStreamService';

export interface UploadOptions {
  contentType?: string;
  isPublic?: boolean;
  makeSignedUrl?: boolean;
  expiresInMinutes?: number;
}

export class StorageService {
  private static storageClient: Storage | null = null;
  private static bucketName: string = process.env.GCS_BUCKET_NAME || process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'neuronna-media-vault';

  private static getClient(): Storage | null {
    if (!this.storageClient) {
      try {
        // Initialize Storage client with available environment / ADC credentials
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
        this.storageClient = new Storage({
          projectId: projectId || undefined,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
        });
      } catch (err: any) {
        console.warn('[StorageService] Notice initializing GCS client:', err?.message || err);
        return null;
      }
    }
    return this.storageClient;
  }

  /**
   * Uploads a local file (AI video, TTS audio, or final muxed mp4) to Google Cloud Storage.
   * If GCS is not available or upload fails, falls back gracefully to local public directory URL.
   * Automatically deletes temporary local files when requested to prevent ephemeral disk overflow.
   */
  public static async uploadToGCS(
    localFilePath: string,
    destinationFileName: string,
    options: UploadOptions = { isPublic: true }
  ): Promise<string> {
    const cleanDestName = destinationFileName.replace(/^\/+/, '');
    const client = this.getClient();
    const bucket = client ? client.bucket(this.bucketName) : null;

    if (bucket && GCSStreamService.isAvailable()) {
      try {
        console.log(`[StorageService] Uploading '${localFilePath}' to persistent cloud storage...`);
        
        const contentType = options.contentType || (
          cleanDestName.endsWith('.mp4') ? 'video/mp4' :
          cleanDestName.endsWith('.mp3') ? 'audio/mpeg' :
          cleanDestName.endsWith('.wav') ? 'audio/wav' :
          cleanDestName.endsWith('.png') ? 'image/png' :
          cleanDestName.endsWith('.jpg') || cleanDestName.endsWith('.jpeg') ? 'image/jpeg' :
          'application/octet-stream'
        );

        await bucket.upload(localFilePath, {
          destination: cleanDestName,
          metadata: {
            contentType,
            cacheControl: 'public, max-age=31536000',
          },
          resumable: false
        });

        let publicUrl = `https://storage.googleapis.com/${this.bucketName}/${cleanDestName}`;

        if (options.isPublic) {
          try {
            await bucket.file(cleanDestName).makePublic();
          } catch (pubErr: any) {
            console.warn('[StorageService] makePublic notice (bucket may use Uniform Bucket-Level Access):', pubErr?.message);
          }
        }

        if (options.makeSignedUrl) {
          try {
            const [signedUrl] = await bucket.file(cleanDestName).getSignedUrl({
              action: 'read',
              expires: Date.now() + (options.expiresInMinutes || 1440) * 60 * 1000,
            });
            publicUrl = signedUrl;
          } catch (signErr: any) {
            console.warn('[StorageService] getSignedUrl fallback to public URL:', signErr?.message);
          }
        }

        console.log(`[StorageService] Upload to cloud storage complete: ${publicUrl}`);

        // Cleanup local file after successful upload to conserve instance disk
        this.cleanupLocalFile(localFilePath);

        return publicUrl;
      } catch (gcsErr: any) {
        console.log(`[StorageService] Storage notice: Serving '${destinationFileName}' via local media vault.`);
      }
    }

    // Fallback: Ensure file is inside public directory and return static endpoint URL
    const publicVideosDir = path.join(process.cwd(), 'public', 'videos');
    if (!fs.existsSync(publicVideosDir)) {
      fs.mkdirSync(publicVideosDir, { recursive: true });
    }

    const baseName = path.basename(destinationFileName);
    const targetLocalPath = path.join(publicVideosDir, baseName);

    if (localFilePath !== targetLocalPath && fs.existsSync(localFilePath)) {
      try {
        fs.copyFileSync(localFilePath, targetLocalPath);
        // Remove original temp file if different
        if (localFilePath.includes('tmp') || localFilePath.includes('temp')) {
          this.cleanupLocalFile(localFilePath);
        }
      } catch (copyErr) {
        console.warn('[StorageService] Local copy notice:', copyErr);
      }
    }

    const localUrl = `/api/videos/${baseName}`;
    console.log(`[StorageService] Media ready at local URL: ${localUrl}`);
    return localUrl;
  }

  /**
   * Helper to safely remove temporary files
   */
  public static cleanupLocalFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[StorageService] Cleaned up temporary file: ${filePath}`);
      }
    } catch (e: any) {
      console.warn(`[StorageService] Failed cleaning file ${filePath}:`, e?.message);
    }
  }

  /**
   * Uploads a remote HTTP stream or Buffer directly to Google Cloud Storage without using local disk storage.
   */
  public static async uploadStreamToGCS(
    dataStreamOrBuffer: any,
    destinationFileName: string,
    options: UploadOptions = { isPublic: true }
  ): Promise<string> {
    const cleanDestName = destinationFileName.replace(/^\/+/, '');
    const client = this.getClient();
    const bucket = client ? client.bucket(this.bucketName) : null;

    if (!bucket || !GCSStreamService.isAvailable()) {
      throw new Error("Cloud Storage is not active in this environment; storing locally.");
    }

    const contentType = options.contentType || (
      cleanDestName.endsWith('.mp4') ? 'video/mp4' :
      cleanDestName.endsWith('.mp3') ? 'audio/mpeg' :
      cleanDestName.endsWith('.wav') ? 'audio/wav' :
      cleanDestName.endsWith('.png') ? 'image/png' :
      cleanDestName.endsWith('.jpg') || cleanDestName.endsWith('.jpeg') ? 'image/jpeg' :
      'application/octet-stream'
    );

    const file = bucket.file(cleanDestName);
    const writeStream = file.createWriteStream({
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      writeStream.on('error', (err) => {
        console.log(`[StorageService] Storage stream notice: local media vault fallback.`);
        reject(new Error('GCS upload not active'));
      });

      writeStream.on('finish', async () => {
        let publicUrl = `https://storage.googleapis.com/${this.bucketName}/${cleanDestName}`;

        if (options.isPublic) {
          try {
            await file.makePublic();
          } catch (pubErr: any) {
            console.warn('[StorageService] makePublic notice (bucket may use Uniform Bucket-Level Access):', pubErr?.message);
          }
        }

        if (options.makeSignedUrl) {
          try {
            const [signedUrl] = await file.getSignedUrl({
              action: 'read',
              expires: Date.now() + (options.expiresInMinutes || 1440) * 60 * 1000,
            });
            publicUrl = signedUrl;
          } catch (signErr: any) {
            console.warn('[StorageService] getSignedUrl fallback to public URL:', signErr?.message);
          }
        }

        console.log(`[StorageService] Streaming upload to GCS successful: ${publicUrl}`);
        resolve(publicUrl);
      });

      if (Buffer.isBuffer(dataStreamOrBuffer)) {
        writeStream.end(dataStreamOrBuffer);
      } else {
        dataStreamOrBuffer.pipe(writeStream);
      }
    });
  }
}
