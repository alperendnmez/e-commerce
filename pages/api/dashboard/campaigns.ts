import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { createSystemLog } from '@/lib/systemLogger';
import { rateLimit } from '@/lib/rateLimit';

// Doğrudan PrismaClient'ı her endpoint'de yeniden oluştur
const prisma = new PrismaClient();

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 10,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Rate limit
  try {
    await limiter.check(res, 10, 'CAMPAIGNS_API');
  } catch (error) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  // Authorization check
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }

  const userId = parseInt(session.user.id as string);
  const userRole = session.user.role;

  if (userRole !== 'ADMIN') {
    try {
      await createSystemLog({
        action: 'AUTH_FAILED',
        userId,
        description: 'Campaigns API için yetkisiz erişim denemesi',
        ip: req.socket.remoteAddress
      });
    } catch (logError) {
      console.error('Error logging unauthorized access:', logError);
    }
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  // Handle different HTTP methods
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const campaigns = await prisma.campaign.findMany({
          orderBy: {
            createdAt: 'desc',
          },
        });
        return res.status(200).json(campaigns);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        await createSystemLog({
          action: 'ERROR',
          userId,
          description: `Kampanyalar yüklenirken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          ip: req.socket.remoteAddress
        });
        return res.status(500).json({ error: 'Kampanyalar yüklenirken bir hata oluştu' });
      }

    case 'POST':
      try {
        const { 
          name, 
          description, 
          type, 
          value, 
          minOrderAmount, 
          startDate, 
          endDate, 
          categoryId, 
          productId, 
          isActive 
        } = req.body;

        // Validate required fields
        if (!name || !type || !startDate || !endDate) {
          return res.status(400).json({ error: 'Gerekli alanlar eksik' });
        }

        // Validate dates
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ error: 'Geçersiz tarih formatı' });
        }

        if (parsedEndDate <= parsedStartDate) {
          return res.status(400).json({ error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' });
        }

        // Create campaign
        const campaign = await prisma.campaign.create({
          data: {
            name,
            description,
            type,
            value: value !== undefined ? Number(value) : null,
            minOrderAmount: minOrderAmount !== undefined ? Number(minOrderAmount) : null,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            categoryId: categoryId ? parseInt(categoryId as string) : null,
            productId: productId ? parseInt(productId as string) : null,
            isActive,
            userId
          },
        });

        await createSystemLog({
          action: 'CAMPAIGN_CREATED',
          userId,
          description: `Yeni kampanya oluşturuldu: ${name}`,
          ip: req.socket.remoteAddress,
          metadata: { campaignId: campaign.id }
        });

        return res.status(201).json(campaign);
      } catch (error) {
        console.error('Error creating campaign:', error);
        await createSystemLog({
          action: 'ERROR',
          userId,
          description: `Kampanya oluşturulurken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          ip: req.socket.remoteAddress
        });
        return res.status(500).json({ error: 'Kampanya oluşturulurken bir hata oluştu' });
      }

    case 'PUT':
      try {
        const { id } = req.query;
        
        if (!id || isNaN(Number(id))) {
          return res.status(400).json({ error: 'Geçerli bir kampanya ID gerekli' });
        }
        
        const { 
          name, 
          description, 
          type, 
          value, 
          minOrderAmount, 
          startDate, 
          endDate, 
          categoryId, 
          productId, 
          isActive 
        } = req.body;

        // Validate required fields
        if (!name || !type || !startDate || !endDate) {
          return res.status(400).json({ error: 'Gerekli alanlar eksik' });
        }

        // Validate dates if provided
        if (startDate && endDate) {
          const parsedStartDate = new Date(startDate);
          const parsedEndDate = new Date(endDate);

          if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({ error: 'Geçersiz tarih formatı' });
          }

          if (parsedEndDate <= parsedStartDate) {
            return res.status(400).json({ error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' });
          }
        }

        // Update campaign
        const campaign = await prisma.campaign.update({
          where: {
            id: Number(id),
          },
          data: {
            name,
            description,
            type,
            value: value !== undefined ? Number(value) : undefined,
            minOrderAmount: minOrderAmount !== undefined ? Number(minOrderAmount) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            categoryId: categoryId ? parseInt(categoryId as string) : undefined,
            productId: productId ? parseInt(productId as string) : undefined,
            isActive,
            updatedAt: new Date(),
          },
        });

        await createSystemLog({
          action: 'CAMPAIGN_UPDATED',
          userId,
          description: `Kampanya güncellendi: ${name}`,
          ip: req.socket.remoteAddress,
          metadata: { campaignId: campaign.id }
        });

        return res.status(200).json(campaign);
      } catch (error) {
        console.error('Error updating campaign:', error);
        await createSystemLog({
          action: 'ERROR',
          userId,
          description: `Kampanya güncellenirken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          ip: req.socket.remoteAddress
        });
        return res.status(500).json({ error: 'Kampanya güncellenirken bir hata oluştu' });
      }

    case 'DELETE':
      try {
        const { id } = req.query;
        
        if (!id || isNaN(Number(id))) {
          return res.status(400).json({ error: 'Geçerli bir kampanya ID gerekli' });
        }
        
        // Check if campaign exists
        const existingCampaign = await prisma.campaign.findUnique({
          where: {
            id: Number(id),
          },
        });

        if (!existingCampaign) {
          return res.status(404).json({ error: 'Kampanya bulunamadı' });
        }

        // Delete campaign
        await prisma.campaign.delete({
          where: {
            id: Number(id),
          },
        });

        await createSystemLog({
          action: 'CAMPAIGN_DELETED',
          userId,
          description: `Kampanya silindi: ${existingCampaign.name}`,
          ip: req.socket.remoteAddress,
          metadata: { campaignId: Number(id) }
        });

        return res.status(200).json({ message: 'Kampanya başarıyla silindi' });
      } catch (error) {
        console.error('Error deleting campaign:', error);
        await createSystemLog({
          action: 'ERROR',
          userId,
          description: `Kampanya silinirken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          ip: req.socket.remoteAddress
        });
        return res.status(500).json({ error: 'Kampanya silinirken bir hata oluştu' });
      }

    default:
      return res.status(405).json({ error: 'Desteklenmeyen istek yöntemi' });
  }
} 