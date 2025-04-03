// pages/api/categories/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';
import { slugify } from '@/lib/slugify';

// Category tipi tanımla
interface Category {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  bannerUrl: string | null;
  parentId: number | null;
  parent?: Category | null;
  children?: Category[];
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  showInSlider: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  showInHeader: boolean;
  showInFooter: boolean;
  showInSidebar: boolean;
  productsPerPage: number;
  defaultSortOrder: string | null;
  customFilters: any;
  featuredProducts: any;
  createdAt: Date;
  updatedAt: Date;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET':
      try {
        // URL query parametrelerini al
        const { isFeatured, showInSlider } = req.query;
        console.log('Categories API query:', req.query);

        // Filtreleme koşulları
        const where: any = {};

        // Eğer isFeatured parametresi varsa
        if (isFeatured === 'true') {
          where.isFeatured = true;
          console.log('Filtering for featured categories only');
        } else if (isFeatured === 'false') {
          where.isFeatured = false;
        }
        
        // Eğer showInSlider parametresi varsa
        if (showInSlider === 'true') {
          where.showInSlider = true;
          console.log('Filtering for slider categories only');
        } else if (showInSlider === 'false') {
          where.showInSlider = false;
        }

        const categories = await prisma.category.findMany({
          where,
          include: {
            children: true,
            parent: true,
          },
          orderBy: {
            id: 'asc',
          }
        });
        
        console.log(`Found ${categories.length} categories matching criteria. Featured filter: ${isFeatured === 'true' ? 'YES' : 'NO'}, Slider filter: ${showInSlider === 'true' ? 'YES' : 'NO'}`);
        if (categories.length === 0 && isFeatured === 'true') {
          console.log('WARNING: No featured categories found. Check database records.');
        }
        if (categories.length === 0 && showInSlider === 'true') {
          console.log('WARNING: No slider categories found. Check database records.');
        }
        
        // Tarih formatlarını düzgün sağlama
        const formattedCategories = categories.map(category => ({
          ...category,
          createdAt: category.createdAt?.toISOString(),
          updatedAt: category.updatedAt?.toISOString(),
        }));

        return res.status(200).json(formattedCategories);
      } catch (error) {
        console.error('GET /api/categories error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

    case 'POST':
      try {
        const { 
          name, 
          description, 
          parentSlug, 
          slug, 
          seoTitle, 
          seoDescription,
          seoKeywords,
          bannerUrl,
          displayOrder, 
          isActive,
          isFeatured,
          showInSlider,
          isArchived,
          showInHeader,
          showInFooter,
          showInSidebar,
          productsPerPage,
          defaultSortOrder,
          customFilters,
          featuredProducts
        } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Kategori adı gerekli' });
        }

        // Slug oluşturma
        const categorySlug = slug || slugify(name);
        
        // Slug benzersizliğini kontrol etme
        const existingCategory = await prisma.category.findUnique({ 
          where: { slug: categorySlug } 
        });
        
        if (existingCategory) {
          return res.status(400).json({ error: 'Bu slug ile zaten bir kategori mevcut' });
        }

        // Parent ID bulma
        let parentId = null;
        if (parentSlug && parentSlug !== 'none') {
          const parentCategory = await prisma.category.findUnique({
            where: { slug: parentSlug },
          });

          if (!parentCategory) {
            return res.status(400).json({ error: 'Üst kategori bulunamadı' });
          }
          parentId = parentCategory.id;
        }

        // JSON alanlarını işleme
        let parsedCustomFilters = null;
        if (customFilters) {
          try {
            parsedCustomFilters = JSON.parse(customFilters);
          } catch (e) {
            return res.status(400).json({ error: 'Özel filtreler geçerli bir JSON formatında değil' });
          }
        }

        let parsedFeaturedProducts = null;
        if (featuredProducts) {
          try {
            parsedFeaturedProducts = JSON.parse(featuredProducts);
          } catch (e) {
            return res.status(400).json({ error: 'Öne çıkan ürünler geçerli bir JSON formatında değil' });
          }
        }

        const newCategory = await prisma.category.create({
          data: {
            name,
            description,
            slug: categorySlug,
            seoTitle,
            seoDescription,
            seoKeywords,
            bannerUrl,
            parentId: parentId,
            displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
            isActive: typeof isActive === 'boolean' ? isActive : true,
            isFeatured: typeof isFeatured === 'boolean' ? isFeatured : false,
            isArchived: typeof isArchived === 'boolean' ? isArchived : false,
            showInHeader: typeof showInHeader === 'boolean' ? showInHeader : false,
            showInFooter: typeof showInFooter === 'boolean' ? showInFooter : false,
            showInSidebar: typeof showInSidebar === 'boolean' ? showInSidebar : true,
            productsPerPage: typeof productsPerPage === 'number' ? productsPerPage : 12,
            defaultSortOrder,
            customFilters: parsedCustomFilters,
            featuredProducts: parsedFeaturedProducts,
            // @ts-ignore
            showInSlider: typeof showInSlider === 'boolean' ? showInSlider : false
          },
          include: {
            parent: true,
          }
        });

        return res.status(201).json(newCategory);
      } catch (error: any) {
        console.error('POST /api/categories error:', error);
        return res.status(500).json({ 
          error: 'Internal Server Error',
          details: error.message 
        });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

// withAdmin middleware'ini GET istekleri için kullanma, diğer istekler için kullan
const wrappedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    return handler(req, res);
  }
  return withAdmin(handler)(req, res);
};

export default withErrorHandler(wrappedHandler);
