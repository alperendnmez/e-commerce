// pages/api/categories/[slug].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import { slugify } from '@/lib/slugify'; // Slugify fonksiyonunu import edin
import prisma from '@/lib/prisma';

// Category tipi tanımla
interface Category {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  parentId: number | null;
  parent?: Category | null;
  children?: Category[];
  displayOrder: number;
  isActive: boolean;
  showInHeader?: boolean;
  showInFooter?: boolean;
  showInSidebar?: boolean;
  allowProductComparison?: boolean;
  maxCompareProducts?: number;
  compareAttributes?: string;
  priceRanges?: string; // Kategori için önerilen fiyat aralıkları
  allowedBrands?: string; // Kategori için önerilen markalar
  createdAt: Date;
  updatedAt: Date;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query;

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Geçersiz slug' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const category = await prisma.category.findUnique({
          where: { slug },
          include: { 
            children: true,
            parent: true 
          },
        });

        if (!category) {
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }

        // Kategori yanıtını tarih bilgileriyle birlikte dönelim
        const responseData = {
          ...category,
          createdAt: (category as any).createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: (category as any).updatedAt?.toISOString() || new Date().toISOString(),
        };

        console.log('Kategori detayları:', responseData);
        return res.status(200).json(responseData);
      } catch (error) {
        console.error(`GET /api/categories/${slug} hatası:`, error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    case 'PUT':
      try {
        const { 
          name, 
          description, 
          parentSlug, 
          seoTitle, 
          seoDescription, 
          seoKeywords,
          displayOrder, 
          isActive,
          isFeatured,
          showInSlider,
          showInHeader,
          showInFooter,
          showInSidebar,
          allowProductComparison,
          maxCompareProducts,
          compareAttributes,
          imageUrl,
          iconUrl,
          bannerUrl,
          mobileBannerUrl,
          priceRanges,
          allowedBrands
        } = req.body;

        console.log('Kategori güncelleme verileri:', req.body);

        if (!name) {
          return res.status(400).json({ error: 'Kategori adı gerekli' });
        }

        let parentId: number | null = null;
        if (parentSlug && parentSlug !== 'none') {
          const parentCategory = await prisma.category.findUnique({
            where: { slug: parentSlug },
          });

          if (!parentCategory) {
            return res.status(400).json({ error: 'Parent kategori bulunamadı' });
          }
          parentId = parentCategory.id;
        }

        console.log('Güncelleme verileri:', {
          name, 
          description, 
          parentId, 
          displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
          isActive: typeof isActive === 'boolean' ? isActive : true,
          isFeatured: typeof isFeatured === 'boolean' ? isFeatured : false
        });

        // Kategoriyi güncelle - connect/disconnect yöntemini kullanarak
        const updateData: any = {
          name,
          description,
          seoTitle,
          seoDescription,
          seoKeywords,
          slug: slugify(name), // Slug'ı otomatik olarak güncelle
        };

        // Görsel URL'leri ekle
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
        if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
        if (mobileBannerUrl !== undefined) updateData.mobileBannerUrl = mobileBannerUrl;

        // displayOrder ve isActive ekle
        if (typeof displayOrder === 'number') {
          updateData.displayOrder = displayOrder;
        }
        
        if (typeof isActive === 'boolean') {
          updateData.isActive = isActive;
        }
        
        if (typeof isFeatured === 'boolean') {
          updateData.isFeatured = isFeatured;
        }

        if (typeof showInSlider === 'boolean') {
          updateData.showInSlider = showInSlider;
        }

        // Gelişmiş ayarları ekle
        if (typeof showInHeader === 'boolean') updateData.showInHeader = showInHeader;
        if (typeof showInFooter === 'boolean') updateData.showInFooter = showInFooter;
        if (typeof showInSidebar === 'boolean') updateData.showInSidebar = showInSidebar;
        if (typeof allowProductComparison === 'boolean') updateData.allowProductComparison = allowProductComparison;
        if (typeof maxCompareProducts === 'number') updateData.maxCompareProducts = maxCompareProducts;
        if (compareAttributes !== undefined) updateData.compareAttributes = compareAttributes;
        
        // Fiyat aralıkları ve önerilen markalar
        if (priceRanges !== undefined) updateData.priceRanges = priceRanges;
        if (allowedBrands !== undefined) updateData.allowedBrands = allowedBrands;

        // Parent kategori işlemleri
        if (parentSlug === 'none') {
          // Eğer 'none' seçildiyse, parent bağlantısını kaldır
          updateData.parent = { disconnect: true };
        } else if (parentId) {
          // Eğer bir parent seçildiyse, bağla
          updateData.parent = { connect: { id: parentId } };
        }

        const updatedCategory = await prisma.category.update({
          where: { slug },
          data: updateData,
          include: {
            parent: true,
            children: true,
          }
        });

        console.log('Güncellenmiş kategori:', updatedCategory);
        return res.status(200).json(updatedCategory);
      } catch (error: any) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }
        console.error(`PUT /api/categories/${slug} hatası:`, error);
        return res.status(500).json({ 
          error: 'Sunucu hatası', 
          details: error.message,
          stack: error.stack
        });
      }

    case 'DELETE':
      try {
        console.log(`DELETE /api/categories/${slug} isteği alındı`);
        
        // Önce kategoriyi bul - silinecek kategori var mı kontrol et
        const categoryToDelete = await prisma.category.findUnique({
          where: { slug },
          include: { 
            children: true,
            // Eğer diğer ilişkili veriler varsa burada ekleyin
          }
        });

        if (!categoryToDelete) {
          console.log(`Silinecek kategori bulunamadı: ${slug}`);
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }

        // Alt kategorileri kontrol et
        if (categoryToDelete.children && categoryToDelete.children.length > 0) {
          console.log(`Kategori silinemez: ${slug}, ${categoryToDelete.children.length} alt kategorisi var`);
          return res.status(400).json({ 
            error: 'Alt kategorileri olan bir kategori silinemez',
            details: 'Lütfen önce alt kategorileri silin veya başka bir kategoriye taşıyın',
            childCount: categoryToDelete.children.length
          });
        }

        // Bu noktada kategoriyi silebiliriz
        await prisma.category.delete({
          where: { id: categoryToDelete.id }, // id kullanarak sil (daha güvenli)
        });

        console.log(`Kategori başarıyla silindi: ${slug}`);
        return res.status(200).json({ message: 'Kategori başarıyla silindi' });
      } catch (error: any) {
        console.error(`DELETE /api/categories/${slug} hatası:`, error);
        
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }
        
        if (error.code === 'P2003') {
          return res.status(400).json({ 
            error: 'İlişkili verilerden dolayı kategori silinemez',
            details: 'Bu kategoriye bağlı ürünler veya başka kayıtlar var'
          });
        }
        
        return res.status(500).json({ 
          error: 'Sunucu hatası', 
          details: error.message,
          code: error.code
        });
      }

    case 'PATCH':
      try {
        console.log(`PATCH /api/categories/${slug} isteği alındı`, req.body);
        const { isActive } = req.body;

        // isActive parametresi gönderilmişse, kategorinin aktiflik durumunu güncelle
        if (isActive !== undefined) {
          const updatedCategory = await prisma.category.update({
            where: { slug },
            data: {
              isActive: Boolean(isActive)
            }
          });
          return res.status(200).json({ 
            message: `Kategori durumu ${isActive ? 'aktif' : 'pasif'} olarak güncellendi`, 
            category: updatedCategory 
          });
        } else {
          return res.status(400).json({ error: 'Geçersiz işlem' });
        }
      } catch (error: any) {
        console.error(`PATCH /api/categories/${slug} hatası:`, error);
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Kategori bulunamadı' });
        }
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
      return res.status(405).json({ error: `Yöntem ${req.method} izin verilmez` });
  }
};

// withAdmin middleware'ini GET istekleri için kullanma, diğer istekler için kullan
const wrappedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    return handler(req, res);
  } else {
    // Diğer istekler için admin kontrolü
    return withAdmin(handler)(req, res);
  }
};

export default withErrorHandler(wrappedHandler);
