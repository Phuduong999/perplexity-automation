
15:37:50 - Created thread for undefined

15:37:50 - Created thread for Food Exclusion Tag_RootFile_Part1.xlsx

15:37:50 - Failed to load file: TypeError: Error in invocation of runtime.getURL(string path): No matching signature.

15:37:50 - Thread created: thread_1762504670132_undefined

15:37:50 - Loaded 178 rows for processing

15:37:50 - Error: Error: Failed to open Perplexity tab/**
 * Centralized Configuration
 * All environment variables and constants in one place
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  // Server
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiVersion: process.env.API_VERSION || 'v1',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // AWS S3
  aws: {
    region: process.env.AWS_REGION!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    s3Bucket: process.env.AWS_S3_BUCKET!,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['.xlsx', '.xls'],
    uploadDir: path.join(__dirname, '../../uploads'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },

  // Webhook
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'default-webhook-secret',
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'change-this-password',
  },

  // Excel Processing
  excel: {
    rowsPerThread: 50,
    maxConcurrentJobs: 5,
    tagColumns: {
      F: { name: 'Protein Sources', tags: ['Beef', 'Pork', 'Chicken', 'Turkey', 'Lamb', 'Fish', 'Shellfish', 'Eggs', 'Dairy'] },
      G: { name: 'Dairy Alternatives', tags: ['Lactose-Free', 'Non-Dairy Milk', 'Non-Dairy Cheese'] },
      H: { name: 'Grains & Starches', tags: ['Wheat', 'Gluten-Free Grains', 'Pasta Alternatives', 'Potatoes', 'Corn'] },
      I: { name: 'Legumes & Nuts', tags: ['Beans', 'Peanuts', 'Tree Nuts', 'Soy', 'Lentils'] },
      J: { name: 'Vegetables', tags: ['Nightshades', 'Cruciferous', 'Leafy Greens', 'Mushrooms', 'Alliums'] },
      K: { name: 'Fruits', tags: ['Citrus', 'Berries', 'Tropical Fruits', 'Stone Fruits', 'Melons'] },
      L: { name: 'Herbs & Spices', tags: ['Dried Herbs & Spices', 'Fresh Herbs', 'Spicy'] },
      M: { name: 'Miscellaneous', tags: ['Sweeteners', 'Alcohol', 'Caffeine'] },
      N: { name: 'Others (Fallback)', tags: ['Other'] },
    },
    columns: {
      ID: 'A',
      STATUS_FROM_BA: 'B',
      STATUS: 'C',
      INGREDIENT_NAME: 'D',
      SKIP: 'E',
      TAG_START: 'F',
      TAG_END: 'N',
    },
    statusValues: {
      REVIEW: 'REVIEW',
      OK: 'OK',
      NOT_OK: 'NOT-OK',
    },
  },
} as const;

export default config;

