import { NextApiRequest, NextApiResponse } from 'next';
import { stockService } from '@/services/stockService';

// Bu endpoint, zamanlanmış bir görev tarafından çağrılarak 
// süresi dolmuş rezervasyonları otomatik olarak temizler.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece GET isteklerini kabul et
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // API anahtarı kontrolü - gerçek bir anahtarla değiştirilmeli
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Süresi dolmuş tüm rezervasyonları iptal et
    const result = await stockService.cleanupExpiredReservations();
    
    return res.status(200).json({
      success: true,
      message: `Expired reservations cleanup completed successfully`,
      count: result
    });
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clean up expired reservations'
    });
  }
} 