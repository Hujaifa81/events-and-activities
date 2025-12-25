import config from "@/config";
import { CorsOptions } from "cors";

const whitelist = [...config.WHITE_LIST_ORIGIN.split(",")];

export const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (error: Error | null, isValid?: boolean) => void
  ) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
