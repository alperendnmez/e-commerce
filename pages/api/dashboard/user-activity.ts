import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Gerçek uygulamada, veritabanından veri çekilecektir
  // Şimdilik örnek veri döndürüyoruz
  try {
    const labels = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz'];
    
    const userActivityData = {
      labels,
      datasets: [
        {
          label: 'Yeni Kullanıcılar',
          data: labels.map(() => Math.floor(Math.random() * 50) + 10),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
        {
          label: 'Aktif Kullanıcılar',
          data: labels.map(() => Math.floor(Math.random() * 150) + 50),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        }
      ]
    };
    
    res.status(200).json(userActivityData);
  } catch (error) {
    console.error('User activity data fetching error:', error);
    res.status(500).json({ error: 'Kullanıcı etkinliği verileri alınamadı' });
  }
} 