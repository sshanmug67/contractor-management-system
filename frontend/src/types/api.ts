export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  count: number;
  next_token?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  limit?: number;
  next_token?: string;
}

export interface FilterParams {
  status?: string;
  contractor_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}
