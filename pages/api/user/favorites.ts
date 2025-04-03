import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Kullanıcı oturumunu almak için getServerSession kullan
    const session = await getServerSession(req, res, authOptions);
    console.log('Session data:', session ? { userId: session.user.id, email: session.user.email } : 'No session');

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // session.user.id string tipinde olduğu için parseInt kullan
    const userId = parseInt(session.user.id);
    console.log('User ID:', userId);

    if (isNaN(userId)) {
      console.error('Invalid user ID:', session.user.id);
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // GET - Favori ürünleri getir
    if (req.method === 'GET') {
      console.log('GET /api/user/favorites - userId:', userId);
      try {
        const favorites = await prisma.userFavoriteProducts.findMany({
          where: {
            userId: userId
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrls: true,
                variants: {
                  where: {
                    stock: {
                      gt: 0
                    }
                  },
                  take: 1,
                  orderBy: {
                    price: 'asc'
                  }
                },
                category: {
                  select: {
                    name: true,
                    slug: true
                  }
                }
              }
            }
          }
        });

        console.log(`Found ${favorites.length} favorites for user ${userId}`);

        // Ürün verilerini düzenle
        const formattedFavorites = favorites.map(favorite => {
          const { product } = favorite;
          
          const lowestPrice = product.variants.length > 0
            ? product.variants[0].price
            : null;

          return {
            id: favorite.productId,
            name: product.name,
            slug: product.slug,
            image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null,
            category: product.category,
            price: lowestPrice || 0,
            discountedPrice: null,
            rating: 0,
            inStock: product.variants.length > 0
          };
        });

        res.status(200).json({ favorites: formattedFavorites });
      } catch (error) {
        console.error('Favorites fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
      }
    }
    // POST - Ürünü favorilere ekle
    else if (req.method === 'POST') {
      try {
        const { productId } = req.body;
        console.log('POST /api/user/favorites - userId:', userId, 'productId:', productId);

        if (!productId) {
          return res.status(400).json({ error: 'Product ID is required' });
        }

        // Ürünün var olduğunu kontrol et
        const product = await prisma.product.findUnique({
          where: {
            id: parseInt(productId)
          }
        });

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        // Ürün zaten favorilerde mi kontrol et
        const existingFavorite = await prisma.userFavoriteProducts.findFirst({
          where: {
            userId: userId,
            productId: parseInt(productId)
          }
        });

        if (existingFavorite) {
          return res.status(400).json({ error: 'Product already in favorites' });
        }

        // Ürünü favorilere ekle
        await prisma.userFavoriteProducts.create({
          data: {
            userId: userId,
            productId: parseInt(productId)
          }
        });

        console.log(`Added product ${productId} to favorites for user ${userId}`);
        res.status(201).json({ success: true });
      } catch (error) {
        console.error('Add to favorites error:', error);
        res.status(500).json({ error: 'Failed to add product to favorites' });
      }
    }
    // DELETE - Ürünü favorilerden çıkar
    else if (req.method === 'DELETE') {
      try {
        const { productId } = req.query;
        console.log('DELETE /api/user/favorites - userId:', userId, 'productId:', productId);

        if (!productId || Array.isArray(productId)) {
          return res.status(400).json({ error: 'Invalid product ID' });
        }

        // Favori kaydını sil
        await prisma.userFavoriteProducts.deleteMany({
          where: {
            userId: userId,
            productId: parseInt(productId)
          }
        });

        console.log(`Removed product ${productId} from favorites for user ${userId}`);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Remove from favorites error:', error);
        res.status(500).json({ error: 'Failed to remove product from favorites' });
      }
    } else {
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 