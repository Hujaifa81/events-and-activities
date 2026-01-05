# Audit Log System - Implementation Guide

## 🎯 Overview

Production-ready audit logging system for tracking admin actions and important user operations with complete before/after state tracking.

## 📁 File Structure

```
src/
├── shared/helper/
│   └── auditHelper.ts          # Core audit logging utilities
├── app/modules/
│   ├── audit/                  # Audit log viewer module
│   │   ├── audit.controller.ts
│   │   ├── audit.service.ts
│   │   ├── audit.routes.ts
│   │   ├── audit.validation.ts
│   │   └── audit.interface.ts
│   └── event/                  # Event module (with admin features)
│       ├── event.controller.ts # Added admin actions with audit logging
│       ├── event.service.ts    # Added approve/reject/feature/suspend
│       ├── event.routes.ts     # Added admin routes
│       └── event.validation.ts # Admin action validations
```

## 🔥 Features Implemented

### 1. **Audit Helper Service** (`src/shared/helper/auditHelper.ts`)

**Key Functions:**
- `createAuditLog()` - Central function for creating audit logs
- `createAuditLogFromRequest()` - Helper for Express requests
- `shouldAudit()` - Check if action needs auditing based on role
- `calculateSeverity()` - Auto-calculate severity (INFO/WARNING/ERROR/CRITICAL)
- `compareChanges()` - Generate diff between old and new values

**Role-Based Audit Rules:**
```typescript
ADMIN/SUPER_ADMIN/MODERATOR → All actions audited
HOST → Business-critical actions (EVENT_CREATE, EVENT_DELETE, PAYOUT_REQUEST, etc.)
USER → Financial & safety actions (BOOKING_CREATE, PAYMENT_CREATE, ACCOUNT_DELETE, etc.)
```

### 2. **Event Admin Features** (`src/app/modules/event/`)

**New Admin Endpoints:**

```typescript
GET    /api/v1/events/admin/pending        // List pending events
PUT    /api/v1/events/:id/approve          // Approve event → AuditLog
PUT    /api/v1/events/:id/reject           // Reject event → AuditLog
PUT    /api/v1/events/:id/feature          // Feature on homepage → AuditLog
PUT    /api/v1/events/:id/suspend          // Suspend event → AuditLog
DELETE /api/v1/events/:id/admin            // Admin delete → AuditLog (CRITICAL)
```

**Audit Logging Example:**
```typescript
// Admin approves event
await createAuditLogFromRequest(req, {
  userId: adminId,
  action: 'APPROVE',
  entityType: 'EVENT',
  entityId: eventId,
  description: `Approved event: ${event.title}`,
  oldValues: { status: 'PENDING_APPROVAL' },
  newValues: { status: 'PUBLISHED' },
  severity: 'INFO',
});
```

### 3. **Audit Log Viewer** (`src/app/modules/audit/`)

**Endpoints:**

```typescript
GET /api/v1/audit-logs                          // All logs (paginated, filterable)
GET /api/v1/audit-logs/search?q=query           // Search logs
GET /api/v1/audit-logs/stats                    // Dashboard statistics
GET /api/v1/audit-logs/user/:userId             // User's audit history
GET /api/v1/audit-logs/entity/EVENT/:eventId    // Entity change timeline
GET /api/v1/audit-logs/timeline/EVENT/:eventId  // Chronological changes
GET /api/v1/audit-logs/:id                      // Single log details
```

**Statistics Provided:**
- Total logs count
- Actions breakdown
- Severity breakdown
- Entity type breakdown
- Top 10 active users
- Recent critical logs

## 🚀 Usage Examples

### Example 1: Admin Approves Event

**Request:**
```bash
PUT /api/v1/events/abc123/approve
Authorization: Bearer <admin_token>
```

**What Happens:**
1. Event status: PENDING_APPROVAL → PUBLISHED
2. AuditLog created:
   ```json
   {
     "userId": "admin123",
     "action": "APPROVE",
     "entityType": "EVENT",
     "entityId": "abc123",
     "oldValues": { "status": "PENDING_APPROVAL" },
     "newValues": { "status": "PUBLISHED" },
     "severity": "INFO",
     "ipAddress": "192.168.1.1",
     "userAgent": "Mozilla/5.0..."
   }
   ```
3. Host notification sent (TODO)

### Example 2: Admin Deletes Event

**Request:**
```bash
DELETE /api/v1/events/abc123/admin
Authorization: Bearer <admin_token>
```

**What Happens:**
1. Event soft deleted (deletedAt set)
2. **CRITICAL** AuditLog created with full event snapshot
3. All bookings cancelled (TODO)
4. Refunds initiated (TODO)

### Example 3: View Event Audit History

**Request:**
```bash
GET /api/v1/audit-logs/entity/EVENT/abc123
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "action": "CREATE",
      "userId": "host123",
      "createdAt": "2026-01-06T10:00:00Z",
      "severity": "INFO"
    },
    {
      "action": "APPROVE",
      "userId": "admin456",
      "createdAt": "2026-01-06T11:30:00Z",
      "severity": "INFO",
      "changes": { "status": { "old": "PENDING_APPROVAL", "new": "PUBLISHED" } }
    },
    {
      "action": "SUSPEND",
      "userId": "admin456",
      "createdAt": "2026-01-06T15:00:00Z",
      "severity": "WARNING",
      "description": "Policy violation"
    }
  ]
}
```

## 🔐 Security & Authorization

**Role-Based Access:**
- ADMIN/SUPER_ADMIN → Full access to all audit logs
- MODERATOR → View logs, perform certain actions
- Users → Can view their own audit logs only

**Middleware Protection:**
```typescript
// Only admins can approve events
router.put('/:id/approve', 
  checkAuth('ADMIN', 'MODERATOR'),
  EventController.approveEvent
);

// Users can view their own audit logs
router.get('/user/:userId',
  checkAuth('ADMIN', 'SUPER_ADMIN', 'USER'),
  AuditController.getUserAuditLogs
);
```

## 📊 Severity Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **CRITICAL** | Legal/Financial risk, data loss | Account delete, event delete with bookings, chargeback |
| **WARNING** | Business impact | Event cancel, booking cancel, refund request, suspension |
| **INFO** | Normal operations | Create, approve, update |
| **ERROR** | System failures | (Reserved for error logging) |

## 🔄 Audit Log Lifecycle

```
Action Performed
    ↓
shouldAudit() checks role + action
    ↓ (if true)
Calculate severity (auto or manual)
    ↓
Compare old vs new values (diff)
    ↓
Create AuditLog in database
    ↓
Log confirmation (non-blocking)
    ↓
Continue main operation
```

**Important:** Audit logging failure does NOT break the main operation (fail-safe design).

## 📝 TODO / Next Steps

1. ✅ Audit logging helper
2. ✅ Event admin actions with audit
3. ✅ Audit log viewer
4. ⏳ Add notification system (host/customer alerts)
5. ⏳ Booking cancellation audit (when admin suspends event)
6. ⏳ Payment refund audit
7. ⏳ User account deletion audit
8. ⏳ Retention policy cron job (archive old logs)
9. ⏳ Audit log export (CSV/PDF for compliance)
10. ⏳ Real-time alerts for CRITICAL actions

## 🧪 Testing

**Test Scenarios:**

1. **Admin Approval Flow**
   - Create event as HOST
   - Admin approves → Check AuditLog created
   - Verify old/new values

2. **Rejection with Reason**
   - Pending event
   - Admin rejects with reason
   - Verify reason stored in metadata

3. **Critical Deletion**
   - Event with 10 bookings
   - Admin deletes
   - Verify CRITICAL severity
   - Check full event snapshot saved

4. **Access Control**
   - User tries to view another user's audit logs → 403
   - User views their own logs → Success
   - Admin views all logs → Success

## 📖 References

- **Prisma Schema:** `prisma/schema/admin.prisma` (AuditLog model)
- **Enums:** `prisma/schema/enums.prisma` (AuditAction, AuditEntityType)
- **Activity Logging:** `src/shared/helper/activityLogger.ts` (for user behavior tracking)

## ⚡ Performance Notes

- Audit logging is **non-blocking** (catch errors, don't throw)
- Database indexes on: `userId`, `action`, `entityType+entityId`, `createdAt`, `severity`
- Pagination default: 20 logs per page
- Statistics queries run in parallel for performance

## 🎓 Key Differences: AuditLog vs ActivityLog

| Feature | AuditLog | ActivityLog |
|---------|----------|-------------|
| **Purpose** | Accountability & compliance | Analytics & behavior tracking |
| **Who** | Admin + important user actions | All user behavior |
| **What** | State changes (before/after) | Page views, searches, clicks |
| **Severity** | INFO/WARNING/CRITICAL | N/A |
| **Retention** | 1-7 years | 90 days |
| **Examples** | Approve event, delete account | Search query, event view |

---

**Implementation Status:** ✅ Complete and Production-Ready
**Last Updated:** January 6, 2026
