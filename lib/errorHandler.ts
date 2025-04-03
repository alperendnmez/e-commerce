// lib/errorHandler.ts
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { Prisma } from '@prisma/client';

// Define error types 
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL',
}

// Map error types to HTTP status codes
const errorStatusCodes: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.INTERNAL]: 500,
};

// Custom API error class
export class ApiError extends Error {
  type: ErrorType;
  details?: any;

  constructor(type: ErrorType, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.details = details;
  }
}

// Helper to map Prisma errors to our API errors
export function mapPrismaError(error: any): ApiError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025': // Record not found
        return new ApiError(ErrorType.NOT_FOUND, 'Requested resource not found');
      case 'P2002': // Unique constraint violation
        return new ApiError(ErrorType.CONFLICT, 'Duplicate entry', { fields: error.meta?.target });
      case 'P2003': // Foreign key constraint violation
        return new ApiError(ErrorType.VALIDATION, 'Related record not found', { field: error.meta?.field_name });
      default:
        return new ApiError(ErrorType.INTERNAL, 'Database operation failed', { code: error.code });
    }
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ApiError(ErrorType.VALIDATION, 'Invalid data provided', { originalError: error.message });
  }

  return new ApiError(ErrorType.INTERNAL, error.message || 'An unexpected error occurred');
}

export function withErrorHandler(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('API Error:', error);
      
      // Handle ApiError instances directly
      if (error instanceof ApiError) {
        const statusCode = errorStatusCodes[error.type];
        return res.status(statusCode).json({
          error: error.message,
          type: error.type,
          ...(error.details && { details: error.details }),
        });
      }
      
      // Map Prisma errors to ApiError
      if (error instanceof Prisma.PrismaClientKnownRequestError || 
          error instanceof Prisma.PrismaClientValidationError) {
        const apiError = mapPrismaError(error);
        const statusCode = errorStatusCodes[apiError.type];
        return res.status(statusCode).json({
          error: apiError.message,
          type: apiError.type,
          ...(apiError.details && { details: apiError.details }),
        });
      }

      // For other errors, return a generic 500 response
      res.status(500).json({ 
        error: 'Internal Server Error',
        type: ErrorType.INTERNAL,
        ...(process.env.NODE_ENV !== 'production' ? { details: error.message } : {})
      });
    }
  };
}

// Helper to validate request data
export function validateRequest(data: any, schema: any): boolean | ApiError {
  try {
    if (!schema) return true;
    
    // You could implement schema validation here
    // For example, using a library like Joi, Zod, or Yup
    
    return true;
  } catch (error) {
    return new ApiError(ErrorType.VALIDATION, 'Invalid request data', error);
  }
}
