/**
 * Job Routes
 */

import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/jobs
 * @desc    Get all jobs for current user
 * @access  Private
 */
router.get('/', authenticate, jobController.getJobs);

/**
 * @route   GET /api/v1/jobs/stats
 * @desc    Get job statistics
 * @access  Private
 */
router.get('/stats', authenticate, jobController.getJobStats);

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get job by ID
 * @access  Private
 */
router.get('/:id', authenticate, jobController.getJobById);

/**
 * @route   POST /api/v1/jobs/:id/cancel
 * @desc    Cancel job
 * @access  Private
 */
router.post('/:id/cancel', authenticate, jobController.cancelJob);

export default router;

