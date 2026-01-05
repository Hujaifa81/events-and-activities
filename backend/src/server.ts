/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServer, Server } from 'http';
import app from './app';
import { prisma } from '@/shared'
import { envVars, redis, closeRedis } from '@/config';
import { initializeCronJobs } from './app/cron';


async function connectToDB() {
  try {
    await prisma.$connect();
    console.log('DB connected');
  } catch (err: any) {
    console.log('DB connection Err:', err);
  }
}

class ServerCreator {
  protected server: Server;

  constructor() {
    this.server = createServer(app);

    this.server.on('error', (err) => {
      console.error('Server error:', err);
      this.cleanupAndExit(1);
    });
  }

  init = async () => {
    return new Promise<void>((resolve) => {
      this.server.listen(5000, async () => {
        await connectToDB();
        
        // Wait for Redis connection
        await new Promise((res) => {
          if (redis.status === 'ready') {
            res(true);
          } else {
            redis.once('ready', () => res(true));
          }
        });
        
        // Initialize all cron jobs
        initializeCronJobs();
        
        console.log(`Server is listening on port:${envVars.PORT}`);
        resolve();
      });
    });
  };

  shutdown = async () => {
    try {
      if (this.server.listening) {
        await new Promise<void>((resolve, reject) => {
          this.server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('Server has been closed');
      }
      
      // Close Redis connection
      await closeRedis();
      
      // Close Prisma connection
      await prisma.$disconnect();
      console.log('All connections closed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      this.cleanupAndExit(1);
    } finally {
      process.exit(0);
    }
  };

  private cleanupAndExit = async (code: number) => {
    try {
      if (this.server.listening) {
        await new Promise<void>((resolve) =>
          this.server.close(() => resolve())
        );
      }
    } finally {
      process.exit(code);
    }
  };
}

export default ServerCreator;


