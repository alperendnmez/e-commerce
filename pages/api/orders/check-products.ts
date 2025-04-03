import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    // Request body'den kontrol edilecek ürünleri al
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items format' });
    }

    // Ürün ID'lerini al
    const productIds = items.map(item => item.productId);
    
    // Varyant ID'lerini filtrele (null olmayanlar)
    const variantIds = items
      .filter(item => item.variantId !== null)
      .map(item => item.variantId);

    // Veritabanında mevcut olan ürünleri kontrol et
    const existingProducts = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      select: {
        id: true
      }
    });

    // Veritabanında mevcut olan varyantları kontrol et
    const existingVariants = variantIds.length > 0 
      ? await prisma.productVariant.findMany({
          where: {
            id: {
              in: variantIds
            }
          },
          select: {
            id: true
          }
        })
      : [];

    // Mevcut olmayan ürünleri tespit et
    const existingProductIds = existingProducts.map(p => p.id);
    const unavailableProducts = productIds.filter(id => !existingProductIds.includes(id));

    // Mevcut olmayan varyantları tespit et
    const existingVariantIds = existingVariants.map(v => v.id);
    const unavailableVariants = variantIds.filter(id => !existingVariantIds.includes(id));

    // Sonuçları döndür
    return res.status(200).json({
      unavailableProducts,
      unavailableVariants,
      allAvailable: unavailableProducts.length === 0 && unavailableVariants.length === 0
    });
  } catch (error) {
    console.error('Ürün kontrolü sırasında hata:', error);
    return res.status(500).json({ error: 'Ürün kontrolü sırasında bir hata oluştu' });
  }
}
