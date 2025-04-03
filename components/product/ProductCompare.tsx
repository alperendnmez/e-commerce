import { useState, useEffect } from 'react';
import { X, ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  imageUrl: string;
  attributes: Record<string, any>;
  inStock: boolean;
}

interface ProductCompareProps {
  products: Product[];
  compareAttributes: string[];
  onClose: () => void;
  onRemoveProduct: (productId: number) => void;
  maxCompareProducts: number;
}

export default function ProductCompare({
  products,
  compareAttributes,
  onClose,
  onRemoveProduct,
  maxCompareProducts = 4
}: ProductCompareProps) {
  const { toast } = useToast();
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  // Karşılaştırma tablosunu oluştur
  const renderComparisonTable = () => {
    if (!products || products.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-muted-foreground">Karşılaştırılacak ürün eklenmemiş.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Özellik</TableHead>
              {products.map((product) => (
                <TableHead key={product.id} className="min-w-[200px]">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-secondary"
                      onClick={() => onRemoveProduct(product.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="flex flex-col items-center space-y-2 py-2">
                      <div className="relative h-32 w-32">
                        <Image
                          src={product.imageUrl || '/placeholder.png'}
                          alt={product.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <Link href={`/urunler/${product.slug}`} className="text-center font-medium hover:underline">
                        {product.name}
                      </Link>
                      <div className="flex items-center space-x-2">
                        {product.salePrice ? (
                          <>
                            <span className="text-lg font-bold">{product.salePrice.toLocaleString('tr-TR')} ₺</span>
                            <span className="text-sm text-muted-foreground line-through">
                              {product.price.toLocaleString('tr-TR')} ₺
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold">{product.price.toLocaleString('tr-TR')} ₺</span>
                        )}
                      </div>
                      <Badge variant={product.inStock ? "default" : "secondary"}>
                        {product.inStock ? "Stokta" : "Stokta Yok"}
                      </Badge>
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {compareAttributes.map((attr) => (
              <TableRow key={attr}>
                <TableCell className="font-medium">{attr}</TableCell>
                {products.map((product) => (
                  <TableCell key={`${product.id}-${attr}`}>
                    {product.attributes && product.attributes[attr] 
                      ? product.attributes[attr] 
                      : "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Karşılaştırma bağlantısını paylaş
  const shareComparison = (method: 'copy' | 'whatsapp' | 'twitter' | 'facebook') => {
    const productIds = products.map(p => p.id).join(',');
    const compareUrl = `${window.location.origin}/karsilastir?ids=${productIds}`;
    
    switch (method) {
      case 'copy':
        navigator.clipboard.writeText(compareUrl).then(() => {
          toast({
            title: "Bağlantı kopyalandı",
            description: "Karşılaştırma bağlantısı panoya kopyalandı.",
          });
        });
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`Ürün karşılaştırması: ${compareUrl}`)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Ürün karşılaştırması: ${compareUrl}`)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(compareUrl)}`, '_blank');
        break;
    }
    
    setIsShareMenuOpen(false);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold">Ürün Karşılaştırma</h2>
            <Badge variant="outline">{products.length}/{maxCompareProducts}</Badge>
          </div>
          
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center space-x-1"
              onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
            >
              <Share2 className="h-4 w-4" />
              <span>Paylaş</span>
            </Button>
            
            {isShareMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => shareComparison('copy')}
                  >
                    Bağlantıyı Kopyala
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => shareComparison('whatsapp')}
                  >
                    WhatsApp ile Paylaş
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => shareComparison('twitter')}
                  >
                    Twitter ile Paylaş
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => shareComparison('facebook')}
                  >
                    Facebook ile Paylaş
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {renderComparisonTable()}
        
        {products.length < maxCompareProducts && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {maxCompareProducts - products.length} ürün daha ekleyebilirsiniz
            </p>
            <Link href="/urunler">
              <Button variant="outline">Ürün Ekle</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 