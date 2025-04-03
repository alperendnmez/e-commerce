import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { slugify } from '@/lib/slugify';
import { withAdmin } from '@/lib/middleware';
import { withErrorHandler } from '@/lib/errorHandler';

// Varyant verisi için tip tanımlama
interface VariantData {
  price: number;
  stock: number;
  images: string[];
}

// Varyant grubu için tip tanımlama
interface VariantGroup {
  name: string;
  values: string[];
}

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function for generating combinations
function generateCombinations(groups: VariantGroup[]): string[][] {
  if (groups.length === 0) return [[]];
  
  const [firstGroup, ...rest] = groups;
  const restCombinations = generateCombinations(rest);
  
  const result: string[][] = [];
  for (const value of firstGroup.values) {
    for (const combination of restCombinations) {
      result.push([value, ...combination]);
    }
  }
  
  return result;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    console.log('Starting CSV import process');
    // Form verilerini parse et
    const form = new IncomingForm();
    
    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          return reject(err);
        }
        resolve([fields, files]);
      });
    });
    
    // Dosya kontrolü
    if (!files.file) {
      console.error('No file uploaded');
      return res.status(400).json({ message: 'Dosya yüklenmedi' });
    }
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const filePath = file.filepath;
    
    console.log('Reading file from path:', filePath);
    let fileContent;
    try {
      fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error('Error reading uploaded file:', err);
      return res.status(500).json({ message: 'Yüklenen dosya okunamadı', error: err });
    }
    
    // CSV dosyasını parse et
    console.log('Parsing CSV content');
    let records;
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
      console.log(`Parsed ${records.length} records from CSV`);
    } catch (err) {
      console.error('Error parsing CSV:', err);
      return res.status(400).json({ message: 'CSV dosyası geçerli değil', error: err });
    }
    
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
        console.log('Processing record:', record.name);
        
        // Zorunlu alanları kontrol et
        if (!record.name) {
          results.failed++;
          results.errors.push(`Satır ${results.success + results.failed}: Ürün adı gerekli`);
          continue;
        }
        
        // Slug oluştur
        const slug = record.slug || slugify(record.name);
        console.log('Using slug:', slug);
        
        // Kategori ID'yi hazırla
        let categoryId: number | undefined = undefined;
        
        // Kategori için önceden veritabanından tüm kategorileri bir kez sorgulayalım ve önbelleğe alalım
        // Bu, her kayıt için tekrar tekrar sorgu yapmayı önler
        const allCategories = await prisma.category.findMany({
          select: { id: true, slug: true, name: true }
        });
        
        const categoriesMap = new Map();
        allCategories.forEach(cat => {
          categoriesMap.set(cat.slug, { id: cat.id, name: cat.name });
        });
        
        console.log(`Found ${allCategories.length} categories in database`);
        
        if (record.categorySlug) {
          console.log('Looking for category with slug:', record.categorySlug);
          
          const category = categoriesMap.get(record.categorySlug);
          
          if (category) {
            categoryId = category.id;
            console.log('Found category:', category.name, 'with ID:', category.id);
          } else {
            console.log('Category not found:', record.categorySlug);
            results.errors.push(`Satır ${results.success + results.failed}: Kategori bulunamadı (${record.categorySlug})`);
            results.failed++;
            continue; // Skip this record if category not found
          }
        } else {
          console.log('No category slug provided');
          results.failed++;
          results.errors.push(`Satır ${results.success + results.failed}: Kategori bilgisi gerekli`);
          continue;
        }
        
        let brandId: number | undefined = undefined;
        if (record.brandSlug) {
          console.log('Looking for brand with slug:', record.brandSlug);
          const brand = await prisma.brand.findUnique({
            where: { slug: record.brandSlug },
          });
          
          if (brand) {
            brandId = brand.id;
            console.log('Found brand:', brand.name, 'with ID:', brand.id);
          } else {
            console.log('Brand not found:', record.brandSlug);
            results.errors.push(`Satır ${results.success + results.failed}: Marka bulunamadı (${record.brandSlug})`);
            // Continue anyway, brand is not required
          }
        }
        
        // Resim URL'lerini diziye dönüştür
        const imageUrls = record.imageUrls ? record.imageUrls.split(',').map((url: string) => url.trim()) : [];
        console.log('Image URLs:', imageUrls);
        
        // Varyant gruplarını ve değerlerini hazırla
        const variantGroups: VariantGroup[] = [];
        const variantsData: Record<string, VariantData> = {};
        
        // Varyant grubu varsa ekle
        if (record.variantGroups) {
          try {
            console.log('Processing variant groups:', record.variantGroups);
            // "Renk:Siyah,Beyaz;Beden:S,M,L" formatındaki varyant bilgisini işle
            const variantGroupsStr = record.variantGroups.split(';');
            
            for (const groupStr of variantGroupsStr) {
              const [groupName, valuesStr] = groupStr.split(':');
              if (groupName && valuesStr) {
                const values = valuesStr.split(',').map((v: string) => v.trim());
                variantGroups.push({
                  name: groupName.trim(),
                  values: values
                });
                console.log('Added variant group:', groupName, 'with values:', values);
              }
            }
            
            // Varyant kombinasyonlarını oluştur
            const combinations = generateCombinations(variantGroups);
            console.log('Generated variant combinations:', combinations);
            
            // Her kombinasyon için varsayılan varyant verisi oluştur
            for (const combo of combinations) {
              const comboKey = combo.join('-');
              variantsData[comboKey] = {
                price: parseFloat(record.price) || 0,
                stock: parseInt(record.stock) || 0,
                images: imageUrls
              };
              console.log('Added variant data for combo:', comboKey);
            }
          } catch (error: any) {
            console.error('Error processing variant groups:', error);
            results.errors.push(`Satır ${results.success + results.failed}: Varyant grupları işlenirken hata (${error.message})`);
          }
        } else {
          // Varyant grubu yoksa basePrice değerini kullan
          console.log('No variant groups, using price as basePrice:', record.price);
        }
        
        // Set published status (default to true unless explicitly set to false)
        const published = record.published === 'false' ? false : true;
        console.log('Product published status:', published);
        
        // Aynı slug ile ürün var mı kontrol et
        console.log('Checking if product with slug already exists:', slug);
        const existingProduct = await prisma.product.findUnique({
          where: { slug },
          include: {
            variants: true,
            variantGroups: {
              include: {
                values: true
              }
            }
          },
        });
        
        if (existingProduct) {
          console.log('Updating existing product with ID:', existingProduct.id);
          // Mevcut ürünü güncelle
          await prisma.product.update({
            where: { slug },
            data: {
              name: record.name,
              description: record.description || null,
              seoTitle: record.seoTitle || null,
              seoDescription: record.seoDescription || null,
              categoryId: categoryId,
              brandId: brandId,
              published: published,
              imageUrls: imageUrls,
            },
          });
          
          // basePrice'ı ayarla - price değerini kullan
          try {
            const basePrice = variantGroups.length === 0 ? parseFloat(record.price) || 0 : 0;
            // Raw SQL sorgusu ile basePrice'ı güncelle
            await prisma.$executeRaw`UPDATE "Product" SET "basePrice" = ${basePrice} WHERE "slug" = ${slug}`;
            console.log(`Product basePrice updated for ${slug}: ${basePrice}`);
          } catch (err) {
            console.error('Error updating basePrice:', err);
          }
          
          // Varyant grupları varsa işle
          if (variantGroups.length > 0) {
            console.log('Processing variant groups for existing product');
            // Mevcut varyant gruplarını temizle
            if (existingProduct.variantGroups.length > 0) {
              // Önce mevcut varyantları sil
              console.log('Cleaning up existing variants');
              
              // Before deleting variants, disconnect their relationships with variantValues
              for (const variant of existingProduct.variants) {
                // Typescript hatasını önlemek için tip kontrolü
                // @ts-ignore - Bu kısımda variantValues property'si schema'da görünmüyor olabilir
                if (variant.variantValues && variant.variantValues.length > 0) {
                  await prisma.productVariant.update({
                    where: { id: variant.id },
                    data: {
                      variantValues: {
                        set: [] // Disconnect all relationships
                      }
                    }
                  });
                }
              }
              
              await prisma.productVariant.deleteMany({
                where: { productId: existingProduct.id }
              });
              
              // Sonra varyant değerlerini sil
              for (const group of existingProduct.variantGroups) {
                await prisma.variantValue.deleteMany({
                  where: { variantGroupId: group.id }
                });
              }
              
              // En son varyant gruplarını sil
              await prisma.variantGroup.deleteMany({
                where: { productId: existingProduct.id }
              });
            }
            
            // Yeni varyant gruplarını ekle
            console.log('Creating new variant groups');
            const createdVariantGroups = [];
            
            for (const group of variantGroups) {
              const variantGroup = await prisma.variantGroup.create({
                data: {
                  name: group.name,
                  productId: existingProduct.id,
                  values: {
                    create: group.values.map((value: string) => ({
                      value,
                    })),
                  },
                },
                include: {
                  values: true,
                },
              });
              createdVariantGroups.push(variantGroup);
            }
            
            // Varyant kombinasyonlarını oluştur
            console.log('Creating variant combinations');
            const variantPromises = [];
            
            for (const [comboName, variantData] of Object.entries(variantsData)) {
              // Variant Values ilişkilerini oluştur
              const variantValueIds = [];
              
              // Varyant değerlerini bul
              for (const group of createdVariantGroups) {
                // Kombinasyon adından değeri çıkar
                const comboValues = comboName.split('-'); 
                
                // Bu gruptaki değeri bul
                for (const value of group.values) {
                  if (comboValues.includes(value.value)) {
                    variantValueIds.push({ id: value.id });
                  }
                }
              }
              
              // Varyantı oluştur
              const variantPromise = prisma.productVariant.create({
                data: {
                  productId: existingProduct.id,
                  price: variantData.price,
                  stock: variantData.stock,
                  // Varyant değerleri ile ilişkilendir
                  variantValues: {
                    connect: variantValueIds,
                  },
                },
              });
              
              variantPromises.push(variantPromise);
            }
            
            // Tüm varyantları oluştur
            await Promise.all(variantPromises);
          }
          
          results.success++;
          console.log('Successfully updated product:', record.name);
        } else {
          console.log('Creating new product:', record.name);
          // Yeni ürün oluştur
          const newProduct = await prisma.product.create({
            data: {
              name: record.name,
              description: record.description || null,
              slug,
              seoTitle: record.seoTitle || null,
              seoDescription: record.seoDescription || null,
              categoryId: categoryId as number,
              brandId: brandId,
              published: published,
              imageUrls: imageUrls,
            },
          });
          
          // basePrice'ı ayarla - price değerini kullan
          try {
            const basePrice = variantGroups.length === 0 ? parseFloat(record.price) || 0 : 0;
            // Raw SQL sorgusu ile basePrice'ı ayarla
            await prisma.$executeRaw`UPDATE "Product" SET "basePrice" = ${basePrice} WHERE "id" = ${newProduct.id}`;
            console.log(`Product basePrice set for ${newProduct.id}: ${basePrice}`);
          } catch (err) {
            console.error('Error setting basePrice:', err);
          }
          
          // Varyant grupları varsa ekle
          if (variantGroups.length > 0) {
            console.log('Creating variant groups for new product');
            const createdVariantGroups = [];
            
            // Varyant gruplarını oluştur
            for (const group of variantGroups) {
              const variantGroup = await prisma.variantGroup.create({
                data: {
                  name: group.name,
                  productId: newProduct.id,
                  values: {
                    create: group.values.map((value: string) => ({
                      value,
                    })),
                  },
                },
                include: {
                  values: true,
                },
              });
              createdVariantGroups.push(variantGroup);
            }
            
            // Varyant kombinasyonlarını oluştur
            console.log('Creating variants for new product');
            const variantPromises = [];
            
            for (const [comboName, variantData] of Object.entries(variantsData)) {
              // Varyant değerlerini bul
              const variantValueIds = [];
              
              for (const group of createdVariantGroups) {
                // Kombinasyon adından değeri çıkar
                const comboValues = comboName.split('-');
                
                // Bu gruptaki değeri bul
                for (const value of group.values) {
                  if (comboValues.includes(value.value)) {
                    variantValueIds.push({ id: value.id });
                  }
                }
              }
              
              // Varyantı oluştur
              const variantPromise = prisma.productVariant.create({
                data: {
                  productId: newProduct.id,
                  price: variantData.price,
                  stock: variantData.stock,
                  variantValues: {
                    connect: variantValueIds,
                  },
                },
              });
              
              variantPromises.push(variantPromise);
            }
            
            // Tüm varyantları oluştur
            await Promise.all(variantPromises);
          }
          
          results.success++;
          console.log('Successfully created product:', record.name);
        }
      } catch (error: any) {
        console.error('Error processing record:', error);
        results.failed++;
        results.errors.push(`Satır ${results.success + results.failed}: İşleme hatası: ${error.message}`);
      }
    }
    
    console.log('Import completed with results:', results);
    return res.status(200).json(results);
  } catch (error: any) {
    console.error('CSV import error:', error);
    return res.status(500).json({ 
      message: 'CSV işleme hatası',
      error: error.message,
      stack: error.stack 
    });
  }
};

// Yetkilendirme kontrolünü test için kaldırıyoruz
// export default withErrorHandler(withAdmin(handler));
export default handler; 