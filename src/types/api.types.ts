/**
 * Common API types for pagination and filtering
 */

// Pagination info in response
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Paginated API response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Pagination request parameters
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// Query parameters with filters
export interface QueryParams extends PaginationParams {
  search?: string;
  filters?: Record<string, any>;
}

// Build query string from params
export function buildQueryString(params: QueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.append('page', params.page.toString());
  }
  if (params.pageSize) {
    searchParams.append('pageSize', params.pageSize.toString());
  }
  if (params.sortField) {
    searchParams.append('sortField', params.sortField);
  }
  if (params.sortOrder) {
    searchParams.append('sortOrder', params.sortOrder);
  }
  if (params.search) {
    searchParams.append('search', params.search);
  }
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(`filter_${key}`, String(value));
      }
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// Default pagination values
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
