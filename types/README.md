# TypeScript Types

This directory contains all the TypeScript type definitions for the application. These types help maintain code quality, provide better developer experience through autocompletion, and catch potential errors at compile time.

## Overview

The type definitions here represent the core domain models of our e-commerce application, ensuring consistency across the codebase.

## Directory Structure

- `order.ts` - Types related to orders, order items, and order processing
- `compare.ts` - Types for product comparison functionality
- `next-auth.d.ts` - Type extensions for NextAuth.js authentication

## Guidelines for Type Definitions

When working with types in this project, follow these guidelines:

1. **Keep types aligned with the Prisma schema**  
   Type definitions should mirror the database schema as closely as possible, with any additional application-specific properties clearly documented.

2. **Prefer interfaces for object types**  
   Use interfaces for object types to allow for extension and declaration merging when appropriate.

3. **Use enums for fixed sets of values**  
   Where possible, use TypeScript enums or union types to represent fixed sets of values.

4. **Export all types**  
   All type definitions should be exported to allow reuse across the application.

5. **Document complex types**  
   Add JSDoc comments for complex types to explain their purpose and usage.

6. **Avoid `any`**  
   Avoid using `any` type unless absolutely necessary. Prefer `unknown` if the type is truly unknown.

7. **Use utility types**  
   Make use of TypeScript's utility types (e.g., `Partial<T>`, `Pick<T>`, `Omit<T>`) to derive new types from existing ones.

## Common Type Patterns

### Request/Response Types

For API endpoints, define request and response types clearly:

```typescript
// Request type
export interface CreateOrderRequest {
  userId: number;
  items: Array<{
    productId: number;
    variantId?: number;
    quantity: number;
  }>;
  shippingAddressId?: number;
  billingAddressId?: number;
  couponCode?: string;
}

// Response type
export interface CreateOrderResponse {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  // ...other fields
}
```

### Model Types

For database models, follow this pattern:

```typescript
// Base model type that matches Prisma schema
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  // ...other database fields
}

// Extended model with relations
export interface ProductWithRelations extends Product {
  categories: Category[];
  variants: ProductVariant[];
  reviews: Review[];
}

// Formatted model for API responses
export interface FormattedProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  averageRating: number;
  categoryNames: string[];
  // ...other calculated or formatted fields
}
```

## Maintaining Types

To keep types in sync with the database schema:

1. After modifying the Prisma schema, always run:
   ```
   npx prisma generate
   ```

2. Update corresponding TypeScript interfaces in this directory

3. If types affect API contracts, document the changes in API documentation

4. Run TypeScript compiler to catch any breaking changes:
   ```
   npx tsc --noEmit
   ```

## Example Usage

Here's how to use these types in your code:

```typescript
import { FormattedOrder } from '@/types/order';

async function getOrderById(orderId: number): Promise<FormattedOrder | null> {
  // Implementation...
}
``` 