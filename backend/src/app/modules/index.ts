// Module Routes
import { PermissionRoutes } from './permission/permission.routes';
import { StatsRoutes } from './stats/stats.routes';
import { ActivityRoutes } from './activity/activity.routes';
import { EventRoutes } from './event/event.routes';
import { AuditRoutes } from './audit/audit.routes';

const routes = [
  {
    path: '/permissions',
    route: PermissionRoutes,
  },
  {
    path: '/stats',
    route: StatsRoutes,
  },
  {
    path: '/activity',
    route: ActivityRoutes,
  },
  {
    path: '/events',
    route: EventRoutes,
  },
  {
    path: '/audit-logs',
    route: AuditRoutes,
  },
  // Add more module routes here
];

export default routes;

// Named exports for easy access
export { PermissionRoutes, StatsRoutes, ActivityRoutes, EventRoutes, AuditRoutes };
