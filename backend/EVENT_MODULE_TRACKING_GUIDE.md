# Event Module - Complete Activity Logging Example

এই module টা **Ask2Buy** platform এর জন্য complete activity tracking system দেখায়।

---

## 📁 File Structure

```
src/app/modules/event/
├── event.controller.ts   ← Activity logging এখানে
├── event.service.ts      ← Business logic
└── event.routes.ts       ← Route definitions
```

---

## 🎯 Activity Tracking Examples

### 1️⃣ EVENT_VIEW (সবচেয়ে common)

```typescript
// event.controller.ts - Line 60
const getEventById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.userId; // Optional (guest users)
  
  const event = await EventService.getEventById(id);
  
  // ✅ Track event view
  logEventView(id, event.title, req, userId).catch(err => 
    console.error('Event view tracking failed:', err)
  );
  
  sendResponse(res, { data: event });
});
```

**কি track হচ্ছে:**
- Event ID
- Event title
- User ID (if logged in)
- Session ID (middleware থেকে)
- IP address, device, browser
- Timestamp

**Database entry:**
```json
{
  "activityType": "EVENT_VIEW",
  "activityName": "Viewed Concert in Dhaka",
  "userId": "user123",
  "sessionId": "abc123-...",
  "entityType": "EVENT",
  "entityId": "event456",
  "ipAddress": "192.168.1.1",
  "userAgent": "Chrome/120...",
  "createdAt": "2026-01-05T10:30:00Z"
}
```

---

### 2️⃣ SEARCH (Discovery tracking)

```typescript
// event.controller.ts - Line 23
const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const { search } = req.query;
  const userId = (req as any).user?.userId;
  
  const result = await EventService.getAllEvents(req.query);
  
  // ✅ Track search query
  if (search) {
    logSearch(
      search as string,
      result.data.length,
      req,
      userId
    ).catch(err => console.error('Search tracking failed:', err));
  }
  
  sendResponse(res, { data: result.data });
});
```

**Analytics insights:**
- Most searched keywords
- Zero-result searches (improve content)
- Popular search terms
- Search-to-booking conversion

---

### 3️⃣ EVENT_CREATE (Business tracking)

```typescript
// event.controller.ts - Line 88
const createEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  
  const event = await EventService.createEvent(userId, req.body);
  
  // ✅ Track event creation (await করছি কারণ critical)
  await logActivity({
    activityType: ActivityType.EVENT_CREATE,
    activityName: 'Event Created',
    userId,
    entityType: EntityType.EVENT,
    entityId: event.id,
    metadata: {
      title: event.title,
      type: event.type,
      categoryId: event.categoryId,
      isFree: event.isFree,
      price: event.price,
    },
    req,
  });
  
  sendResponse(res, { data: event });
});
```

**Custom metadata:**
- Event details
- Pricing info
- Category
- Any business-critical data

---

### 4️⃣ CATEGORY_VIEW (Navigation tracking)

```typescript
// event.controller.ts - Line 37
if (category) {
  logActivity({
    activityType: ActivityType.CATEGORY_VIEW,
    activityName: `Browsed ${category} category`,
    userId,
    entityType: EntityType.EVENT,
    metadata: {
      category,
      resultCount: result.data.length,
      filters: { city },
    },
    req,
  }).catch(err => console.error('Category tracking failed:', err));
}
```

**Analytics insights:**
- Popular categories
- Category engagement
- Filter usage patterns

---

### 5️⃣ EVENT_SAVE (Engagement tracking)

```typescript
// event.controller.ts - Line 194
const saveEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;
  
  const savedEvent = await EventService.saveEvent(id, userId);
  
  // ✅ Track wishlist action
  await logActivity({
    activityType: ActivityType.EVENT_SAVE,
    activityName: 'Event Saved',
    userId,
    entityType: EntityType.EVENT,
    entityId: id,
    metadata: {
      title: savedEvent.event.title,
    },
    req,
  });
  
  sendResponse(res, { data: savedEvent });
});
```

---

### 6️⃣ SHARE (Viral tracking)

```typescript
// event.controller.ts - Line 221
const shareEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { platform } = req.body;
  const userId = (req as any).user?.userId;
  
  const event = await EventService.getEventById(id);
  
  // ✅ Track share with platform info
  await logActivity({
    activityType: ActivityType.SHARE,
    activityName: 'Event Shared',
    userId,
    entityType: EntityType.EVENT,
    entityId: id,
    metadata: {
      title: event.title,
      platform, // facebook, twitter, whatsapp
      shareUrl: `${process.env.FRONTEND_URL}/events/${id}`,
    },
    req,
  });
  
  sendResponse(res, { data: { shareUrl: '...' } });
});
```

**Track which platforms drive traffic!**

---

### 7️⃣ Location-based Search

```typescript
// event.controller.ts - Line 285
const getNearbyEvents = catchAsync(async (req: Request, res: Response) => {
  const { latitude, longitude, radius } = req.query;
  const userId = (req as any).user?.userId;
  
  const result = await EventService.getNearbyEvents(
    Number(latitude),
    Number(longitude),
    Number(radius) || 10
  );
  
  // ✅ Track location searches
  logActivity({
    activityType: ActivityType.SEARCH,
    activityName: 'Nearby Events Search',
    userId,
    entityType: EntityType.EVENT,
    metadata: {
      searchType: 'location',
      coordinates: { latitude, longitude },
      radius,
      resultCount: result.length,
    },
    req,
  }).catch(err => console.error('Location search tracking failed:', err));
  
  sendResponse(res, { data: result });
});
```

---

## 🚀 How to Use in Your Controllers

### Step 1: Import Helper Functions

```typescript
import { 
  logEventView,    // For event views
  logSearch,       // For searches
  logActivity      // For everything else
} from '@/shared/helper/activityLogger';

import { ActivityType, EntityType } from '@/shared/constants/activityTypes';
```

### Step 2: Add Logging After Business Logic

```typescript
const yourController = catchAsync(async (req, res) => {
  // 1. Get user ID (optional for guest users)
  const userId = (req as any).user?.userId;
  
  // 2. Execute business logic
  const data = await YourService.doSomething();
  
  // 3. Track activity (non-blocking with .catch())
  logActivity({
    activityType: ActivityType.YOUR_ACTION,
    activityName: 'Readable Name',
    userId,
    entityType: EntityType.YOUR_ENTITY,
    entityId: data.id,
    metadata: { any: 'custom data' },
    req,
  }).catch(err => console.error('Tracking failed:', err));
  
  // 4. Send response
  sendResponse(res, { data });
});
```

### Step 3: Choose Blocking vs Non-blocking

**Non-blocking (Recommended for most cases):**
```typescript
logActivity({...}).catch(err => console.error(err));
// Request continues immediately
```

**Blocking (For critical actions):**
```typescript
await logActivity({...});
// Waits for logging to complete
```

---

## 📊 What You Get

### Database Insights:

1. **Popular Events**
   ```sql
   SELECT "entityId", COUNT(*) as views
   FROM activity_logs
   WHERE "activityType" = 'EVENT_VIEW'
   GROUP BY "entityId"
   ORDER BY views DESC
   LIMIT 10;
   ```

2. **Search Trends**
   ```sql
   SELECT metadata->>'query' as keyword, COUNT(*) as searches
   FROM activity_logs
   WHERE "activityType" = 'SEARCH'
   GROUP BY keyword
   ORDER BY searches DESC;
   ```

3. **User Engagement**
   ```sql
   SELECT "userId", COUNT(*) as activities
   FROM activity_logs
   WHERE "createdAt" >= NOW() - INTERVAL '7 days'
   GROUP BY "userId"
   ORDER BY activities DESC;
   ```

### Activity Module API:

```bash
# Get analytics
GET /api/v1/activity/analytics

# Popular events
GET /api/v1/activity/popular?entityType=EVENT

# User behavior
GET /api/v1/activity/behavior?userId=xxx
```

---

## 🎯 Complete Flow Example

### User Journey:

```
1. User searches "concert in dhaka"
   → logSearch() → Track search query

2. User clicks on "Rock Concert" event
   → logEventView() → Track view

3. User saves event to wishlist
   → logActivity(EVENT_SAVE) → Track save

4. User shares on Facebook
   → logActivity(SHARE) → Track share with platform

5. User creates booking
   → logActivity(BOOKING_CREATE) → Track booking

6. User completes payment
   → logActivity(PAYMENT_COMPLETED) → Track revenue
```

**Each step tracked = Complete user journey mapped!**

---

## 💡 Best Practices

### ✅ DO:

```typescript
// 1. Always use .catch() for non-blocking
logActivity({...}).catch(err => console.error(err));

// 2. Extract userId early
const userId = (req as any).user?.userId;

// 3. Add meaningful metadata
metadata: {
  title: event.title,
  category: event.category,
  price: event.price,
}

// 4. Use descriptive activity names
activityName: 'Event Created'  ✅
activityName: 'Created'        ❌
```

### ❌ DON'T:

```typescript
// 1. Don't block requests unnecessarily
await logActivity({...});  // Only for critical actions

// 2. Don't log sensitive data
metadata: {
  password: '...',  ❌
  creditCard: '...' ❌
}

// 3. Don't log everything
// Only important business actions

// 4. Don't forget error handling
logActivity({...}); // ❌ No error handling
```

---

## 🔗 Integration with Routes

```typescript
// event.routes.ts
import { EventRoutes } from './event.routes';

// In your main routes file:
app.use('/api/v1/events', EventRoutes);
```

---

## 📈 Expected Results

**After 1 week:**
- 500+ event views logged
- 100+ search queries tracked
- 50+ event saves
- 20+ shares
- Complete user journey data

**Analytics you can build:**
- Trending events
- Popular searches
- Conversion funnels
- User engagement scores
- Revenue attribution

---

## 🎉 Summary

**এই Event Module টা একটা complete example:**

✅ **10টা endpoints** with full tracking:
1. getAllEvents → Search tracking
2. getEventById → View tracking
3. createEvent → Creation tracking
4. updateEvent → Edit tracking
5. deleteEvent → Deletion tracking
6. publishEvent → Publishing tracking
7. saveEvent → Wishlist tracking
8. shareEvent → Share tracking
9. getEventsByCategory → Category tracking
10. getNearbyEvents → Location tracking

✅ **Non-blocking logging** → Fast responses
✅ **Error handling** → Never breaks requests
✅ **Rich metadata** → Deep insights
✅ **Guest + Logged users** → Complete coverage
✅ **Session tracking** → Automatic from middleware

**Copy this pattern to:**
- Booking module
- Payment module
- Review module
- User module
- Any other module!

---

**Next Steps:**
1. Copy event.controller.ts pattern
2. Replace EventService with your service
3. Use appropriate ActivityType for your actions
4. Add custom metadata relevant to your business
5. Deploy and watch the insights flow! 🚀
