/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

import { Request, Response } from 'express';
import { body } from 'express-validator';
import authService from '../services/auth.service';
import { asyncHandler } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth-controller');

/**
 * Validation rules for registration
 */
export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
];

/**
 * Validation rules for login
 */
export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  logger.info(`User registered: ${result.user.email}`);

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  logger.info(`User logged in: ${result.user.email}`);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get current user
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * Logout user (client-side token removal)
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  logger.info(`User logged out: ${req.user?.email}`);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

