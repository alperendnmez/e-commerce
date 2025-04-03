import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt(session.user.id);

    // GET - Kullanıcının değerlendirmelerini getir
    if (req.method === 'GET') {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Toplam değerlendirme sayısını al
        const totalReviews = await prisma.review.count({
          where: {
            userId: userId
          }
        });

        // Değerlendirmeleri getir
        const reviews = await prisma.review.findMany({
          where: {
            userId: userId
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrls: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        });

        // Değerlendirmeleri formatla
        const formattedReviews = reviews.map(review => {
          return {
            id: review.id,
            productId: review.productId,
            productName: review.product.name,
            productSlug: review.product.slug,
            productImage: review.product.imageUrls && review.product.imageUrls.length > 0 ? review.product.imageUrls[0] : null,
            rating: review.rating,
            title: review.title || '',
            comment: review.comment,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            isVerifiedPurchase: review.isVerifiedPurchase
          };
        });

        res.status(200).json({
          reviews: formattedReviews,
          pagination: {
            total: totalReviews,
            page,
            limit,
            pages: Math.ceil(totalReviews / limit)
          }
        });
      } catch (error) {
        console.error('Reviews fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
      }
    }
    // POST - Yeni değerlendirme ekle
    else if (req.method === 'POST') {
      try {
        const { productId, rating, title, comment } = req.body;

        if (!productId || !rating) {
          return res.status(400).json({ error: 'Product ID and rating are required' });
        }

        // Ürünün var olup olmadığını kontrol et
        const product = await prisma.product.findUnique({
          where: {
            id: parseInt(productId)
          }
        });

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        // Kullanıcının bu ürünü daha önce değerlendirip değerlendirmediğini kontrol et
        const existingReview = await prisma.review.findFirst({
          where: {
            userId: userId,
            productId: parseInt(productId)
          }
        });

        if (existingReview) {
          return res.status(400).json({ error: 'You have already reviewed this product' });
        }

        // Kullanıcının bu ürünü satın alıp almadığını kontrol et
        const verifiedPurchase = await prisma.orderItem.findFirst({
          where: {
            productId: parseInt(productId),
            order: {
              userId: userId,
              status: {
                in: ['DELIVERED', 'COMPLETED']
              }
            }
          }
        });

        // Yeni değerlendirme oluştur
        const newReview = await prisma.review.create({
          data: {
            userId: userId,
            productId: parseInt(productId),
            rating: parseInt(rating),
            title: title || '',
            comment: comment || '',
            isVerifiedPurchase: !!verifiedPurchase
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrls: true
              }
            }
          }
        });

        // Formatlanmış değerlendirmeyi döndür
        const formattedReview = {
          id: newReview.id,
          productId: newReview.productId,
          productName: newReview.product.name,
          productSlug: newReview.product.slug,
          productImage: newReview.product.imageUrls && newReview.product.imageUrls.length > 0 ? newReview.product.imageUrls[0] : null,
          rating: newReview.rating,
          title: newReview.title,
          comment: newReview.comment,
          createdAt: newReview.createdAt,
          updatedAt: newReview.updatedAt,
          isVerifiedPurchase: newReview.isVerifiedPurchase
        };

        res.status(201).json(formattedReview);
      } catch (error) {
        console.error('Review creation error:', error);
        res.status(500).json({ error: 'Failed to create review' });
      }
    }
    // PUT - Değerlendirmeyi güncelle
    else if (req.method === 'PUT') {
      try {
        const { id, rating, title, comment } = req.body;

        if (!id || !rating) {
          return res.status(400).json({ error: 'Review ID and rating are required' });
        }

        // Değerlendirmenin var olup olmadığını ve kullanıcıya ait olup olmadığını kontrol et
        const existingReview = await prisma.review.findFirst({
          where: {
            id: parseInt(id),
            userId: userId
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrls: true
              }
            }
          }
        });

        if (!existingReview) {
          return res.status(404).json({ error: 'Review not found or not owned by user' });
        }

        // Değerlendirmeyi güncelle
        const updatedReview = await prisma.review.update({
          where: {
            id: parseInt(id)
          },
          data: {
            rating: parseInt(rating),
            title: title || existingReview.title,
            comment: comment || existingReview.comment
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrls: true
              }
            }
          }
        });

        // Formatlanmış değerlendirmeyi döndür
        const formattedReview = {
          id: updatedReview.id,
          productId: updatedReview.productId,
          productName: updatedReview.product.name,
          productSlug: updatedReview.product.slug,
          productImage: updatedReview.product.imageUrls && updatedReview.product.imageUrls.length > 0 ? updatedReview.product.imageUrls[0] : null,
          rating: updatedReview.rating,
          title: updatedReview.title,
          comment: updatedReview.comment,
          createdAt: updatedReview.createdAt,
          updatedAt: updatedReview.updatedAt,
          isVerifiedPurchase: updatedReview.isVerifiedPurchase
        };

        res.status(200).json(formattedReview);
      } catch (error) {
        console.error('Review update error:', error);
        res.status(500).json({ error: 'Failed to update review' });
      }
    }
    // DELETE - Değerlendirmeyi sil
    else if (req.method === 'DELETE') {
      try {
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({ error: 'Review ID is required' });
        }

        // Değerlendirmenin var olup olmadığını ve kullanıcıya ait olup olmadığını kontrol et
        const existingReview = await prisma.review.findFirst({
          where: {
            id: parseInt(id as string),
            userId: userId
          }
        });

        if (!existingReview) {
          return res.status(404).json({ error: 'Review not found or not owned by user' });
        }

        // Değerlendirmeyi sil
        await prisma.review.delete({
          where: {
            id: parseInt(id as string)
          }
        });

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Review deletion error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
      }
    } else {
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 