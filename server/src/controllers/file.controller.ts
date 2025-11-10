/**
 * File Controller
 * Handles file upload, download, and management
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ValidationError } from '../utils/errors';
import s3Service from '../services/s3.service';
import excelProcessingQueue from '../services/queue.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('file-controller');
const prisma = new PrismaClient();

/**
 * Upload Excel file
 */
export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const userId = req.user!.id;
  const file = req.file;

  // Upload to S3
  const uploadResult = await s3Service.uploadFile(
    file.buffer,
    file.originalname,
    file.mimetype,
    userId
  );

  // Create file record
  const fileRecord = await prisma.file.create({
    data: {
      originalName: file.originalname,
      storagePath: uploadResult.url,
      s3Key: uploadResult.key,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: 'UPLOADED',
      uploadedBy: userId,
    },
  });

  logger.info(`File uploaded: ${fileRecord.id}`);

  res.status(201).json({
    success: true,
    data: {
      file: fileRecord,
    },
  });
});

/**
 * Get all files for current user
 */
export const getFiles = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { page = 1, limit = 10, status } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { uploadedBy: userId };
  if (status) {
    where.status = status;
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        processingJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.file.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      files,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * Get file by ID
 */
export const getFileById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const file = await prisma.file.findFirst({
    where: { id, uploadedBy: userId },
    include: {
      processingJobs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!file) {
    throw new NotFoundError('File');
  }

  res.status(200).json({
    success: true,
    data: { file },
  });
});

/**
 * Download file
 */
export const downloadFile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const file = await prisma.file.findFirst({
    where: { id, uploadedBy: userId },
  });

  if (!file || !file.s3Key) {
    throw new NotFoundError('File');
  }

  // Get signed URL
  const signedUrl = await s3Service.getSignedUrl(file.s3Key, 300); // 5 minutes

  res.status(200).json({
    success: true,
    data: {
      downloadUrl: signedUrl,
      fileName: file.originalName,
    },
  });
});

/**
 * Delete file
 */
export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const file = await prisma.file.findFirst({
    where: { id, uploadedBy: userId },
  });

  if (!file) {
    throw new NotFoundError('File');
  }

  // Delete from S3
  if (file.s3Key) {
    await s3Service.deleteFile(file.s3Key);
  }

  // Delete from database
  await prisma.file.delete({ where: { id } });

  logger.info(`File deleted: ${id}`);

  res.status(200).json({
    success: true,
    message: 'File deleted successfully',
  });
});

/**
 * Start processing file
 */
export const processFile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const file = await prisma.file.findFirst({
    where: { id, uploadedBy: userId },
  });

  if (!file) {
    throw new NotFoundError('File');
  }

  // Create processing job
  const job = await prisma.processingJob.create({
    data: {
      fileId: id,
      userId,
      status: 'PENDING',
      totalRows: 0,
    },
  });

  // Add to queue
  await excelProcessingQueue.add({
    jobId: job.id,
    fileId: id,
    userId,
  });

  logger.info(`Processing job created: ${job.id}`);

  res.status(202).json({
    success: true,
    data: { job },
  });
});

