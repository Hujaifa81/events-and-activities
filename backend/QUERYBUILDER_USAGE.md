# QueryBuilder - Reusable Query System (Simplified Pattern)

## 📖 Overview

`QueryBuilder` একটা Mongoose-style pattern যা Prisma এর জন্য adapted করা হয়েছে। এটা সব modules এ reusable এবং খুবই simple to use।

## ✨ Key Features

- ✅ **Simple Pattern**: Mongoose QueryBuilder এর মতো clean syntax
- ✅ **Auto Filter**: Query params থেকে automatically filter apply হয়
- ✅ **Date Range**: Built-in date range support
- ✅ **Search**: Multiple fields এ search (case-insensitive)
- ✅ **Sort**: Flexible sorting (`-createdAt` or `sortBy=createdAt&sortOrder=desc`)
- ✅ **Pagination**: Auto pagination with meta
- ✅ **Chainable**: সব methods chainable

---

## 🚀 Basic Usage

### Simple Example (User Module)

```typescript
import { QueryBuilder } from '@/shared/helper';
import { prisma } from '@/shared/utils';

const getAllUsers = async (query: Record<string, any>) => {
  const userSearchableFields = ['username', 'email', 'phone'];

  const queryBuilder = new QueryBuilder(prisma.user, query);

  const usersData = queryBuilder
    .search(userSearchableFields)
    .filter()
    .sort()
    .dateRange('createdAt')
    .paginate();

  // Get data and meta together
  return await queryBuilder.execute();

  // OR get them separately:
  // const [data, meta] = await Promise.all([
  //   queryBuilder.build(),
  //   queryBuilder.getMeta()
  // ]);
  // return { data, meta };
};
```

**Query Example:**
```
GET /users?searchTerm=john&role=ADMIN&page=2&limit=20&sort=-createdAt
```

---

## 📋 Method Reference

### Constructor
```typescript
new QueryBuilder(prismaModel, queryParams)
```
- `prismaModel`: Prisma delegate (e.g., `prisma.user`, `prisma.event`)
- `queryParams`: Query object from `req.query`

### Methods

#### `.search(searchableFields: string[])`
Multiple fields এ search করে (case-insensitive, partial match)

```typescript
queryBuilder.search(['name', 'email', 'phone']);
```

**Query:** `?searchTerm=john` or `?search=john`

---

#### `.filter()`
Automatic filtering - query params থেকে filters apply করে

**Auto excludes:** `page`, `limit`, `sort`, `sortBy`, `sortOrder`, `searchTerm`, `search`, `fields`, `startDate`, `endDate`

```typescript
queryBuilder.filter();
```

**Query:** `?status=ACTIVE&role=ADMIN&isDeleted=false`

**Special:** `?status=all` → ignored (not filtered)

---

#### `.dateRange(dateField: string)`
Date range filtering with smart defaults

```typescript
queryBuilder.dateRange('createdAt');
```

**Queries:**
- `?startDate=2024-01-01&endDate=2024-12-31` → Range
- `?startDate=2024-01-01` → From start to today
- `?endDate=2024-12-31` → Up to end date
- Date only (`YYYY-MM-DD`) → Full day (00:00:00 to 23:59:59)
- DateTime → Exact timestamp

---

#### `.sort()`
Flexible sorting

```typescript
queryBuilder.sort();
```

**Queries:**
- `?sort=-createdAt` → Mongoose style (- for desc)
- `?sortBy=createdAt&sortOrder=desc` → Modern style
- No sort → Default: `createdAt desc`

---

#### `.paginate()`
Pagination (auto-applied from query params)

```typescript
queryBuilder.paginate();
```

**Query:** `?page=2&limit=20`
- Default: `page=1, limit=10`
- Max limit: `100`

---

#### `.fields()`
Select specific fields

```typescript
queryBuilder.fields();
```

**Query:** `?fields=id,name,email`

---

#### `.include(relations)`
Include Prisma relations

```typescript
queryBuilder.include({
  profile: true,
  posts: {
    select: { id: true, title: true }
  }
});
```

---

#### `.select(fields)`
Select specific fields (alternative to `.fields()`)

```typescript
queryBuilder.select({
  id: true,
  username: true,
  email: true
});
```

---

#### `.addWhere(condition)`
Add custom Prisma where condition

```typescript
queryBuilder.addWhere({
  OR: [
    { status: 'ACTIVE' },
    { status: 'PENDING' }
  ]
});
```

---

#### `.build()` → `Promise<T[]>`
Execute query and return data only

```typescript
const data = await queryBuilder.build();
```

---

#### `.getMeta()` → `Promise<Meta>`
Get pagination metadata

```typescript
const meta = await queryBuilder.getMeta();
// { page: 1, limit: 10, total: 50, totalPage: 5 }
```

---

#### `.execute()` → `Promise<{ data, meta }>`
Execute query and get both data & meta

```typescript
const result = await queryBuilder.execute();
// { data: [...], meta: { page, limit, total, totalPage } }
```

---

## 💡 Complete Examples

### 1. Event Module

```typescript
const getAllEvents = async (query: Record<string, any>) => {
  const queryBuilder = new QueryBuilder(prisma.event, query);

  const searchableFields = ['title', 'description', 'venue', 'city'];

  queryBuilder
    .search(searchableFields)
    .filter()
    .sort()
    .dateRange('startDate')
    .paginate();

  // Custom conditions
  if (!query.includeParentEvents) {
    queryBuilder.addWhere({
      OR: [
        { isRecurring: false },
        { parentEventId: { not: null } }
      ]
    });
  }

  if (query.category) {
    queryBuilder.addWhere({
      category: { slug: query.category }
    });
  }

  // Price range
  if (query.minPrice || query.maxPrice) {
    const priceCondition: any = {};
    if (query.minPrice) priceCondition.gte = Number(query.minPrice);
    if (query.maxPrice) priceCondition.lte = Number(query.maxPrice);
    queryBuilder.addWhere({ price: priceCondition });
  }

  // Include relations
  queryBuilder.include({
    host: {
      select: {
        id: true,
        username: true,
        profile: { select: { displayName: true, avatarUrl: true } }
      }
    },
    category: true,
    _count: { select: { bookings: true, reviews: true } }
  });

  return await queryBuilder.execute();
};
```

**API Call:**
```
GET /events?searchTerm=concert&category=music&city=Dhaka&minPrice=100&maxPrice=500&page=1&limit=20&sortBy=startDate&sortOrder=asc
```

---

### 2. Doctor Module (with Relations)

```typescript
const getAllDoctors = async (query: Record<string, any>) => {
  const { specialties, ...restQuery } = query;

  const queryBuilder = new QueryBuilder(prisma.doctor, restQuery);

  const searchableFields = [
    'name',
    'email',
    'contactNumber',
    'qualification',
    'designation'
  ];

  queryBuilder
    .search(searchableFields)
    .filter()
    .sort()
    .paginate();

  // Specialty filter (relation)
  if (specialties) {
    const specialtiesArray = Array.isArray(specialties) 
      ? specialties 
      : [specialties];

    queryBuilder.addWhere({
      doctorSpecialties: {
        some: {
          specialities: {
            title: {
              in: specialtiesArray,
              mode: 'insensitive'
            }
          }
        }
      }
    });
  }

  // Include relations
  queryBuilder.include({
    doctorSpecialties: {
      include: {
        specialities: { select: { title: true } }
      }
    },
    review: { select: { rating: true } }
  });

  return await queryBuilder.execute();
};
```

**API Call:**
```
GET /doctors?searchTerm=cardio&specialties=Cardiology&specialties=Neurology&page=1&sort=-averageRating
```

---

### 3. Controller Pattern

```typescript
import { Request, Response } from 'express';
import catchAsync from '@/shared/utils/catchAsync';
import sendResponse from '@/shared/utils/sendResponse';

const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  // No need for pick() - QueryBuilder handles it!
  const result = await EventService.getAllEvents(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Events retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});
```

---

## 🎯 Query Params Guide

### Supported Query Params

| Param | Purpose | Example |
|-------|---------|---------|
| `searchTerm` or `search` | Search across fields | `?searchTerm=john` |
| `page` | Page number | `?page=2` |
| `limit` | Items per page | `?limit=20` |
| `sort` | Mongoose-style sort | `?sort=-createdAt` |
| `sortBy` | Field to sort by | `?sortBy=createdAt` |
| `sortOrder` | Sort direction | `?sortOrder=desc` |
| `fields` | Select fields | `?fields=id,name,email` |
| `startDate` | Date range start | `?startDate=2024-01-01` |
| `endDate` | Date range end | `?endDate=2024-12-31` |
| Any other | Auto-filtered | `?status=ACTIVE&role=ADMIN` |

---

## 🔄 Migration from Old Pattern

### Before (❌ Old):
```typescript
const getAllUsers = async (filters: any, options: any) => {
  const { limit, page, skip } = calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: searchableFields.map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' }
      }))
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push(...Object.entries(filterData).map(([k, v]) => ({
      [k]: { equals: v }
    })));
  }

  const where = andConditions.length ? { AND: andConditions } : {};

  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: limit, orderBy: ... }),
    prisma.user.count({ where })
  ]);

  return { data, meta: { page, limit, total } };
};
```

### After (✅ New):
```typescript
const getAllUsers = async (query: Record<string, any>) => {
  const queryBuilder = new QueryBuilder(prisma.user, query);

  queryBuilder
    .search(searchableFields)
    .filter()
    .sort()
    .paginate();

  return await queryBuilder.execute();
};
```

**Lines of code:** 50+ → 10 🎉

---

## 🛠️ Pro Tips

1. **Chain everything:**
   ```typescript
   queryBuilder
     .search(fields)
     .filter()
     .sort()
     .dateRange('createdAt')
     .paginate()
     .include(relations);
   ```

2. **Use addWhere for complex conditions:**
   ```typescript
   queryBuilder.addWhere({
     OR: [
       { status: 'ACTIVE', verified: true },
       { status: 'PENDING', createdAt: { gte: lastWeek } }
     ]
   });
   ```

3. **Default sorting:**
   ```typescript
   // If no sort provided, defaults to createdAt desc
   queryBuilder.sort();
   ```

4. **Date formats:**
   ```typescript
   // Date only: YYYY-MM-DD → Full day
   ?startDate=2024-01-01 // 00:00:00 to 23:59:59
   
   // DateTime: ISO string → Exact time
   ?startDate=2024-01-01T10:30:00Z
   ```

5. **Max limit protection:**
   ```typescript
   ?limit=1000 // Auto capped at 100
   ```

---

## 📦 Setup

Already created and exported! Just import and use:

```typescript
import { QueryBuilder } from '@/shared/helper';
// or
import QueryBuilder from '@/shared/helper/QueryBuilder';
```

---

এখন সব modules এ same simple pattern use করতে পারবে! 🚀

## ✨ Benefits

- ✅ **Reusable**: প্রতিটা module এ same code repeat করা লাগবে না
- ✅ **Type-safe**: TypeScript support সহ
- ✅ **Consistent**: সব module এ same pattern
- ✅ **Flexible**: Custom conditions add করা যায়
- ✅ **Clean**: 50+ lines code → 20-30 lines
- ✅ **Maintainable**: এক জায়গায় update করলেই সব module এ apply হবে

---

## 🚀 Usage Examples

### 1. Basic Usage (Simple Filter & Pagination)

```typescript
import { QueryBuilder } from '@/shared/helper';
import { prisma } from '@/shared/utils';

const getUsers = async (filters: any, options: any) => {
  const queryBuilder = new QueryBuilder();

  queryBuilder
    .filter({ isDeleted: false, status: 'ACTIVE' })
    .paginate(options);

  const result = await queryBuilder.execute(prisma.user);

  return result;
};
```

**Result Format:**
```typescript
{
  data: [...],
  meta: {
    page: 1,
    limit: 10,
    total: 50,
    totalPages: 5
  }
}
```

---

### 2. Search Functionality

```typescript
const searchEvents = async (searchTerm: string, options: any) => {
  const queryBuilder = new QueryBuilder();

  queryBuilder
    .search(searchTerm, ['title', 'description', 'venue']) // Multiple fields
    .filter({ status: 'PUBLISHED' })
    .paginate(options);

  return await queryBuilder.execute(prisma.event);
};
```

---

### 3. Advanced Filtering (Relations)

```typescript
const getDoctors = async (filters: any, options: any) => {
  const { searchTerm, specialties, ...otherFilters } = filters;

  const queryBuilder = new QueryBuilder();

  // Search
  if (searchTerm) {
    queryBuilder.search(searchTerm, ['name', 'email', 'qualification']);
  }

  // Custom relation filter
  if (specialties) {
    const specialtiesArray = Array.isArray(specialties) ? specialties : [specialties];
    
    queryBuilder.addCondition({
      doctorSpecialties: {
        some: {
          specialities: {
            title: { in: specialtiesArray, mode: 'insensitive' }
          }
        }
      }
    });
  }

  // Other filters
  queryBuilder
    .filter({ ...otherFilters, isDeleted: false })
    .paginate(options)
    .include({
      doctorSpecialties: {
        include: {
          specialities: { select: { title: true } }
        }
      },
      review: true
    });

  return await queryBuilder.execute(prisma.doctor);
};
```

---

### 4. Custom Conditions (OR, AND, Complex)

```typescript
const getEvents = async (filters: any) => {
  const queryBuilder = new QueryBuilder();

  // Base filters
  queryBuilder.filter({
    status: 'PUBLISHED',
    deletedAt: null
  });

  // Complex OR condition
  if (filters.search) {
    queryBuilder.addCondition({
      OR: [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } }
      ]
    });
  }

  // Category relation
  if (filters.category) {
    queryBuilder.addCondition({
      category: { slug: filters.category }
    });
  }

  // Price range
  if (filters.minPrice || filters.maxPrice) {
    const priceCondition: any = {};
    if (filters.minPrice) priceCondition.gte = Number(filters.minPrice);
    if (filters.maxPrice) priceCondition.lte = Number(filters.maxPrice);
    
    queryBuilder.addCondition({ price: priceCondition });
  }

  queryBuilder.paginate(filters);

  return await queryBuilder.execute(prisma.event);
};
```

---

### 5. Sorting (Simple & Nested)

```typescript
// Simple sorting
const options = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

queryBuilder.paginate(options);

// Nested sorting (e.g., 'user.name')
const options2 = {
  sortBy: 'profile.displayName',
  sortOrder: 'asc'
};
```

---

### 6. Select Specific Fields

```typescript
const getUsers = async () => {
  const queryBuilder = new QueryBuilder();

  queryBuilder
    .filter({ isDeleted: false })
    .select({
      id: true,
      username: true,
      email: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true
        }
      }
    });

  return await queryBuilder.execute(prisma.user);
};
```

---

### 7. Complete Example (Event Module)

```typescript
const getAllEvents = async (filters: EventFilters) => {
  const {
    search,
    category,
    city,
    type,
    isFree,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    includeParentEvents = false,
    page = 1,
    limit = 10,
    sortBy = 'startDate',
    sortOrder = 'asc',
  } = filters;

  const queryBuilder = new QueryBuilder();

  // Base conditions
  queryBuilder.filter({
    status: 'PUBLISHED',
    deletedAt: null,
  });

  // Hide parent events (customer view)
  if (!includeParentEvents) {
    queryBuilder.addCondition({
      OR: [
        { isRecurring: false },
        { parentEventId: { not: null } }
      ]
    });
  }

  // Search
  if (search) {
    queryBuilder.addCondition({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ]
    });
  }

  // Category filter
  if (category) {
    queryBuilder.addCondition({
      category: { slug: category }
    });
  }

  // Location
  if (city) {
    queryBuilder.addCondition({
      city: { contains: city, mode: 'insensitive' }
    });
  }

  // Type, isFree
  if (type) queryBuilder.filter({ type });
  if (isFree !== undefined) queryBuilder.filter({ isFree: Boolean(isFree) });

  // Price range
  if (minPrice || maxPrice) {
    const priceCondition: any = {};
    if (minPrice) priceCondition.gte = Number(minPrice);
    if (maxPrice) priceCondition.lte = Number(maxPrice);
    queryBuilder.addCondition({ price: priceCondition });
  }

  // Date range
  if (startDate || endDate) {
    const dateCondition: any = {};
    if (startDate) dateCondition.gte = new Date(startDate);
    if (endDate) dateCondition.lte = new Date(endDate);
    queryBuilder.addCondition({ startDate: dateCondition });
  }

  // Pagination, sorting, relations
  queryBuilder
    .paginate({ page, limit, sortBy, sortOrder })
    .include({
      host: {
        select: {
          id: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } }
        }
      },
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { bookings: true, reviews: true } }
    });

  return await queryBuilder.execute(prisma.event);
};
```

---

## 📋 Controller Example

```typescript
import { pick } from '@/shared/utils';

const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  // Define filterable fields
  const filterableFields = [
    'search',
    'category',
    'city',
    'type',
    'isFree',
    'minPrice',
    'maxPrice',
    'startDate',
    'endDate',
    'includeParentEvents'
  ];

  // Pick filters and options
  const filters = pick(req.query, filterableFields);
  const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);

  // Merge filters and options
  const result = await EventService.getAllEvents({ ...filters, ...options });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Events retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});
```

---

## 🎯 Method Reference

### `search(searchTerm, searchableFields)`
Multiple fields এ search করে (case-insensitive)

### `filter(filters)`
Exact match filters apply করে

### `addCondition(condition)`
Custom Prisma condition add করে (OR, AND, relations)

### `paginate(options)`
Pagination এবং sorting apply করে

### `select(fields)`
Specific fields select করে

### `include(relations)`
Relations include করে

### `execute(model)`
Query execute করে এবং result + meta return করে

### `executeWithoutMeta(model)`
শুধু data return করে (meta ছাড়া)

---

## 🔄 Migration Guide

### Before (❌ Old Way):
```typescript
const getAllDoctors = async (filters: any, options: any) => {
  const { limit, page, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.DoctorWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: searchableFields.map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' }
      }))
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push(...Object.entries(filterData).map(([key, value]) => ({
      [key]: { equals: value }
    })));
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [data, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      skip,
      take: limit,
      orderBy: options.sortBy ? { [options.sortBy]: options.sortOrder } : undefined
    }),
    prisma.doctor.count({ where })
  ]);

  return {
    data,
    meta: { page, limit, total }
  };
};
```

### After (✅ New Way):
```typescript
const getAllDoctors = async (filters: any, options: any) => {
  const { searchTerm, ...filterData } = filters;

  const queryBuilder = new QueryBuilder();

  if (searchTerm) {
    queryBuilder.search(searchTerm, searchableFields);
  }

  queryBuilder
    .filter(filterData)
    .paginate(options);

  return await queryBuilder.execute(prisma.doctor);
};
```

**Code Reduction:** 50+ lines → 15 lines ✨

---

## 🛠️ Tips

1. **Always filter deleted records:**
   ```typescript
   queryBuilder.filter({ isDeleted: false });
   ```

2. **Chain methods for cleaner code:**
   ```typescript
   queryBuilder
     .search(search, fields)
     .filter(filters)
     .paginate(options)
     .include(relations);
   ```

3. **Use addCondition for complex queries:**
   ```typescript
   queryBuilder.addCondition({
     OR: [
       { status: 'ACTIVE' },
       { status: 'PENDING' }
     ]
   });
   ```

4. **Handle array filters:**
   ```typescript
   if (Array.isArray(tags)) {
     queryBuilder.filter({ tags: { in: tags } });
   }
   ```

---

## 📦 Complete Setup

1. **Install:** Already created in `src/shared/helper/QueryBuilder.ts`

2. **Import:**
   ```typescript
   import { QueryBuilder } from '@/shared/helper';
   ```

3. **Use in any service:**
   ```typescript
   const result = await new QueryBuilder()
     .search(searchTerm, fields)
     .filter(filters)
     .paginate(options)
     .execute(prisma.yourModel);
   ```

4. **Return in controller:**
   ```typescript
   sendResponse(res, {
     statusCode: 200,
     success: true,
     message: 'Data retrieved',
     meta: result.meta,
     data: result.data
   });
   ```

---

এখন সব modules এ (Doctor, Admin, Event, User, etc.) same pattern ব্যবহার করতে পারবে! 🎉
