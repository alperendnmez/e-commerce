export interface CompareItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  categorySlug: string;
  imageUrls?: string[];
  attributes?: { [key: string]: string };
} 