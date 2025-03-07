// lib/middleware.ts
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { getServerSession } from 'next-auth/next';
import { options } from '../pages/api/auth/[...nextauth]'; // Doğru path'i kullanın

// withAdmin Middleware (Mevcut)
export function withAdmin(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { method } = req;

    // Sadece belirli metodlar için kontrol yap
    const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!protectedMethods.includes(method!)) {
      // Eğer metod koruma gerektirmiyorsa, doğrudan handler'ı çalıştır
      return handler(req, res);
    }

    // Korunan metodlar için admin kontrolü yap
    const session = await getServerSession(req, res, options);
    console.log('Session (withAdmin):', session); // Debugging için session'ı loglayın

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Eğer admin ise, handler'ı çalıştır
    return handler(req, res);
  };
}

// withUser Middleware (Yeni)
export function withUser(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, options);
    console.log('Session (withUser):', session); // Debugging için session'ı loglayın

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Kullanıcının kimliğini req objesine ekleyin
    (req as any).user = session.user;

    return handler(req, res);
  };
}
