import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

// Build a hierarchical category structure
const buildCategoryTree = (categories: any[], parentId: number | null = null): any[] => {
  return categories
    .filter(category => parentId === null ? !category.parentId : category.parentId === parentId)
    .filter(category => category.isActive) // Only include active categories
    .filter(category => category.showInHeader || category.showInSidebar) // Only include visible categories
    .map(category => ({
      ...category,
      children: buildCategoryTree(categories, category.id)
    }));
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET':
      try {
        const categories = await prisma.category.findMany({
          orderBy: [
            { displayOrder: 'asc' },
            { name: 'asc' }
          ],
        });
        
        // Convert dates to ISO strings for JSON serialization
        const formattedCategories = categories.map(category => ({
          ...category,
          createdAt: category.createdAt?.toISOString(),
          updatedAt: category.updatedAt?.toISOString(),
          archivedAt: category.archivedAt?.toISOString() || null,
        }));

        // For hierarchical structure
        const categoryTree = buildCategoryTree(formattedCategories);
        
        // For simple flat structure if needed
        const visibleCategories = formattedCategories.filter(
          cat => cat.isActive && (cat.showInHeader || cat.showInSidebar)
        );

        return res.status(200).json({
          categories: visibleCategories,
          categoryTree
        });
      } catch (error) {
        console.error('GET /api/public/categories error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
};

export default handler; 