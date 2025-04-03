import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import { stockService } from '@/services/stockService';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const { variantId, quantity, sessionId, userId } = req.body;

  // Make sure variantId is always properly converted to a number
  const parsedVariantId = typeof variantId === 'string' ? parseInt(variantId) : Number(variantId);
  const parsedQuantity = typeof quantity === 'string' ? parseInt(quantity) : Number(quantity);

  console.log('[API] /api/stock/reserve - Request body:', {
    variantId: parsedVariantId, 
    variantIdType: typeof parsedVariantId,
    quantity: parsedQuantity, 
    quantityType: typeof parsedQuantity,
    sessionId: sessionId?.slice(0, 8) + '...', // ID'nin tamamını loglamayalım
    hasUserId: !!userId
  });

  if (!parsedVariantId || isNaN(parsedVariantId) || parsedVariantId <= 0) {
    console.error('[API] Invalid variantId in request body:', variantId);
    return res.status(400).json({ success: false, message: 'Valid variantId is required.' });
  }

  if (!parsedQuantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
    console.error('[API] Invalid quantity:', quantity);
    return res.status(400).json({ success: false, message: 'Invalid quantity.' });
  }

  if (!sessionId) {
    console.error('[API] Missing sessionId in request body');
    return res.status(400).json({ success: false, message: 'sessionId is required for guest users.' });
  }

  try {
    // Oturum kontrolü - Kullanıcı oturum açmış mı?
    const session = await getServerSession(req, res, authOptions);
    console.log('[API] Session data:', { 
      hasSession: !!session, 
      hasUserId: !!session?.user?.id
    });
    
    // Request body değerlerini kontrol et
    console.log('[API] Tüm request body:', {
      ...req.body,
      sessionId: req.body.sessionId ? `${req.body.sessionId.slice(0, 8)}...` : 'yok'
    });
    
    // SessionId kontrolü
    if (!sessionId) {
      console.error('[API] sessionId request body içinde bulunamadı - bu değer gerekli');
      return res.status(400).json({ 
        success: false, 
        message: 'sessionId parametresi zorunludur',
        requestData: {
          ...req.body,
          sessionId: req.body.sessionId ? `${req.body.sessionId.slice(0, 8)}...` : 'yok'
        }
      });
    }
    
    const authenticatedUserId = session?.user?.id ? parseInt(session.user.id) : undefined;

    // Kullanıcı oturum açmışsa, istek içindeki kullanıcı ID'sini doğrula
    if (authenticatedUserId && userId && authenticatedUserId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized operation' 
      });
    }

    // Varyantı kontrol et
    try {
      console.log('[API] Finding variant with ID:', parsedVariantId, 'Type:', typeof parsedVariantId);
      
      // Varyant ID'sinin geçerli bir sayı olduğunu doğrula
      if (isNaN(parsedVariantId) || parsedVariantId <= 0) {
        console.error(`[API] Invalid variant ID format: ${parsedVariantId} (${typeof parsedVariantId})`);
        return res.status(400).json({ 
          success: false, 
          message: `Invalid variant ID format: ${parsedVariantId}` 
        });
      }
      
      // Varyant tablosundan ilk kaydı al ve ID tipini kontrol et
      try {
        const firstVariant = await prisma.productVariant.findFirst({
          select: { id: true }
        });
        console.log('[API] ProductVariant first ID:', firstVariant?.id, 'Type:', firstVariant?.id ? typeof firstVariant.id : 'unknown');
      } catch (checkErr) {
        console.error('[API] Error checking variant ID type:', checkErr);
      }
      
      const variant = await prisma.productVariant.findUnique({
        where: { id: parsedVariantId },
        include: { product: { select: { name: true } } }
      });

      if (!variant) {
        console.error(`[API] Variant not found: ${parsedVariantId} (${typeof parsedVariantId})`);
        
        // Varyant ID'sine yakın kayıtları ara
        const closestVariants = await prisma.productVariant.findMany({
          take: 5,
          orderBy: {
            id: 'asc'
          },
          include: {
            product: { select: { name: true } }
          }
        });
        
        console.log('[API] Closest variant IDs in database:', 
          closestVariants.map(v => `ID: ${v.id} (${typeof v.id}) - Product: ${v.product.name}`));
        
        return res.status(404).json({ 
          success: false, 
          message: `Variant with ID ${parsedVariantId} not found.` 
        });
      }

      console.log(`[API] Found variant: ${variant.id} (${typeof variant.id}) for product: ${variant.product.name}, stock: ${variant.stock}`);
    } catch (err) {
      console.error(`[API] Error finding variant:`, err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error validating variant.' 
      });
    }

    // Geçerli kullanıcı ID'si
    const effectiveUserId = authenticatedUserId || userId;
    console.log('[API] Effective user ID:', effectiveUserId);

    // Varyant ID'si ile stok kontrolü yap
    console.log('[API] Checking stock for variant:', parsedVariantId, 'Quantity:', parsedQuantity);
    const hasStock = await stockService.checkVariantStock(Number(parsedVariantId), Number(parsedQuantity));
    
    if (!hasStock) {
      return res.status(200).json({ success: false, message: 'Not enough stock available.' });
    }
    
    // Stok rezervasyonu oluştur
    console.log('[API] Creating stock reservation with data:', {
      variantId: Number(parsedVariantId),
      quantity: Number(parsedQuantity),
      sessionId: sessionId?.slice(0, 8) + '...',
      userId: effectiveUserId
    });
    
    try {
      const result = await stockService.createReservation(
        Number(parsedVariantId),
        Number(parsedQuantity),
        sessionId,
        effectiveUserId
      );
      
      if (!result.success) {
        console.error('[API] Reservation creation failed:', result.message);
        return res.status(200).json({ success: false, message: result.message });
      }
      
      return res.status(200).json({ 
        success: true, 
        reservationId: result.reservationId,
        message: 'Stock reserved successfully.' 
      });
    } catch (reservationError) {
      console.error('[API] Caught error during stockService.createReservation:', reservationError);
      
      if (reservationError instanceof Error) {
        console.error('[API] Error details:', reservationError.message);
        console.error('[API] Error stack:', reservationError.stack);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create stock reservation',
        details: reservationError instanceof Error ? reservationError.stack : String(reservationError)
      });
    }
  } catch (error) {
    console.error('[API] Error in stock reservation:', error);
    
    let errorMessage = 'An error occurred during stock reservation.';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    return res.status(500).json({ 
      success: false, 
      message: errorMessage,
      details: errorDetails,
    });
  }
} 