import { Router } from "express";
import * as modules from "@/app/modules";

const moduleRoutes: { path: string; route: Router }[] = [
    {
        path: '/user',
        route: modules.userRoutes
    },
    {
        path: '/activity',
        route: modules.ActivityRoutes
    },
    {
        path: '/events',
        route: modules.EventRoutes
    },
    {
        path: '/audit-logs',
        route: modules.AuditRoutes
    }
];

const router=moduleRoutes.reduce(
  (router, { path, route }) => router.use(path, route),
  Router()
);
export default router
