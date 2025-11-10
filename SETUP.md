# Complete Setup Guide

## Step-by-Step Installation

### 1. System Requirements

- **Operating System**: macOS, Linux, or Windows (WSL2)
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v15.0 or higher
- **Redis**: v7.0 or higher
- **Git**: Latest version
- **AWS Account**: For S3 storage

### 2. Install Dependencies

#### macOS (using Homebrew)
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@18

# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Install Redis
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### 3. Database Setup

```bash
# Create PostgreSQL user and database
sudo -u postgres psql

# In PostgreSQL shell:
CREATE USER perplexity_user WITH PASSWORD 'your_password';
CREATE DATABASE perplexity_automation OWNER perplexity_user;
GRANT ALL PRIVILEGES ON DATABASE perplexity_automation TO perplexity_user;
\q
```

### 4. AWS S3 Setup

1. **Create S3 Bucket**
   - Go to AWS Console → S3
   - Click "Create bucket"
   - Name: `perplexity-automation-files`
   - Region: `us-east-1` (or your preferred region)
   - Uncheck "Block all public access" (we'll use signed URLs)
   - Click "Create bucket"

2. **Create IAM User**
   - Go to AWS Console → IAM → Users
   - Click "Add user"
   - Username: `perplexity-automation`
   - Access type: Programmatic access
   - Attach policy: `AmazonS3FullAccess`
   - Save Access Key ID and Secret Access Key

### 5. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file
nano .env
```

**Update .env with your values:**
```bash
DATABASE_URL="postgresql://perplexity_user:your_password@localhost:5432/perplexity_automation"
JWT_SECRET="generate-a-random-secret-here"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET="perplexity-automation-files"
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Run migrations and seed:**
```bash
npx prisma generate
npx prisma migrate dev
npm run db:seed
```

**Start server:**
```bash
npm run dev
```

Server should be running at `http://localhost:3000`

### 6. Admin Dashboard Setup

```bash
cd admin-dashboard

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file
nano .env
```

**Update .env:**
```bash
VITE_API_URL=http://localhost:3000/api/v1
```

**Start dashboard:**
```bash
npm run dev
```

Dashboard should be running at `http://localhost:3001`

### 7. Chrome Extension Setup

```bash
# From project root
npm install

# Build extension
npm run build
```

**Load in Chrome:**
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist` folder
6. Extension should appear in toolbar

### 8. Verify Installation

#### Test Backend API
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-07T...",
  "environment": "development"
}
```

#### Test Admin Login
1. Open `http://localhost:3001`
2. Login with:
   - Email: `admin@example.com`
   - Password: `change-this-password` (from .env)

#### Test Extension
1. Click extension icon
2. Should see popup with "Load Part" buttons
3. Click "Load Part 1"
4. Should see rows loaded

### 9. Troubleshooting

#### PostgreSQL Connection Error
```bash
# Check if PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Check connection
psql -U perplexity_user -d perplexity_automation
```

#### Redis Connection Error
```bash
# Check if Redis is running
brew services list  # macOS
sudo systemctl status redis  # Linux

# Test connection
redis-cli ping
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Prisma Migration Error
```bash
# Reset database
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev
```

### 10. Development Workflow

#### Start All Services
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Admin Dashboard
cd admin-dashboard && npm run dev

# Terminal 3: Extension (rebuild on changes)
npm run build
```

#### Run Tests
```bash
# Backend tests
cd server && npm test

# Extension build
npm run build
```

#### View Logs
```bash
# Backend logs
tail -f server/logs/combined.log

# Error logs
tail -f server/logs/error.log
```

### 11. Next Steps

- [ ] Change default admin password
- [ ] Configure AWS S3 bucket
- [ ] Test file upload
- [ ] Test Excel processing
- [ ] Review API documentation
- [ ] Set up monitoring
- [ ] Configure backups

## Common Issues

### Issue: "Cannot find module '@prisma/client'"
**Solution:**
```bash
cd server
npx prisma generate
```

### Issue: "AWS S3 upload failed"
**Solution:**
- Verify AWS credentials in .env
- Check S3 bucket permissions
- Ensure bucket exists in correct region

### Issue: "JWT token expired"
**Solution:**
- Login again in admin dashboard
- Check JWT_EXPIRES_IN in .env

### Issue: "Extension not loading files"
**Solution:**
- Check if files exist in `public/parts/` folder
- Rebuild extension: `npm run build`
- Reload extension in Chrome

## Support

For issues or questions:
1. Check logs in `server/logs/`
2. Review error messages in browser console
3. Check GitHub issues
4. Contact support team

