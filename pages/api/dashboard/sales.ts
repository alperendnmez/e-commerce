import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Gerçek uygulamada, veritabanından veri çekilecektir
  // Şimdilik örnek veri döndürüyoruz
  try {
    const labels = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz'];
    
    const salesData = {
      labels,
      datasets: [
        {
          label: 'Satışlar',
          data: labels.map(() => Math.floor(Math.random() * 10000) + 5000),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        }
      ]
    };
    
    res.status(200).json(salesData);
  } catch (error) {
    console.error('Sales data fetching error:', error);
    res.status(500).json({ error: 'Satış verileri alınamadı' });
  }
} 