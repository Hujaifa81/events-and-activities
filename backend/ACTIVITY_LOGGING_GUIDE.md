// Activity Logger Integration Guide

## 📋 Activity Logging System - Complete Setup

### ✅ Files Created:
1. **src/shared/constants/activityTypes.ts** - Activity & Entity type enums
2. **src/shared/helper/activityLogger.ts** - Activity logging functions
3. **src/app/middlewares/activityLogger.ts** - Automatic tracking middleware

---

## 🚀 Setup Instructions

### 1. Install Required Package
```bash
npm install uuid
npm install -D @types/uuid
```

### 2. Enable Middleware (in src/app.ts or src/server.ts)

```typescript
import { activityLoggerMiddleware } from '@/app/middlewares';

// After authentication middleware, before routes
app.use(activityLoggerMiddleware);

// Your routes here...
app.use('/api', routes);
```

### 3. Enable Session Cleanup Cron (in src/app/modules/stats/stats.cron.ts)

```typescript
import { sessionCleanupJob } from '@/app/middlewares';

// Run every hour to calculate session durations
cron.schedule('0 * * * *', async () => {
  console.log('🔄 Running session cleanup job...');
  await sessionCleanupJob();
});
```

---

## 📖 Usage Examples

### **1. Manual Activity Logging in Controllers**

```typescript
import { logActivity, ActivityType, EntityType } from '@/shared';

// Event View
const getEventById = catchAsync(async (req: Request, res: Response) => {
  const event = await EventService.getEventById(req.params.id);

  // Log activity
  await logActivity({
    activityType: ActivityType.EVENT_VIEW,
    activityName: `View Event: ${event.title}`,
    userId: req.user?.id,
    entityType: EntityType.EVENT,
    entityId: event.id,
    req,
  });

  sendResponse(res, { success: true, data: event });
});

// Search
const searchEvents = catchAsync(async (req: Request, res: Response) => {
  const { query } = req.query;
  const events = await EventService.searchEvents(req.query);

  await logActivity({
    activityType: ActivityType.SEARCH,
    activityName: `Search: "${query}"`,
    userId: req.user?.id,
    metadata: { query, resultsCount: events.length },
    req,
  });

  sendResponse(res, { success: true, data: events });
});

// Booking Creation
const createBooking = catchAsync(async (req: Request, res: Response) => {
  const booking = await BookingService.createBooking(req.body);

  await logActivity({
    activityType: ActivityType.BOOKING_CREATE,
    activityName: `Create Booking for Event #${booking.eventId}`,
    userId: req.user!.id,
    entityType: EntityType.BOOKING,
    entityId: booking.id,
    metadata: { 
      eventId: booking.eventId, 
      amount: booking.totalAmount 
    },
    req,
  });

  sendResponse(res, { success: true, data: booking });
});

// Login
const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  await logActivity({
    activityType: ActivityType.LOGIN,
    activityName: 'User Login',
    userId: result.user.id,
    req,
  });

  sendResponse(res, { success: true, data: result });
});
```

### **2. Using Convenience Functions**

```typescript
import { 
  logEventView, 
  logSearch, 
  logBookingCreate,
  logAuth 
} from '@/shared';

// Event View
await logEventView(event.id, event.title, req);

// Search
await logSearch('Birthday Party', results.length, req);

// Booking
await logBookingCreate(booking.id, booking.eventId, booking.totalAmount, req);

// Auth
await logAuth(ActivityType.LOGIN, user.id, req);
```

### **3. Tracking Performance (with duration)**

```typescript
const performSearch = catchAsync(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  const results = await EventService.searchEvents(req.query);
  
  await logActivity({
    activityType: ActivityType.SEARCH,
    activityName: `Search: "${req.query.query}"`,
    duration: Date.now() - startTime, // Milliseconds
    metadata: { resultsCount: results.length },
    req,
  });

  sendResponse(res, { success: true, data: results });
});
```

### **4. End Session on Logout**

```typescript
import { endSession } from '@/app/middlewares';

const logout = catchAsync(async (req: Request, res: Response) => {
  // End session and calculate duration
  await endSession(req.sessionId, req.user?.id);

  // Clear session cookie
  res.clearCookie('sessionId');

  sendResponse(res, { success: true, message: 'Logged out' });
});
```

---

## 📊 Stats Service Integration

Stats service **already updated** with ActivityLog queries:
- `totalPageViews` - Counts PAGE_VIEW activities
- `avgSessionDuration` - Average session duration in seconds

Test after migration:
```bash
npm run db:migrate
npm run dev
```

Then call stats API:
```bash
GET /api/stats/latest
GET /api/stats/DAILY
```

---

## 🔍 Available Activity Types

### Navigation
- `PAGE_VIEW`, `PAGE_EXIT`

### Discovery
- `SEARCH`, `FILTER_APPLY`, `SORT_APPLY`, `CATEGORY_BROWSE`

### Events
- `EVENT_VIEW`, `EVENT_CREATE`, `EVENT_EDIT`, `EVENT_DELETE`
- `EVENT_PUBLISH`, `EVENT_SHARE`, `EVENT_FAVORITE`

### Bookings
- `BOOKING_CREATE`, `BOOKING_VIEW`, `BOOKING_CANCEL`, `BOOKING_CONFIRM`

### Payments
- `PAYMENT_INITIATED`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`

### Authentication
- `LOGIN`, `LOGOUT`, `SIGNUP`, `PASSWORD_RESET`

### Social
- `REVIEW_CREATE`, `MESSAGE_SEND`, `FOLLOW`, `FRIEND_REQUEST_SEND`

[See full list in activityTypes.ts]

---

## 🎯 What Gets Tracked Automatically?

✅ **Page Views** - All GET requests (excluding /api/*, static files)
✅ **Session IDs** - Created and stored in cookies
✅ **Device Info** - Browser, OS, Device type
✅ **Location** - IP address, referrer
✅ **User Agent** - Full user agent string

---

## 🧪 Testing

### 1. Test Page View Tracking
```bash
# Open browser
http://localhost:5000/events

# Check ActivityLog table in Prisma Studio
npm run db:studio
```

### 2. Test Manual Activity Logging
```bash
# Create an event (triggers EVENT_CREATE log)
POST /api/events
Authorization: Bearer <token>

# View event (triggers EVENT_VIEW log)
GET /api/events/:id

# Check logs
npm run db:studio → activity_logs table
```

### 3. Test Stats Generation
```bash
# Generate daily stats
POST /api/stats/generate
{
  "period": "DAILY",
  "forceRegenerate": true
}

# Check totalPageViews and avgSessionDuration
GET /api/stats/latest
```

---

## 🛠️ Advanced Features

### Batch Logging
```typescript
import { batchLogActivities, ActivityType } from '@/shared';

await batchLogActivities([
  { 
    activityType: ActivityType.EVENT_VIEW, 
    activityName: 'View Event 1',
    userId: user.id 
  },
  { 
    activityType: ActivityType.EVENT_VIEW, 
    activityName: 'View Event 2',
    userId: user.id 
  },
]);
```

### Custom Metadata
```typescript
await logActivity({
  activityType: ActivityType.SEARCH,
  activityName: 'Search Events',
  metadata: {
    query: 'birthday',
    category: 'PARTY',
    priceRange: '1000-5000',
    filters: ['available', 'nearby'],
    resultsCount: 15,
  },
  req,
});
```

---

## 📈 Database Queries

### Get Page Views Count
```typescript
const pageViews = await prisma.activityLog.count({
  where: {
    activityType: 'PAGE_VIEW',
    createdAt: { gte: startDate, lte: endDate },
  },
});
```

### Get Popular Events
```typescript
const popularEvents = await prisma.activityLog.groupBy({
  by: ['entityId'],
  where: {
    activityType: 'EVENT_VIEW',
    entityType: 'EVENT',
  },
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
  take: 10,
});
```

### Get User Activity Timeline
```typescript
const timeline = await prisma.activityLog.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  take: 50,
});
```

### Get Average Session Duration
```typescript
const avgDuration = await prisma.activityLog.groupBy({
  by: ['sessionId'],
  where: {
    duration: { not: null },
    createdAt: { gte: dayStart, lte: dayEnd },
  },
  _avg: { duration: true },
});
```

---

## ✅ Implementation Checklist

- [ ] Install uuid package
- [ ] Add activityLoggerMiddleware to app.ts/server.ts
- [ ] Add sessionCleanupJob to stats.cron.ts
- [ ] Run database migration (`npm run db:migrate`)
- [ ] Add logActivity() calls to important controllers
- [ ] Test page view tracking in browser
- [ ] Test manual activity logging via API
- [ ] Verify stats generation includes pageViews & sessionDuration
- [ ] Monitor logs for any errors

---

## 🚨 Important Notes

1. **Non-blocking**: Activity logging **never throws errors** - app continues even if logging fails
2. **Session Cleanup**: Run `sessionCleanupJob` hourly to calculate session durations
3. **Performance**: ActivityLog writes are async and don't block request handling
4. **Privacy**: Store only necessary data, respect GDPR/privacy laws
5. **Retention**: Consider adding TTL policy to delete old logs (e.g., 90 days)

---

## 🎉 You're Done!

Your activity logging system is now production-ready. Start tracking user behavior and generating analytics!
