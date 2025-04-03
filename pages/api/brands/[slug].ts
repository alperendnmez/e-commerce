import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;
  
  if (!slug || Array.isArray(slug)) {
    return res.status(400).json({ error: 'Geçersiz marka slug parametresi' });
  }

  switch (req.method) {
    case 'GET':
      try {
        console.log(`GET /api/brands/${slug} isteği alındı`);
        
        // Markayı getir
        const brand = await prisma.brand.findUnique({
          where: { slug },
          include: {
            _count: {
              select: {
                products: true
              }
            }
          }
        });
        
        if (!brand) {
          return res.status(404).json({ error: 'Marka bulunamadı' });
        }
        
        // Sadece aktif olmayan markaları sadece admin kullanıcılarına göster
        if (!brand.isActive) {
          // NOT: Gerçek projede burada yetkilendirme kontrolü yapılmalı
          // Örnek: if (!session || session.user.role !== 'ADMIN') {
          //   return res.status(404).json({ error: 'Marka bulunamadı' });
          // }
        }
        
        // Hassas verileri temizle
        const cleanedBrand = {
          ...brand,
          productCount: brand._count.products,
          _count: undefined
        };
        
        console.log(`${slug} markası bulundu`);
        return res.status(200).json(cleanedBrand);
      } catch (error) {
        console.error(`GET /api/brands/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }
      
    case 'PUT':
    case 'PATCH':
      // Bu kısmı dashboard için ayırıyoruz
      return res.status(403).json({ error: 'Bu endpoint üzerinden güncelleme yapamazsınız' });
      
    case 'DELETE':
      // Bu kısmı dashboard için ayırıyoruz
      return res.status(403).json({ error: 'Bu endpoint üzerinden silme işlemi yapamazsınız' });
      
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 