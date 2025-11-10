/**
 * File Routes
 */

import { Router } from 'express';
import multer from 'multer';
import * as fileController from '../controllers/file.controller';
import { authenticate } from '../middleware/auth';
import config from '../config';

const router = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (config.upload.allowedTypes.includes(`.${ext}`)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files are allowed.'));
    }
  },
});

/**
 * @route   POST /api/v1/files/upload
 * @desc    Upload Excel file
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), fileController.uploadFile);

/**
 * @route   GET /api/v1/files
 * @desc    Get all files for current user
 * @access  Private
 */
router.get('/', authenticate, fileController.getFiles);

/**
 * @route   GET /api/v1/files/:id
 * @desc    Get file by ID
 * @access  Private
 */
router.get('/:id', authenticate, fileController.getFileById);

/**
 * @route   GET /api/v1/files/:id/download
 * @desc    Download file
 * @access  Private
 */
router.get('/:id/download', authenticate, fileController.downloadFile);

/**
 * @route   DELETE /api/v1/files/:id
 * @desc    Delete file
 * @access  Private
 */
router.delete('/:id', authenticate, fileController.deleteFile);

/**
 * @route   POST /api/v1/files/:id/process
 * @desc    Start processing file
 * @access  Private
 */
router.post('/:id/process', authenticate, fileController.processFile);

export default router;

