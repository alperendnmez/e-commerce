import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { slugify } from '@/lib/slugify';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    // Form verilerini parse et
    const form = new IncomingForm();
    
    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });
    
    // Dosya kontrolü
    if (!files.file) {
      return res.status(400).json({ message: 'Dosya yüklenmedi' });
    }
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const filePath = file.filepath;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // CSV dosyasını parse et
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });
    
    // İçe aktarma sonuçları
    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    // Her kayıt için işlem yap
    for (const record of records) {
      try {
        // Zorunlu alanları kontrol et
        if (!record.name) {
          results.failed++;
          results.errors.push(`Satır ${results.success + results.failed}: Marka adı gerekli`);
          continue;
        }
        
        // Slug oluştur
        const slug = record.slug || slugify(record.name);
        
        // Aynı slug ile marka var mı kontrol et
        const existingBrand = await prisma.brand.findUnique({
          where: { slug },
        });
        
        if (existingBrand) {
          // Mevcut markayı güncelle
          await prisma.brand.update({
            where: { slug },
            data: {
              name: record.name,
              description: record.description || null,
              content: record.content || null,
              logoUrl: record.logoUrl || null,
              bannerUrl: record.bannerUrl || null,
              coverImageUrl: record.coverImageUrl || null,
              isActive: record.isActive === 'true',
              isFeatured: record.isFeatured === 'true',
              displayOrder: parseInt(record.displayOrder || '0', 10),
              showInHeader: record.showInHeader === 'true',
              showInFooter: record.showInFooter === 'true',
              showInSidebar: record.showInSidebar === 'true',
              productListingType: record.productListingType || null,
              productsPerPage: parseInt(record.productsPerPage || '12', 10),
              defaultSortOrder: record.defaultSortOrder || null,
              seoTitle: record.seoTitle || null,
              seoDescription: record.seoDescription || null,
              seoKeywords: record.seoKeywords || null,
            },
          });
        } else {
          // Yeni marka oluştur
          await prisma.brand.create({
            data: {
              name: record.name,
              slug,
              description: record.description || null,
              content: record.content || null,
              logoUrl: record.logoUrl || null,
              bannerUrl: record.bannerUrl || null,
              coverImageUrl: record.coverImageUrl || null,
              isActive: record.isActive === 'true',
              isFeatured: record.isFeatured === 'true',
              displayOrder: parseInt(record.displayOrder || '0', 10),
              showInHeader: record.showInHeader === 'true',
              showInFooter: record.showInFooter === 'true',
              showInSidebar: record.showInSidebar === 'true',
              productListingType: record.productListingType || null,
              productsPerPage: parseInt(record.productsPerPage || '12', 10),
              defaultSortOrder: record.defaultSortOrder || null,
              seoTitle: record.seoTitle || null,
              seoDescription: record.seoDescription || null,
              seoKeywords: record.seoKeywords || null,
            },
          });
        }
        
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Satır ${results.success + results.failed}: ${error.message}`);
      }
    }
    
    // Geçici dosyayı temizle
    fs.unlinkSync(filePath);
    
    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Markalar içe aktarılırken hata:', error);
    return res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
} 