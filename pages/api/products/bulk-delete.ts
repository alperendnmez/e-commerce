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
      return res.status(400).json({ error: 'Silinecek ürün ID\'leri dizisi gereklidir.' });
    }

    // Convert string IDs to numbers if needed
    const productIds = ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id);

    // Check if any ID is not a valid number
    if (productIds.some(id => isNaN(id))) {
      return res.status(400).json({ error: 'Tüm ürün ID\'leri geçerli sayılar olmalıdır.' });
    }

    // Get all products to delete with their relations
    const productsToDelete = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        variants: {
          include: {
            variantValues: true
          }
        },
        variantGroups: {
          include: {
            values: true
          }
        },
        favoritedBy: true,
        cartItems: true,
        orderItems: true
      },
    });

    if (productsToDelete.length === 0) {
      return res.status(404).json({ error: 'Hiçbir ürün bulunamadı.' });
    }

    // Delete all products and their relations in a transaction
    let deletedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const product of productsToDelete) {
        // 1. Remove from favorites
        if (product.favoritedBy.length > 0) {
          await tx.userFavoriteProducts.deleteMany({
            where: { productId: product.id }
          });
        }
        
        // 2. Remove from cart items
        if (product.cartItems.length > 0) {
          await tx.cartItem.deleteMany({
            where: { productId: product.id }
          });
        }
        
        // 3. Handle order items (in a real system, we might mark as inactive rather than delete)
        if (product.orderItems.length > 0) {
          await tx.orderItem.deleteMany({
            where: { productId: product.id }
          });
        }
        
        // 4. Delete variant values relationships
        for (const variant of product.variants) {
          if (variant.variantValues && variant.variantValues.length > 0) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                variantValues: {
                  disconnect: variant.variantValues.map(vv => ({ id: vv.id }))
                }
              }
            });
          }
        }
        
        // 5. Delete variants
        if (product.variants.length > 0) {
          await tx.productVariant.deleteMany({
            where: { productId: product.id }
          });
        }
        
        // 6. Delete variant values
        for (const group of product.variantGroups) {
          if (group.values.length > 0) {
            await tx.variantValue.deleteMany({
              where: { variantGroupId: group.id }
            });
          }
        }
        
        // 7. Delete variant groups
        if (product.variantGroups.length > 0) {
          await tx.variantGroup.deleteMany({
            where: { productId: product.id }
          });
        }
        
        // 8. Finally delete the product
        await tx.product.delete({
          where: { id: product.id }
        });
        
        deletedCount++;
      }
    });

    return res.status(200).json({ 
      message: `${deletedCount} ürün başarıyla silindi.`,
      count: deletedCount
    });
  } catch (error: any) {
    console.error('Ürünler toplu silme hatası:', error);
    return res.status(500).json({ error: 'Ürünler silinirken bir hata oluştu.', details: error.message });
  }
};

export default withErrorHandler(withAdmin(handler)); 