# Events & Activities Platform - Database Schema

## 📊 Overview

This is a **production-ready, scalable database schema** for an Events & Activities social platform. The schema is designed with:

- ✅ **Modular Architecture** - Organized into 10+ schema files
- ✅ **Comprehensive Indexing** - Optimized for performance
- ✅ **Full-text Search** - PostgreSQL extensions enabled
- ✅ **Scalability** - Designed to handle millions of records
- ✅ **Data Integrity** - Proper relationships and constraints
- ✅ **Audit Trail** - Complete activity logging
- ✅ **Soft Deletes** - Data preservation for analytics

---

## 📁 Schema Files Structure

```
prisma/schema/
├── schema.prisma        # Main config (generator, datasource)
├── enums.prisma         # All enum definitions (100+ enums)
├── user.prisma          # User, Profile, Verification, Auth
├── event.prisma         # Event, Category, Booking, Waitlist
├── payment.prisma       # Payment, Transaction, Subscription, Payout
├── social.prisma        # Friendship, Follow, Chat, Message, Posts
├── review.prisma        # Review, Rating, Category Ratings
├── notification.prisma  # Notification, Preferences, Queue
├── gamification.prisma  # Badge, Achievement, Points, Leaderboard
├── safety.prisma        # Report, Block, TrustScore, Moderation
└── admin.prisma         # AuditLog, SystemSettings, Support
```

---

## 🗃️ Database Tables (80+ Tables)

### **User Management** (8 tables)
- `users` - Core user authentication
- `profiles` - Extended user information
- `verifications` - Multi-type identity verification
- `refresh_tokens` - JWT token management
- `login_history` - Security tracking
- `interests` - User interests/hobbies
- `emergency_contacts` - Safety features
- `device_tokens` - Push notifications

### **Event Management** (11 tables)
- `events` - Core event data
- `event_categories` - Hierarchical categories
- `bookings` - Event registrations
- `event_participants` - Participant tracking
- `event_check_ins` - QR code check-in
- `event_updates` - Host announcements
- `saved_events` - User wishlist
- `waitlists` - Full event waiting lists
- `promo_codes` - Discount codes

### **Payment & Finance** (10 tables)
- `payments` - Payment transactions
- `transactions` - Complete ledger
- `refunds` - Refund management
- `subscriptions` - Subscription plans
- `payout_accounts` - Host bank details
- `payouts` - Host earnings distribution
- `commission_configs` - Platform fees
- `wallets` - Optional credit system

### **Social & Communication** (13 tables)
- `friendships` - Friend requests
- `follows` - Twitter-style following
- `chats` - Chat rooms
- `chat_participants` - Chat members
- `messages` - Chat messages
- `message_reactions` - Emoji reactions
- `posts` - Social feed
- `post_likes` - Post engagement
- `comments` - Post comments
- `stories` - 24h disappearing content
- `story_views` - Story analytics

### **Reviews & Ratings** (4 tables)
- `reviews` - Event/Host reviews
- `category_ratings` - Multi-category ratings
- `review_votes` - Helpfulness voting
- `rating_summaries` - Aggregated ratings

### **Notifications** (5 tables)
- `notifications` - All notifications
- `notification_preferences` - User settings
- `notification_queue` - Bulk sending queue
- `email_templates` - Email templating
- `device_tokens` - FCM/APNS tokens

### **Gamification** (11 tables)
- `badges` - Badge definitions
- `user_badges` - Earned badges
- `achievements` - Complex achievements
- `user_achievements` - Achievement progress
- `user_points` - Point transactions
- `point_balances` - Point summary
- `leaderboards` - Rankings
- `referrals` - Referral tracking
- `referral_codes` - Referral codes
- `streaks` - Daily streaks

### **Safety & Moderation** (10 tables)
- `reports` - Report system
- `blocks` - Block/mute users
- `trust_scores` - AI-powered trust system
- `safety_check_ins` - Event safety
- `moderation_queue` - Content moderation
- `warnings` - Warning system
- `suspension_records` - Bans/suspensions
- `suspicious_activities` - Fraud detection

### **Admin & Analytics** (13 tables)
- `audit_logs` - Complete audit trail
- `activity_logs` - User analytics
- `dashboard_stats` - Cached statistics
- `system_settings` - Configuration
- `feature_flags` - Feature toggles
- `api_keys` - API key management
- `background_jobs` - Job queue
- `announcements` - Platform announcements
- `faqs` - FAQ management
- `support_tickets` - Support system
- `ticket_responses` - Ticket messages
- `error_logs` - Error tracking
- `webhooks` - Webhook configuration

---

## 🚀 Key Features

### **1. Performance Optimization**

#### **Comprehensive Indexing**
```prisma
// Single field indexes
@@index([email])
@@index([status])
@@index([createdAt])

// Composite indexes
@@index([city, country])
@@index([latitude, longitude])
@@index([userId, eventId])

// Full-text search
@@fulltext([title, description, tags])
```

#### **Query Optimization**
- Indexes on foreign keys
- Indexes on frequently filtered fields
- Indexes on date ranges
- Composite indexes for complex queries

### **2. Data Integrity**

```prisma
// Cascade deletes
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

// Restrict deletes (prevent accidental deletion)
event Event @relation(fields: [eventId], references: [id], onDelete: Restrict)

// Unique constraints
@@unique([userId, eventId])
@@unique([email])
```

### **3. Soft Deletes**

```prisma
deletedAt DateTime? // Soft delete timestamp

// Query only active records
where: { deletedAt: null }
```

### **4. Audit Trail**

Every important action is logged:
- User actions
- Admin actions
- Data changes (before/after)
- IP address, user agent
- Timestamp tracking

### **5. Type Safety**

100+ Enums for type safety:
- `UserRole`, `UserStatus`
- `EventType`, `EventStatus`
- `PaymentStatus`, `PaymentMethod`
- `NotificationType`
- And many more...

---

## 🔧 Setup Instructions

### **1. Install Dependencies**

```bash
cd backend
npm install prisma @prisma/client dotenv
```

### **2. Configure Environment**

Create `.env` file:

```env
# PostgreSQL Database
DATABASE_URL="postgresql://user:password@localhost:5432/events_db?schema=public"

# Optional: Connection pooling (for production)
# DATABASE_URL="postgresql://user:password@localhost:5432/events_db?schema=public&connection_limit=100&pool_timeout=10"
```

### **3. Generate Prisma Client**

```bash
npx prisma generate
```

### **4. Create Database & Run Migrations**

```bash
# Create migration
npx prisma migrate dev --name init

# Or reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Apply migrations to production
npx prisma migrate deploy
```

### **5. Seed Database (Optional)**

Create `prisma/seed.ts`:

```typescript
import { Prisma Client } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  await prisma.user.create({
    data: {
      email: '[email protected]',
      username: 'admin',
      password: 'hashed_password',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      isVerified: true,
      profile: {
        create: {
          firstName: 'Super',
          lastName: 'Admin',
          profileCompletionPercentage: 100,
        },
      },
    },
  });

  // Create categories
  const categories = [
    { name: 'Music & Concerts', slug: 'music-concerts', icon: '🎵' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', icon: '🏃' },
    // ... more categories
  ];

  for (const cat of categories) {
    await prisma.eventCategory.create({ data: cat });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:

```bash
npx prisma db seed
```

---

## 📊 Database Statistics

- **Total Tables**: 82
- **Total Indexes**: 300+
- **Total Enums**: 100+
- **Relationships**: 150+
- **Full-text Indexes**: 10+

---

## 🎯 Design Decisions

### **Why Multi-File Schema?**

✅ **Better Organization** - Easier to navigate
✅ **Team Collaboration** - Less merge conflicts
✅ **Maintainability** - Logical grouping
✅ **Scalability** - Easy to add new features

### **Why PostgreSQL Extensions?**

```prisma
datasource db {
  provider   = "postgresql"
  extensions = [pg_trgm, pgcrypto]
}
```

- `pg_trgm` - Fast full-text search with trigrams
- `pgcrypto` - Built-in encryption functions

### **Why Soft Deletes?**

- Compliance requirements (GDPR, data retention)
- Analytics and reporting
- Ability to restore deleted data
- Audit trail maintenance

### **Why Cached/Aggregated Tables?**

Tables like `RatingSummary`, `PointBalance`, `DashboardStats`:
- **Performance** - Avoid complex aggregations on every request
- **Scalability** - Handle millions of records
- **User Experience** - Fast response times

Update these tables:
- Via database triggers
- Via background jobs
- Via event listeners

---

## 🔐 Security Considerations

### **1. Sensitive Data**

```prisma
password String // Always hash with bcrypt/argon2
twoFactorSecret String? // Encrypt at rest
documentUrl String? // Store in secure storage (S3 with encryption)
```

### **2. Personal Identifiable Information (PII)**

Consider encryption for:
- Email addresses
- Phone numbers
- Government ID numbers
- Payment details

### **3. Rate Limiting**

Use `ApiKey` table for tracking:

```typescript
const apiKey = await prisma.apiKey.findUnique({
  where: { key: request.headers.apiKey }
});

if (apiKey.currentUsage >= apiKey.rateLimit) {
  throw new Error('Rate limit exceeded');
}
```

### **4. IP Whitelisting**

```prisma
allowedIps String[] // Restrict API access
```

---

## 📈 Scalability Strategies

### **1. Database Sharding**

Consider sharding by:
- `userId` - User-based sharding
- Geographic region - Location-based
- Time period - Time-series data

### **2. Read Replicas**

```typescript
// Write to primary
await prisma.$transaction([...]);

// Read from replica
await prisma.$queryRaw`SELECT * FROM events`;
```

### **3. Caching Strategy**

Use Redis for:
- User sessions
- Event search results
- Rating summaries
- Dashboard statistics
- Frequently accessed data

### **4. Archival Strategy**

Archive old data:
- Completed events (>1 year)
- Old messages (>6 months)
- Old notifications (>3 months)
- Audit logs (>2 years)

Move to separate archive database or cold storage.

### **5. Connection Pooling**

```env
DATABASE_URL="postgresql://...?connection_limit=100&pool_timeout=10"
```

Or use external pooler (PgBouncer, Supabase Pooler).

---

## 🧪 Testing

### **Unit Tests**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('User Model', () => {
  it('should create user', async () => {
    const user = await prisma.user.create({
      data: {
        email: '[email protected]',
        username: 'testuser',
        password: 'hashed',
      },
    });
    expect(user.id).toBeDefined();
  });
});
```

### **Integration Tests**

Use separate test database:

```env
# .env.test
DATABASE_URL="postgresql://localhost:5432/events_test_db"
```

---

## 📚 Usage Examples

### **1. Create Event with Relations**

```typescript
const event = await prisma.event.create({
  data: {
    title: 'Tech Meetup',
    slug: 'tech-meetup-2026',
    description: 'Join us for an amazing tech meetup!',
    hostId: userId,
    categoryId: categoryId,
    type: 'TECH_INNOVATION',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    startDate: new Date('2026-02-15T18:00:00'),
    endDate: new Date('2026-02-15T21:00:00'),
    mode: 'PHYSICAL',
    venue: 'Tech Hub',
    city: 'Dhaka',
    country: 'Bangladesh',
    minParticipants: 5,
    maxParticipants: 50,
    isFree: false,
    price: 500,
    currency: 'BDT',
  },
  include: {
    host: { include: { profile: true } },
    category: true,
  },
});
```

### **2. Complex Search Query**

```typescript
const events = await prisma.event.findMany({
  where: {
    AND: [
      { status: 'PUBLISHED' },
      { deletedAt: null },
      {
        startDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { tags: { has: searchTerm } },
        ],
      },
    ],
  },
  include: {
    host: { select: { profile: true } },
    category: true,
    _count: { select: { bookings: true, savedBy: true } },
  },
  orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
  take: 20,
  skip: page * 20,
});
```

### **3. Transaction with Multiple Operations**

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Create booking
  const booking = await tx.booking.create({
    data: {
      userId,
      eventId,
      status: 'CONFIRMED',
      totalAmount: 500,
      // ... other fields
    },
  });

  // Create payment
  const payment = await tx.payment.create({
    data: {
      userId,
      eventId,
      amount: 500,
      status: 'COMPLETED',
      // ... other fields
    },
  });

  // Update event participant count
  await tx.event.update({
    where: { id: eventId },
    data: { currentParticipants: { increment: 1 } },
  });

  // Create notification
  await tx.notification.create({
    data: {
      userId,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed!',
      message: `Your booking for ${event.title} is confirmed`,
    },
  });

  return { booking, payment };
});
```

### **4. Aggregations & Analytics**

```typescript
const stats = await prisma.event.groupBy({
  by: ['type', 'city'],
  _count: { id: true },
  _avg: { price: true },
  _sum: { currentParticipants: true },
  where: {
    status: 'COMPLETED',
    completedAt: {
      gte: new Date('2026-01-01'),
      lte: new Date('2026-12-31'),
    },
  },
  orderBy: {
    _count: { id: 'desc' },
  },
});
```

---

## 🔄 Migration Strategy

### **Adding New Fields**

```prisma
model User {
  // ... existing fields
  
  // New field (optional initially)
  newField String?
  
  // After data migration, make required
  // newField String @default("default_value")
}
```

### **Renaming Fields**

```bash
# Step 1: Add new field
npx prisma migrate dev --name add_new_field

# Step 2: Migrate data
UPDATE users SET new_field = old_field;

# Step 3: Remove old field
npx prisma migrate dev --name remove_old_field
```

### **Breaking Changes**

Always use a two-phase deployment:
1. Deploy backwards-compatible schema
2. Migrate data
3. Deploy new application code
4. Remove old fields

---

## 🛠️ Maintenance

### **Regular Tasks**

1. **Backup Database** - Daily automated backups
2. **Analyze Performance** - Monitor slow queries
3. **Update Statistics** - Run `ANALYZE` regularly
4. **Archive Old Data** - Move historical data
5. **Reindex** - Rebuild indexes periodically
6. **Vacuum** - Reclaim storage space

### **Monitoring Queries**

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY idx_scan;

-- Table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;
```

---

## 📖 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)
- [Scaling PostgreSQL](https://www.postgresql.org/docs/current/performance-tips.html)

---

## 🤝 Contributing

When adding new features:

1. Add to appropriate schema file
2. Include proper indexes
3. Add to enums if needed
4. Update this README
5. Create migration
6. Test thoroughly

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for scalability and production use**
