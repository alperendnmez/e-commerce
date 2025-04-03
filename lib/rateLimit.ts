import { NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

/**
 * İstek sınırlama (rate limiting) işlevi
 * Belirli bir süre içinde belirli bir IP'den gelen istek sayısını sınırlar
 */
export const rateLimit = (options: Options) => {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (
      res: NextApiResponse,
      limit: number,
      token: string
    ): Promise<void> => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0];
      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1]);
      } else {
        tokenCount[0] = tokenCount[0] + 1;
        tokenCache.set(token, tokenCount);
      }

      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage >= limit;

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', isRateLimited ? 0 : limit - currentUsage);

      return new Promise((resolve, reject) => {
        if (isRateLimited) {
          res.setHeader('Retry-After', options.interval || 60000);
          reject(new Error('İstek limiti aşıldı'));
          return;
        }

        resolve();
      });
    },
  };
}; 