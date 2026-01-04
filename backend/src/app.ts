import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions, rootResponse } from "@/shared";
import { globalErrorHandler, notFound, activityLoggerMiddleware, sessionDurationTracker } from "@/app/middlewares";
import router from "@/app/routes";

// import { paymentRoutes } from "@/app/modules";

const app = express();

// web-hook api
// app.use(paymentRoutes);

// general api
app.set("json spaces", 2);
app.get("/",rootResponse);
app.use(cors({...corsOptions}));
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

// Activity tracking (automatic page view logging)
app.use(activityLoggerMiddleware);
app.use(sessionDurationTracker);

app.use("/api/v1", router);
app.use(notFound);
app.use(globalErrorHandler);

export default app;
