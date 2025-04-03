# API Standards and Response Format

This document outlines the standard response format for all API endpoints in our e-commerce application. Following these standards ensures consistent API responses across the entire application, making it easier for frontend developers to integrate with our backend.

## Table of Contents

1. [Standard Response Format](#standard-response-format)
2. [Success Responses](#success-responses)
3. [Error Responses](#error-responses)
4. [Pagination Format](#pagination-format)
5. [Helper Functions](#helper-functions)
6. [HTTP Status Codes](#http-status-codes)
7. [Examples](#examples)

## Standard Response Format

All API responses follow a consistent format, with distinct structures for success and error responses.

### Success Responses

```typescript
{
  "success": true,
  "data": any,
  "message": string (optional)
}
```

### Error Responses

```typescript
{
  "success": false,
  "error": string,
  "type": ErrorType,
  "details": any (optional)
}
```

The `ErrorType` is an enum that categorizes errors for easier handling on the client side:

```typescript
enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL'
}
```

## Pagination Format

For endpoints that return paginated lists, we use the following format:

```typescript
{
  "success": true,
  "data": {
    "items": any[],
    "meta": {
      "total": number,
      "page": number,
      "pageSize": number,
      "totalPages": number,
      "hasMore": boolean
    }
  }
}
```

## Helper Functions

We provide helper functions to create consistent responses:

### For Success Responses

```typescript
createSuccessResponse<T>(data: T, message?: string): ApiSuccessResponse<T>
```

### For Error Responses

```typescript
createErrorResponse(error: string, type: ErrorType, details?: any): ApiErrorResponse
```

### For Paginated Responses

```typescript
createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): ApiSuccessResponse<PaginatedResponse<T>>
```

## HTTP Status Codes

Our API uses standard HTTP status codes in conjunction with our error types:

| Status Code | Description | Error Type |
|-------------|-------------|------------|
| 200 | OK | N/A (Success) |
| 201 | Created | N/A (Success) |
| 400 | Bad Request | VALIDATION |
| 401 | Unauthorized | UNAUTHORIZED |
| 403 | Forbidden | FORBIDDEN |
| 404 | Not Found | NOT_FOUND |
| 409 | Conflict | CONFLICT |
| 500 | Internal Server Error | INTERNAL |

## Examples

### Success Response Example

```json
{
  "success": true,
  "data": {
    "id": 123,
    "orderNumber": "ORD-12345",
    "status": "PROCESSING",
    "total": 99.99
  },
  "message": "Order created successfully"
}
```

### Error Response Example

```json
{
  "success": false,
  "error": "Order not found",
  "type": "NOT_FOUND"
}
```

### Paginated Response Example

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 123,
        "orderNumber": "ORD-12345",
        "status": "PROCESSING",
        "total": 99.99
      },
      {
        "id": 124,
        "orderNumber": "ORD-12346",
        "status": "PENDING",
        "total": 149.99
      }
    ],
    "meta": {
      "total": 42,
      "page": 1,
      "pageSize": 10,
      "totalPages": 5,
      "hasMore": true
    }
  }
}
```

## Implementation Notes

These response formats are implemented using TypeScript interfaces in `types/api-response.ts`. All API endpoints should use these standards to ensure consistency across the application.

Frontend developers can expect this format in all API responses, making error handling and data extraction more straightforward and predictable. 