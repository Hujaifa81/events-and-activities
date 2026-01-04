import { cleanEnv, str, num } from "envalid";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const env = cleanEnv(process.env, {
  NODE_ENV: str({ default: "development" }),
  PORT: num({ default: 5000 }),
  DATABASE_URL: str(),

  REDIS_HOST: str({ default: "localhost" }),
  REDIS_PORT: num({ default: 6379 }),
  REDIS_PASSWORD: str({ default: "" }),

  WHITE_LIST_ORIGIN: str(),

  CLOUDINARY_API_SECRET: str(),
  CLOUDINARY_CLOUD_NAME: str(),
  CLOUDINARY_API_KEY: str(),

  OPENROUTER_API_KEY: str(),

  STRIPE_SECRET_KEY: str(),
  STRIPE_WH_SECRET_KEY: str(),

  EMAIL: str(),
  APP_PASS: str(),

  JWT_SECRET: str(),
  EXPIRES_IN: str(),
  REFRESH_TOKEN_SECRET: str(),
  REFRESH_TOKEN_EXPIRES_IN: str(),
  RESET_PASS_TOKEN: str(),
  RESET_PASS_TOKEN_EXPIRES_IN: str(),

  SALT_ROUND: num({ default: 10 }),
  RESET_PASS_LINK: str(),
});

export const envVars = {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  DATABASE_URL: env.DATABASE_URL,
  WHITE_LIST_ORIGIN: env.WHITE_LIST_ORIGIN,
  CLOUDINARY: {
    API_SECRET: env.CLOUDINARY_API_SECRET,
    CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
    API_KEY: env.CLOUDINARY_API_KEY,
  },
  OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
  STRIPE: {
    SECRET_KEY: env.STRIPE_SECRET_KEY,
    WEB_HOOK_SECRET: env.STRIPE_WH_SECRET_KEY,
  },
  EMAIL_SENDER: {
    EMAIL: env.EMAIL,
    APP_PASS: env.APP_PASS,
  },
  JWT: {
    JWT_SECRET: env.JWT_SECRET,
    EXPIRES_IN: env.EXPIRES_IN,
    REFRESH_TOKEN_SECRET: env.REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRES_IN: env.REFRESH_TOKEN_EXPIRES_IN,
    RESET_PASS_SECRET: env.RESET_PASS_TOKEN,
    RESET_PASS_TOKEN_EXPIRES_IN: env.RESET_PASS_TOKEN_EXPIRES_IN,
  },
  SALT_ROUND: env.SALT_ROUND,
  RESET_PASS_LINK: env.RESET_PASS_LINK,
  REDIS: {
    HOST: env.REDIS_HOST,
    PORT: env.REDIS_PORT,
    PASSWORD: env.REDIS_PASSWORD,
  },
};



