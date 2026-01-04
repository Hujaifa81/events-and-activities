# 🚀 Quick Setup Guide - Events & Activities Platform

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

**Additional required packages:**
```bash
npm install bcrypt @types/bcrypt ts-node
```

## Step 2: Configure Environment

Create `.env` file in `backend/` directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/events_platform?schema=public"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=5000
NODE_ENV="development"

# Cloudinary (Image uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Stripe Payment (Optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (SendGrid or similar)
SENDGRID_API_KEY="your-sendgrid-key"
FROM_EMAIL="[email protected]"

# SMS (Twilio)
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"

# OpenAI (for AI features)
OPENAI_API_KEY="sk-..."

# Redis (Optional - for caching)
REDIS_URL="redis://localhost:6379"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
```

## Step 3: Setup Database

### Option A: Local PostgreSQL

1. Install PostgreSQL (if not installed)
2. Create database:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE events_platform;

# Exit
\q
```

### Option B: Use Docker

```bash
docker run --name postgres-events \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=events_platform \
  -p 5432:5432 \
  -d postgres:15
```

### Option C: Cloud Database (Supabase/Neon/Railway)

Get connection string from your provider and update `.env`

## Step 4: Generate Prisma Client

```bash
npm run db:generate
```

## Step 5: Run Migrations

```bash
# Create and apply migrations
npm run db:migrate
```

This will:
- Create all 82 tables
- Set up indexes
- Configure relationships
- Enable PostgreSQL extensions

## Step 6: Seed Database

```bash
npm run db:seed
```

This will create:
- ✅ Admin user
- ✅ Event categories (15)
- ✅ Interest tags (30)
- ✅ Badges (10)
- ✅ System settings
- ✅ Email templates
- ✅ Test users (3)
- ✅ Commission configs

## Step 7: Verify Setup

Open Prisma Studio to view data:

```bash
npm run db:studio
```

Browser will open at `http://localhost:5555`

## Step 8: Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:5000`

---

## 📝 Default Login Credentials

### Admin Account
- **Email:** [email protected]
- **Password:** Admin@12345
- **Role:** SUPER_ADMIN

### Test Accounts
- **Host:** [email protected] / Test@12345
- **User:** [email protected] / Test@12345
- **Host:** [email protected] / Test@12345

⚠️ **IMPORTANT:** Change these passwords in production!

---

## 🔄 Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Database
npm run db:generate      # Generate Prisma Client
npm run db:migrate       # Create and apply migration
npm run db:reset         # Reset database (⚠️ deletes all data)
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Run seed file
npm run db:status        # Check migration status
npm run db:push          # Push schema without migration (dev only)

# Code Quality
npm run lint             # Check linting errors
npm run lint:fix         # Fix linting errors automatically

# Build
npm run build            # Compile TypeScript to JavaScript
npm start                # Run production build
```

---

## 🗄️ Database Schema Overview

### **Core Tables:** 82 tables organized into:

1. **User Management** (8 tables)
   - users, profiles, verifications, refresh_tokens, etc.

2. **Event Management** (11 tables)
   - events, event_categories, bookings, event_participants, etc.

3. **Payments** (10 tables)
   - payments, transactions, refunds, subscriptions, payouts, etc.

4. **Social** (13 tables)
   - friendships, follows, chats, messages, posts, stories, etc.

5. **Reviews** (4 tables)
   - reviews, category_ratings, review_votes, rating_summaries

6. **Notifications** (5 tables)
   - notifications, notification_preferences, device_tokens, etc.

7. **Gamification** (11 tables)
   - badges, achievements, points, leaderboards, referrals, etc.

8. **Safety** (10 tables)
   - reports, blocks, trust_scores, moderation_queue, warnings, etc.

9. **Admin** (13 tables)
   - audit_logs, activity_logs, system_settings, support_tickets, etc.

---

## 🧪 Testing Database Setup

### Create Test Database

```bash
# Create separate test database
createdb events_platform_test

# Update .env.test
DATABASE_URL="postgresql://postgres:password@localhost:5432/events_platform_test?schema=public"
```

### Run Migrations for Test DB

```bash
# Use dotenv-cli to load .env.test
npm install --save-dev dotenv-cli

# Migrate test database
dotenv -e .env.test -- npx prisma migrate deploy
```

---

## 📊 Verify Schema

### Check Tables Created

```sql
-- Connect to database
psql -U postgres -d events_platform

-- List all tables
\dt

-- Check specific table structure
\d users

-- Count records in categories
SELECT COUNT(*) FROM event_categories;
```

### Expected Output:
- 82 tables created
- 15 event categories
- 30 interests
- 10 badges
- 4 users (1 admin + 3 test)

---

## 🔍 Troubleshooting

### Issue: "Cannot find module '@prisma/client'"

```bash
npm run db:generate
```

### Issue: "Database does not exist"

```bash
# Create database first
createdb events_platform

# Or using psql
psql -U postgres -c "CREATE DATABASE events_platform;"
```

### Issue: "Extension not available"

Some extensions require superuser. Use managed PostgreSQL or:

```sql
-- Connect as superuser
psql -U postgres -d events_platform

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Issue: Migration failed

```bash
# Check migration status
npm run db:status

# Reset and re-run (⚠️ deletes data)
npm run db:reset
```

### Issue: "bcrypt" not found in seed

```bash
npm install bcrypt @types/bcrypt
```

---

## 🚀 Next Steps

1. ✅ Test API endpoints with Postman/Thunder Client
2. ✅ Create frontend Next.js app
3. ✅ Implement authentication flow
4. ✅ Build event CRUD operations
5. ✅ Integrate payment gateway
6. ✅ Add real-time features with Socket.io
7. ✅ Implement AI recommendations
8. ✅ Deploy to production

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Schema README](./prisma/schema/README.md)

---

## 🆘 Need Help?

Check the detailed [Schema README](./prisma/schema/README.md) for:
- Complete table documentation
- Usage examples
- Performance optimization tips
- Scaling strategies
- Security best practices

---

**🎉 You're all set! Happy coding!**
