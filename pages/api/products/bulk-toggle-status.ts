import { NextApiRequest, NextApiResponse } from 'next';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { ids } = req.body;

    // Validate request body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Güncellenecek ürün ID\'leri dizisi gereklidir.' });
    }

    // Convert string IDs to numbers if needed
    const productIds = ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id);

    // Check if any ID is not a valid number
    if (productIds.some(id => isNaN(id))) {
      return res.status(400).json({ error: 'Tüm ürün ID\'leri geçerli sayılar olmalıdır.' });
    }

    // Get current status of all products to update
    const productsToUpdate = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, published: true }
    });

    if (productsToUpdate.length === 0) {
      return res.status(404).json({ error: 'Hiçbir ürün bulunamadı.' });
    }

    // Update each product's published status to the opposite value
    const updatePromises = productsToUpdate.map(product => 
      prisma.product.update({
        where: { id: product.id },
        data: { published: !product.published }
      })
    );

    // Execute all updates
    await Promise.all(updatePromises);

    return res.status(200).json({ 
      message: `${productsToUpdate.length} ürünün durumu başarıyla güncellendi.`,
      count: productsToUpdate.length
    });
  } catch (error: any) {
    console.error('Ürünlerin toplu durum değiştirme hatası:', error);
    return res.status(500).json({ error: 'Ürünlerin durumu güncellenirken bir hata oluştu.', details: error.message });
  }
};

export default withErrorHandler(withAdmin(handler)); 