import { ErrorType } from '@/lib/errorHandler';

/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  type: ErrorType;
  details?: any;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Standard paginated response format
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Helper function to create a success response
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}

/**
 * Helper function to create an error response
 */
export function createErrorResponse(error: string, type: ErrorType, details?: any): ApiErrorResponse {
  return {
    success: false,
    error,
    type,
    ...(details && { details })
  };
}

/**
 * Helper function to create a paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): ApiSuccessResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    success: true,
    data: {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages
      }
    }
  };
} 