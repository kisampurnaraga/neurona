import { Storage } from '@google-cloud/storage';

export interface GCSStreamOptions {
  contentType?: string;
  isPublic?: boolean;
  category?: 'reference_image' | 'final_output';
}

export class GCSStreamService {
  private static storageClient: Storage | null = null;
  private static defaultBucketName: string = 'neuronna-media-vault';
  private static isGcsDisabled: boolean = false;
  private static gcsDisabledReason: string = '';

  /**
   * Checks whether GCS direct streaming is available and has write permissions.
   */
  public static isAvailable(): boolean {
    return !this.isGcsDisabled;
  }

  public static getDisabledReason(): string {
    return this.gcsDisabledReason;
  }

  /**
   * Initializes or returns the cached GCS Storage client.
   */
  private static getClient(): Storage {
    if (!this.storageClient) {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
      this.storageClient = new Storage({
        projectId: projectId || undefined,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
      });
    }
    return this.storageClient;
  }

  /**
   * Streams a Buffer or Readable Stream directly to Google Cloud Storage.
   * Completely bypasses writing files to the local container disk.
   */
  public static async uploadStream(
    dataStreamOrBuffer: any,
    destinationFileName: string,
    options: GCSStreamOptions = { isPublic: true }
  ): Promise<string> {
    if (this.isGcsDisabled) {
      throw new Error(`GCS direct streaming disabled due to prior permission/storage error: ${this.gcsDisabledReason}`);
    }

    const bucketName = process.env.GCS_BUCKET_NAME || this.defaultBucketName;
    if (!bucketName) {
      throw new Error("GCS_BUCKET_NAME is not configured in the environment.");
    }

    const client = this.getClient();
    const bucket = client.bucket(bucketName);
    const cleanDestName = destinationFileName.replace(/^\/+/, '');
    const file = bucket.file(cleanDestName);

    const isReferenceImage = options.category === 'reference_image' || 
      /reference|ref_|face|profile|upload|avatar|product_image/i.test(cleanDestName);

    const contentType = options.contentType || (
      cleanDestName.endsWith('.mp4') ? 'video/mp4' :
      cleanDestName.endsWith('.mp3') ? 'audio/mpeg' :
      cleanDestName.endsWith('.wav') ? 'audio/wav' :
      cleanDestName.endsWith('.png') ? 'image/png' :
      cleanDestName.endsWith('.jpg') || cleanDestName.endsWith('.jpeg') ? 'image/jpeg' :
      'application/octet-stream'
    );

    const writeStream = file.createWriteStream({
      metadata: {
        contentType,
        cacheControl: isReferenceImage ? 'private, no-cache' : 'public, max-age=31536000',
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      writeStream.on('error', (err: any) => {
        const errMsg = err?.message || String(err);
        if (errMsg.includes('storage.objects.create') || errMsg.includes('denied') || errMsg.includes('403') || errMsg.includes('does not have')) {
          GCSStreamService.isGcsDisabled = true;
          GCSStreamService.gcsDisabledReason = errMsg;
          console.warn(`[GCSStreamService] GCS write permission denied for bucket '${bucketName}'. Automatically switching to local storage for future assets.`);
        } else {
          console.warn(`[GCSStreamService] Direct streaming upload to bucket '${bucketName}' skipped/failed (${errMsg}). Falling back to local storage.`);
        }
        reject(err);
      });

      writeStream.on('finish', async () => {
        if (isReferenceImage) {
          try {
            const [signedUrl] = await file.getSignedUrl({
              action: 'read',
              expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            });
            console.log(`[GCSStreamService] Reference image secured with 24h Signed URL: ${signedUrl}`);
            resolve(signedUrl);
            return;
          } catch (signErr: any) {
            console.error('[GCSStreamService] Failed to generate Signed URL, falling back to public:', signErr?.message);
          }
        }

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${cleanDestName}`;
        if (options.isPublic) {
          try {
            await file.makePublic();
          } catch (pubErr: any) {
            console.warn('[GCSStreamService] makePublic notice (e.g. Uniform Bucket-Level Access limit):', pubErr?.message);
          }
        }
        console.log(`[GCSStreamService] Direct stream to GCS completed successfully: ${publicUrl}`);
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
