import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { uploadToS3 } from '@/lib/s3';

// formidable options
export const config = {
  api: {
    bodyParser: false,
  },
};

// Local file upload function as fallback when S3/R2 is not configured
const uploadToLocal = async (fileData: Buffer, fileName: string): Promise<string> => {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Save file to local filesystem
  const filePath = path.join(uploadsDir, fileName);
  await fs.promises.writeFile(filePath, fileData);
  
  // Return the URL path that can be accessed from the browser
  return `/uploads/${fileName}`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('Logo yükleme isteği alındı');
    
    // Formidable ile dosyayı parse et
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parse hatası:', err);
          reject(err);
        }
        resolve([fields, files]);
      });
    });
    
    // Dosya kontrolü
    const fileArray = files.file;
    if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
      console.error('Dosya bulunamadı');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = fileArray[0];
    console.log('Yüklenen logo:', file.originalFilename, 'boyut:', file.size, 'tip:', file.mimetype);
    
    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
      console.error('Geçersiz dosya tipi:', file.mimetype);
      return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
    }
    
    // Dosya boyutu kontrolü (10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('Dosya boyutu çok büyük:', file.size);
      return res.status(400).json({ error: 'File size too large. Maximum 10MB allowed.' });
    }
    
    // Görsel optimizasyonu için parametreleri al
    const widthArray = fields.width;
    const heightArray = fields.height;
    const qualityArray = fields.quality;
    
    const width = Array.isArray(widthArray) && widthArray.length > 0 ? parseInt(widthArray[0]) || 200 : 200;
    const height = Array.isArray(heightArray) && heightArray.length > 0 ? parseInt(heightArray[0]) || 200 : 200;
    const quality = Array.isArray(qualityArray) && qualityArray.length > 0 ? parseInt(qualityArray[0]) || 90 : 90;
    
    console.log('Logo parametreleri:', { width, height, quality });
    
    try {
      // Dosyayı oku
      const fileData = fs.readFileSync(file.filepath);
      
      // Dosya adını oluştur
      const fileExt = path.extname(file.originalFilename || 'logo.jpg').toLowerCase();
      const fileName = `logo-${uuidv4()}${fileExt}`;
      const key = `uploads/logos/${fileName}`;
      
      // MIME tipini belirle
      let contentType = 'image/jpeg';
      if (fileExt === '.png') {
        contentType = 'image/png';
      } else if (fileExt === '.webp') {
        contentType = 'image/webp';
      } else if (fileExt === '.gif') {
        contentType = 'image/gif';
      } else if (fileExt === '.svg') {
        contentType = 'image/svg+xml';
      }
      
      // Görsel optimizasyonu yap (SVG hariç Sharp kullanarak)
      let optimizedBuffer = fileData;
      
      if (fileExt !== '.svg' && width && height) {
        console.log(`Logo boyutlandırılıyor: ${width}x${height}`);
        
        // Sharp ile görsel işleme
        optimizedBuffer = await sharp(fileData)
          .resize(width, height, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .toFormat(fileExt.replace('.', '') as any, { quality: quality })
          .toBuffer();
      }
      
      let uploadedUrl;
      
      try {
        // S3/R2'ye yüklemeyi dene
        console.log('Logo Cloudflare R2/S3\'e yükleniyor:', key);
        
        // Base64 formatında görsel verisi oluştur (S3 için)
        const base64Image = `data:${contentType};base64,${optimizedBuffer.toString('base64')}`;
        
        uploadedUrl = await uploadToS3(base64Image, key);
        console.log('Logo başarıyla S3/R2\'ye yüklendi:', uploadedUrl);
      } catch (s3Error) {
        // S3 yüklemesi başarısız olursa, yerel dosya sistemine yükle
        console.log('S3/R2 yüklemesi başarısız, yerel dosya sistemine yükleniyor:', s3Error);
        uploadedUrl = await uploadToLocal(optimizedBuffer, fileName);
        console.log('Logo başarıyla yerel dosya sistemine yüklendi:', uploadedUrl);
      }
      
      // Geçici dosyayı temizle
      try {
        fs.unlinkSync(file.filepath);
        console.log('Geçici dosya temizlendi');
      } catch (err) {
        console.error('Geçici dosya temizlenirken hata:', err);
        // Bu hatayı yok sayabiliriz, işlemi durdurmayalım
      }
      
      // Başarılı yanıt
      console.log('Logo yükleme başarılı, URL:', uploadedUrl);
      return res.status(200).json({
        url: uploadedUrl,
        fileName,
        width,
        height,
        originalName: file.originalFilename,
        size: file.size
      });
    } catch (err) {
      console.error('Logo işleme veya yükleme sırasında hata:', err);
      return res.status(500).json({ 
        error: 'Error processing or uploading logo',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  } catch (error) {
    console.error('Logo yükleme hatası:', error);
    return res.status(500).json({ 
      error: 'Error uploading logo file',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 