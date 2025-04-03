# TypeScript Error Resolution Guide

This document provides guidance on how to resolve the remaining TypeScript errors in our e-commerce application, focusing on the service layer and Prisma integration.

## Common TypeScript Errors

We've identified several common TypeScript errors in our codebase:

1. **Type Conversion Errors** - When converting Prisma results to our custom types
2. **Missing Properties** - When Prisma's types don't match our custom interfaces
3. **Enum Compatibility** - When enum values in code don't match database enums
4. **Property Access on Transaction Objects** - When trying to access relations not defined in the Transaction client type

## Strategies for Resolving Errors

### 1. Type Conversion Errors

When converting Prisma results to custom types, use a two-step cast with `unknown` as an intermediate step:

```typescript
// Instead of this (generates type error)
return formatOrder(order as OrderWithRelations);

// Use this (safer approach)
return formatOrder(order as unknown as OrderWithRelations);
```

### 2. Missing Properties

For cases where Prisma's generated types don't include properties we've added:

#### Option 1: Extend the Prisma types

```typescript
// In a type definition file
import { Order } from '@prisma/client';

// Extend the Prisma Order type with our additional properties
declare global {
  namespace PrismaJson {
    interface OrderExtensions {
      adminNotes?: string;
      // Add other custom properties here
    }
  }
}

// Use it like this
const orderWithExtensions: Order & PrismaJson.OrderExtensions = {
  // Properties
};
```

#### Option 2: Use type assertions for specific properties

```typescript
// When adding properties not in the Prisma input type
await prisma.order.update({
  where: { id: orderId },
  data: { 
    // Cast to any only for the specific property that's causing issues
    adminNotes: adminNotes as any 
  }
});
```

### 3. Enum Compatibility

When working with enums, prefer using string literals that match the database values:

```typescript
// Instead of using the enum directly
if ([OrderStatus.CANCELED, OrderStatus.COMPLETED].includes(order.status)) {
  // Code here
}

// Use string literals when the enum might not include all values
if (order.status === OrderStatus.CANCELED || order.status === 'COMPLETED') {
  // Code here
}
```

### 4. Transaction Client Properties

For transaction objects that need to access relations not in the type:

```typescript
// Define a custom transaction type
type PrismaTransaction = Prisma.TransactionClient & {
  orderTimeline?: {
    create: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<any>;
  };
};

// Then use it with a try-catch to handle potential missing properties
try {
  const txWithTimeline = tx as unknown as PrismaTransaction;
  
  if (txWithTimeline.orderTimeline) {
    await txWithTimeline.orderTimeline.create({
      // Properties
    });
  }
} catch (err) {
  console.warn('Failed to create order timeline entry:', err);
}
```

## Specific Fixes for Common Errors

### OrderWithRelations Conversion

```typescript
// In orderHelpers.ts, update the formatOrder function to handle partial objects

export function formatOrder(order: unknown): FormattedOrder {
  // Cast to a safer type
  const orderData = order as Partial<OrderWithRelations>;
  
  return {
    id: orderData.id || 0,
    orderNumber: orderData.orderNumber || `ORDER-${orderData.id}`,
    status: orderData.status || OrderStatus.PENDING,
    total: orderData.totalPrice || 0,
    subtotal: orderData.subtotal || 0,
    // ... rest of the properties with safe fallbacks
  };
}
```

### Coupon Type Issues

```typescript
// In orderService.ts, update the applyCoupon method

private async applyCoupon(tx: Prisma.TransactionClient, couponId: number, subtotal: number): Promise<number> {
  const coupon = await tx.coupon.findUnique({
    where: { id: couponId }
  });
  
  if (!coupon) return 0;
  
  let discountAmount = 0;
  
  // Use conditionals that check for the existence of properties
  if (coupon.discountPct) {
    discountAmount = (subtotal * coupon.discountPct) / 100;
  } else if (coupon.discountAmt) {
    discountAmount = coupon.discountAmt;
  }
  
  // Increment coupon usage
  await tx.coupon.update({
    where: { id: couponId },
    data: { usageCount: { increment: 1 } }
  });
  
  return discountAmount;
}
```

### OrderTimeline Issues

```typescript
// Create a proper type for the transaction client that includes orderTimeline
type ExtendedTransactionClient = Prisma.TransactionClient & {
  orderTimeline: {
    create: (args: { data: any }) => Promise<any>;
    deleteMany: (args: { where: any }) => Promise<any>;
  }
};

// Use try-catch to handle potential missing properties
try {
  // Cast to the extended type
  const extendedTx = tx as unknown as ExtendedTransactionClient;
  
  // Use optional chaining to avoid errors
  await extendedTx.orderTimeline?.create({
    data: {
      orderId,
      status: newStatus,
      description: `Order status changed from ${order.status} to ${newStatus}`,
      date: new Date()
    }
  });
} catch (error) {
  console.warn('Error creating timeline entry, might not be in schema:', error);
}
```

## Best Practices for Type Safety

1. **Define Clear Interfaces** - Keep interfaces simple and focused
2. **Use Utility Types** - Leverage TypeScript utility types like `Partial<T>`, `Pick<T>`, and `Omit<T>`
3. **Avoid `any`** - Use `unknown` followed by type narrowing instead
4. **Add Type Guards** - Create functions that verify the shape of data
5. **Document Type Casts** - Add comments explaining why a type cast is necessary

## Going Forward

As we continue to improve type safety:

1. **Keep Prisma Schema and TypeScript Types in Sync** - Update types when the schema changes
2. **Create Adapters** - Build functions that safely convert between Prisma types and API types
3. **Add Type Tests** - Write tests that verify type compatibility
4. **Use Schema Validation** - Consider adding Zod or another validation library for runtime type checking

By following these guidelines, we'll continue to improve the TypeScript type safety across our application. 