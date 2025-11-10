/**
 * Job Controller
 * Handles processing job queries and management
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('job-controller');
const prisma = new PrismaClient();

/**
 * Get all jobs for current user
 */
export const getJobs = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { page = 1, limit = 10, status } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const [jobs, total] = await Promise.all([
    prisma.processingJob.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        file: {
          select: {
            id: true,
            originalName: true,
            fileSize: true,
          },
        },
      },
    }),
    prisma.processingJob.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      jobs,
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
 * Get job by ID
 */
export const getJobById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const job = await prisma.processingJob.findFirst({
    where: { id, userId },
    include: {
      file: true,
      rowResults: {
        orderBy: { rowIndex: 'asc' },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('Job');
  }

  res.status(200).json({
    success: true,
    data: { job },
  });
});

/**
 * Get job statistics
 */
export const getJobStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [total, pending, running, completed, failed] = await Promise.all([
    prisma.processingJob.count({ where: { userId } }),
    prisma.processingJob.count({ where: { userId, status: 'PENDING' } }),
    prisma.processingJob.count({ where: { userId, status: 'RUNNING' } }),
    prisma.processingJob.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.processingJob.count({ where: { userId, status: 'FAILED' } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      pending,
      running,
      completed,
      failed,
    },
  });
});

/**
 * Cancel job
 */
export const cancelJob = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const job = await prisma.processingJob.findFirst({
    where: { id, userId },
  });

  if (!job) {
    throw new NotFoundError('Job');
  }

  if (job.status === 'COMPLETED' || job.status === 'FAILED') {
    throw new Error('Cannot cancel completed or failed job');
  }

  await prisma.processingJob.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  logger.info(`Job cancelled: ${id}`);

  res.status(200).json({
    success: true,
    message: 'Job cancelled successfully',
  });
});

