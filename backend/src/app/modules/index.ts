// Module Routes
import { PermissionRoutes } from './permission/permission.routes';
import { StatsRoutes } from './stats/stats.routes';
import { ActivityRoutes } from './activity/activity.routes';

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
  // Add more module routes here
];

export default routes;

// Named exports for easy access
export { PermissionRoutes, StatsRoutes, ActivityRoutes };
