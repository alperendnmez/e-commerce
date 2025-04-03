import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { parse } from 'json2csv';

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    // Format parametresini al (varsayılan: json)
    const { format = 'json' } = req.query;
    
    // Tüm markaları getir
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    // Markaları işle
    const processedBrands = brands.map(brand => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      content: brand.content || '',
      logoUrl: brand.logoUrl || '',
      bannerUrl: brand.bannerUrl || '',
      coverImageUrl: brand.coverImageUrl || '',
      isActive: brand.isActive,
      isFeatured: brand.isFeatured,
      displayOrder: brand.displayOrder,
      showInHeader: brand.showInHeader,
      showInFooter: brand.showInFooter,
      showInSidebar: brand.showInSidebar,
      productListingType: brand.productListingType || '',
      productsPerPage: brand.productsPerPage,
      defaultSortOrder: brand.defaultSortOrder || '',
      seoTitle: brand.seoTitle || '',
      seoDescription: brand.seoDescription || '',
      seoKeywords: brand.seoKeywords || '',
      productCount: brand._count.products,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString()
    }));
    
    // İstenen formatta dışa aktar
    if (format === 'csv') {
      // CSV formatında dışa aktar
      const csv = parse(processedBrands);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=brands.csv');
      return res.status(200).send(csv);
    } else if (format === 'excel') {
      // Excel formatında dışa aktar (CSV olarak gönder, tarayıcı Excel olarak açabilir)
      const csv = parse(processedBrands);
      
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', 'attachment; filename=brands.xls');
      return res.status(200).send(csv);
    } else {
      // JSON formatında dışa aktar (varsayılan)
      return res.status(200).json(processedBrands);
    }
  } catch (error) {
    console.error('Markalar dışa aktarılırken hata:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
} 