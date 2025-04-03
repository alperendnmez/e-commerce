import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import { stockService } from '@/services/stockService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // İstek gövdesinden verileri al
    const { reservationId } = req.body;

    // Zorunlu alanları kontrol et
    if (!reservationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reservation ID is required' 
      });
    }

    // Rezervasyonu iptal et
    const result = await stockService.cancelReservation(parseInt(reservationId.toString()));

    // Sonucu döndür
    return res.status(200).json({ 
      success: result,
      message: result ? 'Reservation cancelled successfully' : 'Failed to cancel reservation'
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel reservation' 
    });
  }
} 