// pages/api/brands/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { slugify } from '@/lib/slugify';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      try {
        console.log('GET /api/brands isteği alındı');
        
        // Filtreleme parametrelerini al
        const { 
          search, 
          sortBy = 'name', 
          sortOrder = 'asc',
          isFeatured,
          isActive,
          createdAfter,
          createdBefore,
          minProducts,
          maxProducts
        } = req.query;
        
        // Filtreleme koşullarını oluştur
        const where: any = {};
        
        // Arama filtresi
        if (search) {
          where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
            { seoKeywords: { contains: search as string, mode: 'insensitive' } }
          ];
        }
        
        // Öne çıkan filtresi
        if (isFeatured === 'true') {
          where.isFeatured = true;
        } else if (isFeatured === 'false') {
          where.isFeatured = false;
        }
        
        // Aktif/pasif filtresi
        if (isActive === 'true') {
          where.isActive = true;
        } else if (isActive === 'false') {
          where.isActive = false;
        }
        
        // Oluşturulma tarihi filtresi
        if (createdAfter || createdBefore) {
          where.createdAt = {};
          
          if (createdAfter) {
            where.createdAt.gte = new Date(createdAfter as string);
          }
          
          if (createdBefore) {
            where.createdAt.lte = new Date(createdBefore as string);
          }
        }
        
        // Arşivlenmiş markaları hariç tut
        where.isArchived = false;
        
        // Sıralama seçeneklerini belirle
        let orderBy: any;
        
        // Geçerli sıralama alanlarını kontrol et
        const validSortFields = ['name', 'createdAt', 'updatedAt', 'displayOrder'];
        const validSortField = validSortFields.includes(sortBy as string) ? sortBy : 'name';
        
        // Sıralama yönünü belirle
        const validSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
        
        // Öne çıkan markaları her zaman önce göster
        if (validSortField !== 'displayOrder') {
          // İki sıralama kriterini bir dizi olarak gönder
          orderBy = [
            { isFeatured: 'desc' },
            { [validSortField as string]: validSortOrder }
          ];
        } else {
          // Sadece bir sıralama kriterini bir dizi olarak gönder
          orderBy = [
            { [validSortField as string]: validSortOrder }
          ];
        }
        
        // Debug için konsola yazdır
        console.log('OrderBy parametresi:', JSON.stringify(orderBy));
        console.log('Where koşulu:', JSON.stringify(where));
        
        // Markaları getir
        let brands = await prisma.brand.findMany({
          where,
          orderBy,
          include: {
            _count: {
              select: {
                products: true
              }
            }
          }
        });
        
        // Ürün sayısına göre filtreleme (veritabanı seviyesinde yapılamıyor)
        if (minProducts || maxProducts) {
          brands = brands.filter(brand => {
            const productCount = brand._count.products;
            
            if (minProducts && productCount < parseInt(minProducts as string, 10)) {
              return false;
            }
            
            if (maxProducts && productCount > parseInt(maxProducts as string, 10)) {
              return false;
            }
            
            return true;
          });
        }
        
        // Hassas verileri temizle
        const cleanedBrands = brands.map(brand => ({
          ...brand,
          productCount: brand._count.products,
          _count: undefined
        }));
        
        console.log(`${cleanedBrands.length} marka bulundu`);
        return res.status(200).json(cleanedBrands);
      } catch (error) {
        console.error('GET /api/brands hatası:', error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    case 'POST':
      try {
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
          defaultSortOrder
        } = req.body;

        console.log('POST /api/brands isteği alındı:', req.body);

        if (!name) {
          return res.status(400).json({ error: 'Marka adı gerekli' });
        }

        // Slug oluştur
        const slug = slugify(name);

        // Aynı slug ile marka var mı kontrol et
        const existingBrand = await prisma.brand.findUnique({
          where: { slug },
        });

        if (existingBrand) {
          return res.status(400).json({ error: 'Bu isimde bir marka zaten var' });
        }

        // Yeni marka oluştur
        const newBrand = await prisma.brand.create({
          data: {
            name,
            slug,
            description: description || null,
            content: content || null,
            logoUrl: logoUrl || null,
            bannerUrl: bannerUrl || null,
            coverImageUrl: coverImageUrl || null,
            isActive: isActive !== false,
            displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
            isFeatured: isFeatured === true,
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            seoKeywords: seoKeywords || null,
            showInHeader: showInHeader !== false,
            showInFooter: showInFooter === true,
            showInSidebar: showInSidebar !== false,
            productListingType: productListingType || null,
            productsPerPage: typeof productsPerPage === 'number' ? productsPerPage : 12,
            defaultSortOrder: defaultSortOrder || null
          },
        });

        console.log('Yeni marka oluşturuldu:', newBrand);
        return res.status(201).json(newBrand);
      } catch (error) {
        console.error('POST /api/brands hatası:', error);
        return res.status(500).json({ error: 'Sunucu hatası' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
