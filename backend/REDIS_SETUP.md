# Redis Setup for ask2buy Backend

## Development Setup

### 1. Install Redis (Windows)

**Option A: Using WSL2 (Recommended)**
```bash
# Install WSL2 if not already installed
wsl --install

# Inside WSL2
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# Test connection
redis-cli ping  # Should return: PONG
```

**Option B: Using Docker**
```bash
# Pull Redis image
docker pull redis:latest

# Run Redis container
docker run -d -p 6379:6379 --name ask2buy-redis redis:latest

# Test connection
docker exec -it ask2buy-redis redis-cli ping  # Should return: PONG
```

**Option C: Windows Native (Using Memurai)**
Download from: https://www.memurai.com/get-memurai
- Free for development
- Drop-in Redis replacement for Windows

### 2. Verify Redis Connection

```bash
# Test Redis CLI
redis-cli

# Inside redis-cli
127.0.0.1:6379> ping
PONG
127.0.0.1:6379> set test "Hello Redis"
OK
127.0.0.1:6379> get test
"Hello Redis"
127.0.0.1:6379> exit
```

### 3. Environment Variables

Already configured in `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 4. Start Development Server

```bash
npm run dev
```

You should see:
```
✅ Redis connected successfully
✅ DB connected
Server is listening on port:5000
```

---

## Production Setup

### AWS ElastiCache (Recommended)

1. **Create ElastiCache Cluster**
   ```bash
   # Via AWS Console or CLI
   aws elasticache create-cache-cluster \
     --cache-cluster-id ask2buy-redis \
     --engine redis \
     --cache-node-type cache.t3.micro \
     --num-cache-nodes 1
   ```

2. **Update Environment Variables**
   ```env
   REDIS_HOST=ask2buy-redis.abc123.cache.amazonaws.com
   REDIS_PORT=6379
   REDIS_PASSWORD=your-secure-password
   ```

### Redis Cloud (Alternative)

1. Sign up at: https://redis.com/try-free/
2. Create a database
3. Copy connection details:
   ```env
   REDIS_HOST=redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com
   REDIS_PORT=12345
   REDIS_PASSWORD=your-redis-cloud-password
   ```

### DigitalOcean Managed Redis

1. Create Managed Redis cluster
2. Update `.env`:
   ```env
   REDIS_HOST=your-redis-cluster.db.ondigitalocean.com
   REDIS_PORT=25061
   REDIS_PASSWORD=your-secure-password
   ```

---

## Testing Rate Limiting

### Test Activity Tracker

```typescript
// Make authenticated requests
// First request - updates lastActiveAt
GET /api/users/profile
Authorization: Bearer <token>

// Within 5 minutes - skips update (rate limited)
GET /api/users/profile
Authorization: Bearer <token>

// After 5 minutes - updates again
GET /api/users/profile
Authorization: Bearer <token>
```

### Monitor Redis

```bash
# Check active connections
redis-cli CLIENT LIST

# Monitor commands in real-time
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# View rate limiter keys
redis-cli KEYS "activity:*"

# Check specific user's rate limit
redis-cli TTL "activity:user-id-here"
```

---

## Troubleshooting

### Redis Connection Failed

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solutions:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis (WSL2)
sudo service redis-server start

# Start Redis (Docker)
docker start ask2buy-redis

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log  # WSL2
docker logs ask2buy-redis  # Docker
```

### Rate Limiter Not Working

**Check Redis keys:**
```bash
redis-cli KEYS "*"
# Should show: activity:user-id, api:user-id, etc.
```

**Check TTL:**
```bash
redis-cli TTL "activity:your-user-id"
# Should return seconds remaining (0-300)
```

### Performance Issues

**Monitor slow queries:**
```bash
redis-cli SLOWLOG GET 10
```

**Check memory:**
```bash
redis-cli INFO memory
```

---

## Configuration Options

### Change Rate Limit Duration

Edit `src/config/redis.ts`:
```typescript
export const activityRateLimiter = new RateLimiterRedis({
  points: 1,
  duration: 600, // Change to 10 minutes (600 seconds)
});
```

### Add New Rate Limiters

```typescript
// Email Rate Limiter
export const emailRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'email',
  points: 3, // 3 emails
  duration: 3600, // Per hour
});
```

---

## Benefits of This Setup

✅ **Production-Ready** - Battle-tested by major companies
✅ **Distributed** - Works across multiple servers
✅ **Scalable** - Handles millions of requests
✅ **Persistent** - Data survives server restarts
✅ **Monitoring** - Easy to monitor and debug
✅ **Flexible** - Can add more rate limiters easily

---

## Next Steps

1. ✅ Install Redis locally
2. ✅ Test connection (`redis-cli ping`)
3. ✅ Start backend server
4. ✅ Run database migration (`npm run db:migrate`)
5. ✅ Test authentication endpoints
6. ✅ Monitor Redis (`redis-cli MONITOR`)

---

## Resources

- Redis Documentation: https://redis.io/docs/
- ioredis GitHub: https://github.com/redis/ioredis
- rate-limiter-flexible: https://github.com/animir/node-rate-limiter-flexible
- AWS ElastiCache: https://aws.amazon.com/elasticache/
- Redis Cloud: https://redis.com/
