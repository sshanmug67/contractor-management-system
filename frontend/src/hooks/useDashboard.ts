import { useState, useEffect, useCallback } from 'react';
import dashboardService from '@/services/dashboardService';
import type { OwnerDashboardData } from '@/types/dashboard';

interface UseDashboardReturn {
  data: OwnerDashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboard(projectId?: string): UseDashboardReturn {
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardService.getOwnerDashboard(projectId);
      setData(result);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to load dashboard data';
      setError(message);
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refresh: fetchDashboard };
}
