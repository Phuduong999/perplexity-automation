/**
 * Database Seed Script
 * Creates initial admin user and system settings
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import config from '../src/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash(config.admin.password, 10);

  const admin = await prisma.user.upsert({
    where: { email: config.admin.email },
    update: {},
    create: {
      email: config.admin.email,
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`Admin user created: ${admin.email}`);

  // Create system settings
  const settings = [
    {
      key: 'max_concurrent_jobs',
      value: '5',
      description: 'Maximum number of concurrent processing jobs',
    },
    {
      key: 'rows_per_thread',
      value: '50',
      description: 'Number of rows to process before creating new thread',
    },
    {
      key: 'enable_webhooks',
      value: 'true',
      description: 'Enable webhook notifications',
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('System settings created');

  console.log('Database seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

