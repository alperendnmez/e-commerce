import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Gerçek uygulamada, veritabanından veri çekilecektir
  // Şimdilik örnek veri döndürüyoruz
  try {
    const overviewData = {
      totalSales: 125000,
      totalOrders: 258,
      newUsers: 45,
      lowStock: 12
    };
    
    res.status(200).json(overviewData);
  } catch (error) {
    console.error('Overview data fetching error:', error);
    res.status(500).json({ error: 'Genel bakış verileri alınamadı' });
  }
} 