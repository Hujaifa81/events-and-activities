// Audit Log Interfaces

export interface IAuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  metadata?: Record<string, any>;
  severity: string;
  createdAt: Date;
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export interface IAuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IAuditLogStats {
  totalLogs: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  byEntityType: Record<string, number>;
  topUsers: Array<{
    userId: string;
    username: string;
    count: number;
  }>;
  recentCritical: IAuditLog[];
}
