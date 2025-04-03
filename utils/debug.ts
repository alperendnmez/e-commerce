/**
 * Debugging utilities for the Next.js E-commerce application
 */

/**
 * Logs the product structure safely (handling circular references)
 * @param product The product object to log
 * @param source The source of the product (for identification)
 */
export function logProductStructure(product: any, source: string) {
  try {
    // Create a safe copy of the product object without circular references
    const safeCopy = JSON.parse(JSON.stringify(product, (_key, value) => {
      // Handle functions, DOM nodes, etc.
      if (typeof value === 'function' || value instanceof Node) {
        return '[Function or DOM node]';
      }
      return value;
    }));
    
    // Log with source and structure information
    console.log(`[DEBUG][${source}] Product Structure:`, {
      id: safeCopy.id,
      name: safeCopy.name,
      price: safeCopy.price,
      hasVariants: !!safeCopy.variants?.length,
      variantsCount: safeCopy.variants?.length || 0,
      firstVariantId: safeCopy.variants?.[0]?.id,
      firstVariantIdType: safeCopy.variants?.[0]?.id ? typeof safeCopy.variants[0].id : null,
      firstVariantPrice: safeCopy.variants?.[0]?.price,
      firstVariantStock: safeCopy.variants?.[0]?.stock,
      imageUrls: safeCopy.imageUrls,
      otherKeys: Object.keys(safeCopy).filter(key => 
        !['id', 'name', 'price', 'variants', 'imageUrls'].includes(key)
      )
    });
    
    return true;
  } catch (error) {
    console.error(`[DEBUG][${source}] Error logging product:`, error);
    return false;
  }
}

/**
 * Logs an API request safely
 * @param endpoint The API endpoint
 * @param data The request data
 */
export function logApiRequest(endpoint: string, data: any) {
  try {
    console.log(`[DEBUG][API] Request to ${endpoint}:`, 
      JSON.parse(JSON.stringify(data, (_key, value) => {
        // Mask sensitive data
        if (_key === 'password' || _key === 'token' || _key.includes('secret')) {
          return '********';
        }
        return value;
      }))
    );
    return true;
  } catch (error) {
    console.error(`[DEBUG][API] Error logging request to ${endpoint}:`, error);
    return false;
  }
}

/**
 * Logs an error safely with stack trace
 * @param source The source of the error
 * @param error The error object
 */
export function logError(source: string, error: any) {
  console.error(`[ERROR][${source}]:`, error);
  if (error instanceof Error) {
    console.error(`[ERROR][${source}] Message:`, error.message);
    console.error(`[ERROR][${source}] Stack:`, error.stack);
  }
} 