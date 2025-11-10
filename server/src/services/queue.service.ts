/**
 * Queue Service using Bull
 * Handles background job processing for Excel files
 */

import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import { createLogger } from '../utils/logger';
import ExcelService from './excel.service';
import s3Service from './s3.service';

const logger = createLogger('queue-service');
const prisma = new PrismaClient();

interface ProcessJobData {
  jobId: string;
  fileId: string;
  userId: string;
}

interface RowProcessingData {
  rowIndex: number;
  ingredientName: string;
  tags: string[];
}

// Create queue
export const excelProcessingQueue = new Queue<ProcessJobData>('excel-processing', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Process Excel file job
 */
excelProcessingQueue.process(async (job) => {
  const { jobId, fileId, userId } = job.data;

  logger.info(`Processing job ${jobId} for file ${fileId}`);

  try {
    // Update job status to RUNNING
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Get file from database
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || !file.s3Key) {
      throw new Error('File not found or missing S3 key');
    }

    // Download file from S3
    const fileBuffer = await s3Service.downloadFile(file.s3Key);

    // Parse Excel file
    const excelService = new ExcelService();
    excelService.parseExcelFromBuffer(fileBuffer);

    // Get rows to process
    const reviewRows = excelService.getReviewRows();
    const totalRows = reviewRows.length;

    // Update job with total rows
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { totalRows },
    });

    // Process each row
    let processedCount = 0;
    let failedCount = 0;

    for (const row of reviewRows) {
      try {
        // Here you would call Perplexity AI API
        // For now, we'll simulate with mock data
        const tags = await simulateAIProcessing(row.name);

        // Map tags to columns
        const mappedColumns = excelService.mapTagsToColumns(tags);

        // Write tags to Excel
        excelService.writeTagsToRow(row.rowIndex, mappedColumns);

        // Update row status
        excelService.updateRowStatus(row.rowIndex, config.excel.statusValues.OK);

        // Save row result
        await prisma.rowResult.create({
          data: {
            jobId,
            rowIndex: row.rowIndex,
            ingredientId: row.ingredientId,
            ingredientName: row.name,
            originalStatus: row.status,
            newStatus: config.excel.statusValues.OK,
            tags,
            success: true,
          },
        });

        processedCount++;
      } catch (error: any) {
        logger.error(`Error processing row ${row.rowIndex}:`, error);

        // Save error result
        await prisma.rowResult.create({
          data: {
            jobId,
            rowIndex: row.rowIndex,
            ingredientId: row.ingredientId,
            ingredientName: row.name,
            originalStatus: row.status,
            newStatus: config.excel.statusValues.NOT_OK,
            tags: [],
            success: false,
            errorMessage: error.message,
          },
        });

        failedCount++;
      }

      // Update progress
      const progress = ((processedCount + failedCount) / totalRows) * 100;
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          progress,
          processedRows: processedCount,
          failedRows: failedCount,
        },
      });

      // Report progress
      job.progress(progress);
    }

    // Save processed Excel file
    const outputBuffer = excelService.saveExcelFile();

    // Upload to S3
    const uploadResult = await s3Service.uploadFile(
      outputBuffer,
      `${file.originalName}_PROCESSED.xlsx`,
      file.mimeType,
      userId
    );

    // Update file record
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'COMPLETED',
        s3Key: uploadResult.key,
        processedRows: processedCount,
      },
    });

    // Update job status
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        progress: 100,
      },
    });

    logger.info(`Job ${jobId} completed successfully`);

    return { success: true, processedRows: processedCount, failedRows: failedCount };
  } catch (error: any) {
    logger.error(`Job ${jobId} failed:`, error);

    // Update job status to FAILED
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    });

    throw error;
  }
});

/**
 * Simulate AI processing (replace with actual Perplexity API call)
 */
async function simulateAIProcessing(ingredientName: string): Promise<string[]> {
  // This is a placeholder - replace with actual Perplexity AI integration
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock response
  return ['Beef', 'Protein Sources'];
}

export default excelProcessingQueue;

