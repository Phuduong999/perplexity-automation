# Supabase Integration Guide

This project is configured to use **Supabase PostgreSQL** as the database backend.

## 🎯 Your Supabase Project

**Project URL**: https://okexcmjsuvctvjgvvzqh.supabase.co  
**Project Reference**: `okexcmjsuvctvjgvvzqh`  
**Region**: Asia Pacific (Southeast Asia) - Singapore

## 📋 Step-by-Step Setup

### 1. Get Your Database Password

1. Go to https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/settings/database
2. Scroll to **Connection string**
3. Copy your database password (you set this when creating the project)
4. If you forgot it, click **Reset Database Password**

### 2. Configure Environment Variables

Edit `server/.env`:

```bash
# Supabase PostgreSQL Connection
# Connection pooling (for serverless/production)
DATABASE_URL="postgresql://postgres.okexcmjsuvctvjgvvzqh:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres.okexcmjsuvctvjgvvzqh:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase API Configuration
SUPABASE_URL="https://okexcmjsuvctvjgvvzqh.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZXhjbWpzdXZjdHZqZ3Z2enFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTgyMjYsImV4cCI6MjA3ODA3NDIyNn0.vOmq-3Irm9dS0lWG-QLXFs4WsB64Ncc1mJwgFQswnP0"
```

**Replace `[YOUR-PASSWORD]` with your actual database password!**

### 3. Get Service Role Key (Optional - for admin operations)

1. Go to https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/settings/api
2. Copy **service_role** key (secret)
3. Add to `.env`:

```bash
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### 4. Run Database Migrations

```bash
cd server

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Seed database (creates admin user)
npm run db:seed
```

### 5. Verify Connection

```bash
# Test database connection
npx prisma db push

# Open Prisma Studio to view data
npx prisma studio
```

## 🔍 Connection String Explained

### DATABASE_URL (Pooled Connection)
```
postgresql://postgres.okexcmjsuvctvjgvvzqh:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

- **User**: `postgres.okexcmjsuvctvjgvvzqh`
- **Host**: `aws-0-ap-southeast-1.pooler.supabase.com`
- **Port**: `6543` (PgBouncer pooler)
- **Database**: `postgres`
- **Uses**: Application queries (connection pooling)

### DIRECT_URL (Direct Connection)
```
postgresql://postgres.okexcmjsuvctvjgvvzqh:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

- **Port**: `5432` (Direct PostgreSQL)
- **Uses**: Migrations, schema changes

## 📊 View Your Database

### Option 1: Supabase Dashboard
1. Go to https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/editor
2. View tables, run SQL queries
3. Use Table Editor for visual data management

### Option 2: Prisma Studio
```bash
cd server
npx prisma studio
```
Opens at http://localhost:5555

### Option 3: SQL Editor
1. Go to https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/sql
2. Run custom SQL queries

## 🔐 Security Best Practices

### 1. Enable Row Level Security (RLS)

After running migrations, enable RLS on sensitive tables:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  USING (auth.uid()::text = id);
```

### 2. Use Service Role Key Carefully

- **NEVER** expose service role key in client-side code
- Only use in backend/server code
- Store in environment variables

### 3. API Key Security

- **Anon Key**: Safe for client-side (public)
- **Service Role Key**: Server-side only (secret)

## 🚀 Production Deployment

### Update Connection Strings for Production

```bash
# Production .env
NODE_ENV=production

# Use connection pooling for better performance
DATABASE_URL="postgresql://postgres.okexcmjsuvctvjgvvzqh:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"

DIRECT_URL="postgresql://postgres.okexcmjsuvctvjgvvzqh:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

### Run Production Migrations

```bash
# Deploy migrations (no prompts)
npx prisma migrate deploy
```

## 📈 Monitoring & Limits

### Free Tier Limits
- **Database Size**: 500 MB
- **Bandwidth**: 5 GB
- **API Requests**: Unlimited

### Monitor Usage
1. Go to https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/settings/billing
2. View database size, bandwidth, API requests

### Upgrade if Needed
- **Pro Plan**: $25/month (8 GB database, 250 GB bandwidth)
- **Team Plan**: $599/month (unlimited)

## 🛠️ Troubleshooting

### Error: "Can't reach database server"

**Solution:**
1. Check your password is correct
2. Verify project is not paused (free tier pauses after 7 days inactivity)
3. Check firewall/network settings

### Error: "SSL connection required"

**Solution:**
Add `?sslmode=require` to connection string:
```
DATABASE_URL="...postgres?pgbouncer=true&sslmode=require"
```

### Error: "Too many connections"

**Solution:**
1. Use pooled connection (port 6543)
2. Reduce `connection_limit` in connection string
3. Upgrade to Pro plan for more connections

### Database Paused (Free Tier)

**Solution:**
1. Go to https://app.supabase.com/project/okexcmjsuvctvjgvvzqh
2. Click "Restore" if paused
3. Database auto-pauses after 7 days of inactivity on free tier

## 🔄 Migration Commands

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status

# Generate Prisma client after schema changes
npx prisma generate
```

## 📚 Useful Links

- **Project Dashboard**: https://app.supabase.com/project/okexcmjsuvctvjgvvzqh
- **Database Settings**: https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/settings/database
- **API Settings**: https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/settings/api
- **SQL Editor**: https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/sql
- **Table Editor**: https://app.supabase.com/project/okexcmjsuvctvjgvvzqh/editor
- **Supabase Docs**: https://supabase.com/docs

## ✅ Quick Verification Checklist

- [ ] Database password obtained
- [ ] `.env` file updated with connection strings
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Migrations run successfully (`npx prisma migrate dev`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Connection verified (Prisma Studio opens)
- [ ] Backend starts without errors (`npm run dev`)

---

**Your Supabase PostgreSQL database is now connected! 🎉**

