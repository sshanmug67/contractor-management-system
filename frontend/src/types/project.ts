export interface Project {
  id: string;
  org_id: string;
  title: string;
  description: string;
  location: string;
  budget: number;
  start_date: string;
  deadline: string;
  status: ProjectStatus;
  progress_pct: number;
  custom_fields?: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus =
  | 'draft'
  | 'planning'
  | 'active'
  | 'review'
  | 'complete'
  | 'on_hold'
  | 'cancelled';

export interface CreateProjectRequest {
  title: string;
  description: string;
  location: string;
  budget: number;
  start_date: string;
  deadline: string;
  custom_fields?: Record<string, unknown>;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  location?: string;
  budget?: number;
  start_date?: string;
  deadline?: string;
  status?: ProjectStatus;
  custom_fields?: Record<string, unknown>;
}
