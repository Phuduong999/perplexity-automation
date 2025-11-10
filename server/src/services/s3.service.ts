/**
 * AWS S3 Service
 * Handles file upload, download, and deletion from S3
 */

import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import { createLogger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';

const logger = createLogger('s3-service');

// Configure AWS SDK
AWS.config.update({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

const s3 = new AWS.S3();

interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export class S3Service {
  private bucket: string;

  constructor() {
    this.bucket = config.aws.s3Bucket;
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string
  ): Promise<UploadResult> {
    try {
      const fileExtension = originalName.split('.').pop();
      const key = `uploads/${userId}/${uuidv4()}.${fileExtension}`;

      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          originalName,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      };

      const result = await s3.upload(params).promise();

      logger.info(`File uploaded to S3: ${key}`);

      return {
        key,
        url: result.Location,
        bucket: this.bucket,
      };
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new InternalServerError('Failed to upload file to S3');
    }
  }

  /**
   * Download file from S3
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      const result = await s3.getObject(params).promise();

      if (!result.Body) {
        throw new Error('No file body returned from S3');
      }

      return result.Body as Buffer;
    } catch (error) {
      logger.error('S3 download error:', error);
      throw new InternalServerError('Failed to download file from S3');
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      await s3.deleteObject(params).promise();

      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw new InternalServerError('Failed to delete file from S3');
    }
  }

  /**
   * Get signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn,
      };

      return s3.getSignedUrl('getObject', params);
    } catch (error) {
      logger.error('S3 signed URL error:', error);
      throw new InternalServerError('Failed to generate signed URL');
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await s3.headObject({ Bucket: this.bucket, Key: key }).promise();
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}

export default new S3Service();

