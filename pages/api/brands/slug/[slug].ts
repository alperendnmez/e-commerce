// pages/api/brands/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { slugify } from '@/lib/slugify';

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  const { slug } = req.query as { slug: string };

  switch (req.method) {
    case 'GET':
      try {
        console.log(`GET /api/brands/${slug} isteği alındı`);
        const brand = await prisma.brand.findUnique({
          where: { slug }
        });

        if (!brand) {
          return res.status(404).json({ message: 'Marka bulunamadı' });
        }

        return res.status(200).json(brand);
      } catch (error) {
        console.error(`GET /api/brands/${slug} hatası:`, error);
        return res.status(500).json({ message: 'Sunucu hatası' });
      }

    case 'PUT':
      try {
        console.log(`PUT /api/brands/${slug} isteği alındı`, req.body);
        const { 
          name, 
          description, 
          content,
          logoUrl, 
          bannerUrl,
          coverImageUrl,
          isActive,
          displayOrder,
          isFeatured,
          seoTitle,
          seoDescription,
          seoKeywords,
          showInHeader,
          showInFooter,
          showInSidebar,
          productListingType,
          productsPerPage,
          defaultSortOrder,
          isArchived
        } = req.body;

        if (!name) {
          return res.status(400).json({ message: 'Marka adı gerekli' });
        }

        const newSlug = slugify(name);

        // Slug değişmişse ve başka bir marka bu slug'ı kullanıyorsa kontrol et
        if (newSlug !== slug) {
          const existingBrand = await prisma.brand.findUnique({
            where: { slug: newSlug }
          });

          if (existingBrand && existingBrand.slug !== slug) {
            return res.status(400).json({ message: 'Bu isimle başka bir marka zaten var' });
          }
        }

        // Arşivleme durumunu kontrol et
        const archivedAt = isArchived ? new Date() : null;

        const updatedBrand = await prisma.brand.update({
          where: { slug },
          data: {
            name,
            slug: newSlug,
            description: description || null,
            content: content || null,
            logoUrl: logoUrl || null,
            bannerUrl: bannerUrl || null,
            coverImageUrl: coverImageUrl || null,
            isActive: Boolean(isActive),
            displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
            isFeatured: Boolean(isFeatured),
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            seoKeywords: seoKeywords || null,
            showInHeader: Boolean(showInHeader),
            showInFooter: Boolean(showInFooter),
            showInSidebar: Boolean(showInSidebar),
            productListingType: productListingType || null,
            productsPerPage: typeof productsPerPage === 'number' ? productsPerPage : 12,
            defaultSortOrder: defaultSortOrder || null,
            isArchived: Boolean(isArchived),
            archivedAt
          }
        });

        console.log('Marka güncellendi:', updatedBrand);
        return res.status(200).json(updatedBrand);
      } catch (error) {
        console.error(`PUT /api/brands/${slug} hatası:`, error);
        if ((error as any).code === 'P2025') {
          return res.status(404).json({ message: 'Marka bulunamadı' });
        }
        return res.status(500).json({ message: 'Sunucu hatası' });
      }

    case 'DELETE':
      try {
        console.log(`DELETE /api/brands/${slug} isteği alındı`);
        await prisma.brand.delete({
          where: { slug }
        });

        return res.status(200).json({ message: 'Marka başarıyla silindi' });
      } catch (error) {
        console.error(`DELETE /api/brands/${slug} hatası:`, error);
        if ((error as any).code === 'P2025') {
          return res.status(404).json({ message: 'Marka bulunamadı' });
        }
        return res.status(500).json({ message: 'Sunucu hatası' });
      }

    // Arşivleme işlemi için yeni metod
    case 'PATCH':
      try {
        console.log(`PATCH /api/brands/${slug} isteği alındı`, req.body);
        const { action, isActive, logoUrl, isArchived, archivedAt } = req.body;

        // logoUrl parametresi gönderilmişse, markanın logosunu güncelle
        if (logoUrl !== undefined) {
          const updatedBrand = await prisma.brand.update({
            where: { slug },
            data: {
              logoUrl
            }
          });
          return res.status(200).json(updatedBrand);
        }
        // isArchived ve archivedAt parametreleri gönderilmişse, arşiv durumunu güncelle
        else if (isArchived !== undefined) {
          const updatedBrand = await prisma.brand.update({
            where: { slug },
            data: {
              isArchived,
              archivedAt: archivedAt || null
            }
          });
          return res.status(200).json(updatedBrand);
        }
        // isActive parametresi gönderilmişse, markanın aktiflik durumunu güncelle
        else if (isActive !== undefined) {
          const updatedBrand = await prisma.brand.update({
            where: { slug },
            data: {
              isActive: Boolean(isActive)
            }
          });
          return res.status(200).json({ 
            message: `Marka durumu ${isActive ? 'aktif' : 'pasif'} olarak güncellendi`, 
            brand: updatedBrand 
          });
        }
        // Arşivleme işlemleri
        else if (action === 'archive') {
          const updatedBrand = await prisma.brand.update({
            where: { slug },
            data: {
              isArchived: true,
              archivedAt: new Date()
            }
          });
          return res.status(200).json({ 
            message: 'Marka başarıyla arşivlendi', 
            brand: updatedBrand 
          });
        } 
        else if (action === 'unarchive') {
          const updatedBrand = await prisma.brand.update({
            where: { slug },
            data: {
              isArchived: false,
              archivedAt: null
            }
          });
          return res.status(200).json({ 
            message: 'Marka arşivden çıkarıldı', 
            brand: updatedBrand 
          });
        }
        else {
          return res.status(400).json({ message: 'Geçersiz işlem' });
        }
      } catch (error) {
        console.error(`PATCH /api/brands/${slug} hatası:`, error);
        if ((error as any).code === 'P2025') {
          return res.status(404).json({ message: 'Marka bulunamadı' });
        }
        return res.status(500).json({ message: 'Sunucu hatası' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
      return res.status(405).json({ message: `Metod ${req.method} izin verilmiyor` });
  }
}
