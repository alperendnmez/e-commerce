import { GetServerSideProps } from 'next';
import MainLayout from '@/components/layouts/MainLayout';
import { NextPageWithLayout } from '@/lib/types';
import React, { ReactElement } from 'react';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  children: Category[];
};

type Props = {
  rootCategories: Category[];
};

const KategorilerPage: NextPageWithLayout<Props> = ({ rootCategories }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Kategoriler</h1>
        <p className="text-gray-600">Tüm ürün kategorilerimizi keşfedin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rootCategories.map((category) => (
          <div key={category.id} className="border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md">
            <Link href={`/kategoriler/${category.slug}`} className="block">
              <div className="relative h-48 w-full">
                <Image
                  src={category.imageUrl || category.bannerUrl || '/placeholder-category.jpg'}
                  alt={category.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
                <div className="absolute bottom-0 p-4 w-full">
                  <h2 className="text-white text-xl font-bold">{category.name}</h2>
                  {category.description && (
                    <p className="text-white/80 text-sm mt-1 line-clamp-2">{category.description}</p>
                  )}
                </div>
              </div>
            </Link>

            {category.children.length > 0 && (
              <div className="p-4">
                <h3 className="font-medium mb-2">Alt Kategoriler</h3>
                <div className="grid grid-cols-2 gap-2">
                  {category.children.map((subCategory) => (
                    <Link
                      key={subCategory.id}
                      href={`/kategoriler/${subCategory.slug}`}
                      className="text-sm hover:text-primary hover:underline"
                    >
                      {subCategory.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    // Ana kategorileri ve alt kategorileri al
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        iconUrl: true,
        bannerUrl: true,
        parentId: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // Kategori ağacını oluştur
    const buildCategoryTree = (categories: any[], parentId: number | null = null): any[] => {
      return categories
        .filter(category => parentId === null ? !category.parentId : category.parentId === parentId)
        .map(category => ({
          ...category,
          children: buildCategoryTree(categories, category.id),
        }));
    };

    const rootCategories = buildCategoryTree(categories);

    return {
      props: {
        rootCategories: JSON.parse(JSON.stringify(rootCategories)),
      },
    };
  } catch (error) {
    console.error('Error loading categories:', error);
    return {
      props: {
        rootCategories: [],
      },
    };
  }
};

KategorilerPage.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

export default KategorilerPage; 