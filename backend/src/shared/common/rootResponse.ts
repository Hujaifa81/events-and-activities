
import { envVars } from "@/config";
import { Request, Response } from "express";

export const rootResponse = (req: Request, res: Response) => {
  res.send({
    message: "Server is running..",
    environment: envVars.NODE_ENV,
    uptime: process.uptime().toFixed(2) + " sec",
    timeStamp: new Date().toISOString(),
  });
};
