# Database Schema Visualization

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    %% ============================================
    %% CORE USER & AUTH
    %% ============================================
    
    User ||--o| Profile : has
    User ||--o{ Verification : has
    User ||--o{ RefreshToken : has
    User ||--o{ LoginHistory : has
    User ||--o| Subscription : has
    User ||--o| NotificationPreference : has
    User ||--o| TrustScore : has
    
    User {
        string id PK
        string email UK
        string username UK
        string password
        enum role
        enum status
        boolean emailVerified
        boolean isVerified
        datetime createdAt
        datetime deletedAt
    }
    
    Profile {
        string id PK
        string userId FK
        string firstName
        string lastName
        string bio
        string avatarUrl
        string city
        string country
        int eventsAttended
        int eventsHosted
        float totalRating
    }
    
    %% ============================================
    %% EVENTS
    %% ============================================
    
    User ||--o{ Event : hosts
    EventCategory ||--o{ Event : contains
    Event ||--o{ Booking : has
    Event ||--o{ EventParticipant : has
    Event ||--o{ Review : receives
    Event ||--o{ SavedEvent : saved-by
    
    Event {
        string id PK
        string title
        string hostId FK
        string categoryId FK
        enum type
        enum status
        datetime startDate
        datetime endDate
        string city
        float price
        int maxParticipants
        int currentParticipants
        datetime createdAt
    }
    
    EventCategory {
        string id PK
        string name UK
        string slug UK
        string icon
        string color
    }
    
    Booking {
        string id PK
        string bookingNumber UK
        string userId FK
        string eventId FK
        enum status
        float totalAmount
        enum paymentStatus
        boolean attended
        datetime createdAt
    }
    
    %% ============================================
    %% PAYMENTS
    %% ============================================
    
    User ||--o{ Payment : makes
    Payment ||--o{ Transaction : generates
    Payment ||--o{ Refund : has
    Booking ||--o| Payment : requires
    
    Payment {
        string id PK
        string userId FK
        string eventId FK
        float amount
        enum status
        enum method
        string gateway
        datetime paidAt
    }
    
    Transaction {
        string id PK
        string userId FK
        string paymentId FK
        enum type
        float amount
        datetime createdAt
    }
    
    Subscription {
        string id PK
        string userId FK
        enum plan
        enum status
        float amount
        datetime currentPeriodStart
        datetime currentPeriodEnd
    }
    
    %% ============================================
    %% SOCIAL
    %% ============================================
    
    User ||--o{ Friendship : "sends/receives"
    User ||--o{ Follow : "follows/followed-by"
    User ||--o{ Message : "sends/receives"
    Chat ||--o{ Message : contains
    Chat ||--o{ ChatParticipant : has
    User ||--o{ ChatParticipant : participates
    
    Friendship {
        string id PK
        string requestorId FK
        string receiverId FK
        enum status
        datetime createdAt
    }
    
    Follow {
        string id PK
        string followerId FK
        string followingId FK
        datetime createdAt
    }
    
    Chat {
        string id PK
        enum type
        string eventId FK
        datetime lastMessageAt
    }
    
    Message {
        string id PK
        string chatId FK
        string senderId FK
        string content
        enum status
        datetime createdAt
    }
    
    %% ============================================
    %% REVIEWS & RATINGS
    %% ============================================
    
    User ||--o{ Review : writes
    User ||--o{ Review : receives
    Event ||--o{ Review : has
    Review ||--o{ CategoryRating : has
    
    Review {
        string id PK
        string authorId FK
        string targetUserId FK
        string eventId FK
        float overallRating
        string comment
        boolean isVerifiedAttendee
        datetime createdAt
    }
    
    CategoryRating {
        string id PK
        string reviewId FK
        enum category
        float rating
    }
    
    %% ============================================
    %% NOTIFICATIONS
    %% ============================================
    
    User ||--o{ Notification : receives
    
    Notification {
        string id PK
        string userId FK
        enum type
        string title
        string message
        boolean isRead
        datetime createdAt
    }
    
    %% ============================================
    %% GAMIFICATION
    %% ============================================
    
    Badge ||--o{ UserBadge : awarded-to
    User ||--o{ UserBadge : earns
    Achievement ||--o{ UserAchievement : tracked-by
    User ||--o{ UserAchievement : achieves
    User ||--o{ UserPoint : earns
    
    Badge {
        string id PK
        string name UK
        string slug UK
        enum type
        enum rarity
        int pointsReward
    }
    
    UserBadge {
        string id PK
        string userId FK
        string badgeId FK
        datetime earnedAt
    }
    
    Achievement {
        string id PK
        string name UK
        string category
        int totalSteps
        int pointsReward
    }
    
    UserPoint {
        string id PK
        string userId FK
        int points
        string reason
        datetime createdAt
    }
    
    %% ============================================
    %% SAFETY & MODERATION
    %% ============================================
    
    User ||--o{ Report : "creates/receives"
    User ||--o{ Block : "blocks/blocked-by"
    
    Report {
        string id PK
        string reporterId FK
        string targetUserId FK
        enum type
        enum status
        string reason
        datetime createdAt
    }
    
    Block {
        string id PK
        string blockerId FK
        string blockedId FK
        datetime createdAt
    }
    
    TrustScore {
        string id PK
        string userId FK
        float score
        enum level
        enum riskLevel
        datetime lastCalculatedAt
    }
    
    %% ============================================
    %% ADMIN & AUDIT
    %% ============================================
    
    User ||--o{ AuditLog : performs
    User ||--o{ ActivityLog : generates
    
    AuditLog {
        string id PK
        string userId FK
        enum action
        enum entityType
        string entityId
        json changes
        datetime createdAt
    }
    
    ActivityLog {
        string id PK
        string userId FK
        string activityType
        string sessionId
        datetime createdAt
    }
```

## Simplified Architecture View

```mermaid
graph TB
    subgraph "User Layer"
        U[Users]
        P[Profiles]
        V[Verifications]
    end
    
    subgraph "Event Layer"
        E[Events]
        EC[Categories]
        B[Bookings]
        EP[Participants]
    end
    
    subgraph "Payment Layer"
        PAY[Payments]
        T[Transactions]
        R[Refunds]
        S[Subscriptions]
    end
    
    subgraph "Social Layer"
        F[Friendships]
        FO[Follows]
        M[Messages]
        C[Chats]
    end
    
    subgraph "Engagement Layer"
        REV[Reviews]
        N[Notifications]
        G[Gamification]
    end
    
    subgraph "Safety Layer"
        REP[Reports]
        BL[Blocks]
        TS[Trust Scores]
    end
    
    subgraph "Admin Layer"
        AL[Audit Logs]
        SYS[System Settings]
        ST[Support Tickets]
    end
    
    U --> E
    U --> B
    E --> PAY
    B --> PAY
    E --> REV
    U --> F
    U --> FO
    U --> M
    U --> N
    U --> G
    U --> REP
    U --> TS
    U --> AL
```

## Data Flow Diagrams

### Event Booking Flow

```mermaid
sequenceDiagram
    participant User
    participant Event
    participant Booking
    participant Payment
    participant Notification
    
    User->>Event: Browse & Select Event
    Event->>Booking: Create Booking
    Booking->>Payment: Initiate Payment
    Payment-->>Booking: Payment Successful
    Booking->>Event: Update Participant Count
    Booking->>Notification: Send Confirmation
    Notification-->>User: Email + Push Notification
```

### Review & Rating Flow

```mermaid
sequenceDiagram
    participant User
    participant Event
    participant Booking
    participant Review
    participant RatingSummary
    participant TrustScore
    
    Event->>Event: Event Completed
    Booking->>User: Request Review (attended users)
    User->>Review: Submit Review + Rating
    Review->>RatingSummary: Update Host Rating
    RatingSummary->>TrustScore: Update Trust Score
    TrustScore-->>User: Updated Trust Level
```

### Trust Score Calculation

```mermaid
graph LR
    V[Verifications] --> TS[Trust Score]
    R[Reviews] --> TS
    E[Events Attended] --> TS
    REP[Reports Against] --> TS
    B[Behavior Score] --> TS
    A[Account Age] --> TS
    
    TS --> TL[Trust Level]
    TL --> AC[Access Control]
    TL --> VI[Visibility]
    TL --> FE[Features]
```

## Key Relationships Summary

### One-to-One (1:1)
- User ↔ Profile
- User ↔ Subscription
- User ↔ TrustScore
- User ↔ NotificationPreference
- Booking ↔ Payment

### One-to-Many (1:N)
- User → Events (hosted)
- User → Bookings
- User → Reviews (given)
- User → Notifications
- Event → Bookings
- Event → Reviews
- Chat → Messages

### Many-to-Many (N:M)
- User ↔ User (Friendships via Friendship table)
- User ↔ User (Following via Follow table)
- User ↔ Event (Participation via EventParticipant)
- User ↔ Chat (via ChatParticipant)
- User ↔ Badge (via UserBadge)

## Index Strategy Visualization

```mermaid
graph TD
    subgraph "Primary Indexes"
        PK1[User.id]
        PK2[Event.id]
        PK3[Booking.id]
        PK4[Payment.id]
    end
    
    subgraph "Unique Indexes"
        UK1[User.email]
        UK2[User.username]
        UK3[Event.slug]
        UK4[Booking.bookingNumber]
    end
    
    subgraph "Foreign Key Indexes"
        FK1[Event.hostId]
        FK2[Booking.userId]
        FK3[Booking.eventId]
        FK4[Review.eventId]
    end
    
    subgraph "Composite Indexes"
        CI1[Event.city + country]
        CI2[Event.lat + lng]
        CI3[User.status + role]
    end
    
    subgraph "Full-text Indexes"
        FT1[Event.title + description]
        FT2[Profile.firstName + lastName]
        FT3[Review.comment]
    end
```

## Scaling Considerations

```mermaid
graph TB
    subgraph "Hot Tables - High Write/Read"
        HT1[events]
        HT2[bookings]
        HT3[notifications]
        HT4[messages]
        HT5[activity_logs]
    end
    
    subgraph "Warm Tables - Medium Activity"
        WT1[reviews]
        WT2[payments]
        WT3[users]
        WT4[posts]
    end
    
    subgraph "Cold Tables - Low Activity"
        CT1[badges]
        CT2[system_settings]
        CT3[email_templates]
        CT4[faq]
    end
    
    HT1 --> Cache[Redis Cache]
    HT2 --> Cache
    HT3 --> Queue[Message Queue]
    HT4 --> Queue
    HT5 --> Archive[Archive DB]
    
    Cache --> API[API Layer]
    Queue --> API
    
    WT1 --> ReadReplica[Read Replica]
    WT2 --> ReadReplica
    WT3 --> ReadReplica
```

---

**Note:** These diagrams provide a visual overview. Refer to [Schema README](./README.md) for detailed documentation.
