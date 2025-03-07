import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { slugify } from '@/lib/slugify';
import { withAdmin } from '@/lib/middleware';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET': // Herkes için açık
      try {
        const products = await prisma.product.findMany({
          include: {
            category: true,
            brand: true,
            variants: {
              include: {
                variantValues: true, // Variant değerlerini ekledik
              },
            },
            variantGroups: {
              include: {
                values: true, // Variant gruplarındaki değerleri ekledik
              },
            },
          },
        });
        res.status(200).json(products);
      } catch (error) {
        console.error('GET /api/products hatası:', error);
        res.status(500).json({ error: 'Ürünler alınırken hata oluştu.' });
      }
      break;

    case 'POST': // Sadece admin kullanıcılar için
      try {
        const { name, description, seoTitle, seoDescription, brandId, categoryId } = req.body;

        if (!name || !brandId || !categoryId) {
          return res.status(400).json({ error: 'Tüm alanlar doldurulmalıdır.' });
        }

        const newProduct = await prisma.product.create({
          data: {
            name,
            slug: slugify(name),
            description,
            seoTitle,
            seoDescription,
            brandId,
            categoryId,
            published: false, // Varsayılan olarak false
          },
        });

        res.status(201).json(newProduct);
      } catch (error) {
        console.error('POST /api/products hatası:', error);
        res.status(500).json({ error: 'Ürün eklenirken hata oluştu.' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Yöntem ${req.method} izin verilmez.` });
  }
};

export default async function middlewareHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return withAdmin(handler)(req, res); // POST işlemini adminlere sınırlıyoruz
  }
  return handler(req, res); // GET işlemini herkes kullanabilir
}
