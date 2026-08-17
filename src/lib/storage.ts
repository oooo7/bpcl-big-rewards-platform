import { config } from './config';

export interface StorageProvider {
  getSignedUploadUrl(fileKey: string, contentType: string): Promise<{ uploadUrl: string; fileKey: string }>;
  getFileUrl(fileKey: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  async getSignedUploadUrl(fileKey: string, contentType: string) {
    const fileUrl = `${config.appUrl}/uploads/${fileKey}`;
    return {
      uploadUrl: `${config.appUrl}/api/v1/bills/upload?key=${encodeURIComponent(fileKey)}`,
      fileKey,
    };
  }

  getFileUrl(fileKey: string): string {
    return `${config.appUrl}/uploads/${fileKey}`;
  }
}

export class S3StorageProvider implements StorageProvider {
  async getSignedUploadUrl(fileKey: string, contentType: string) {
    // S3 Presigned URL implementation pattern
    const bucket = config.s3Bucket;
    const region = config.s3Region;
    const uploadUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900`;
    return { uploadUrl, fileKey };
  }

  getFileUrl(fileKey: string): string {
    return `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${fileKey}`;
  }
}

export const storage =
  config.storageProvider === 's3' ? new S3StorageProvider() : new LocalStorageProvider();
