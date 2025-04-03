import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { systemLog } from '@/lib/systemLogger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  // Yetkilendirme kontrolü
  if (!session || session.user.role !== 'ADMIN') {
    await systemLog({
      type: 'WARNING',
      action: 'UNAUTHORIZED_ACCESS',
      description: `Unauthorized access attempt to campaign API with ID: ${req.query.id}`,
      userId: session?.user?.id,
      ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    });
    return res.status(401).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Geçersiz kampanya ID\'si' });
  }

  const campaignId = parseInt(id);

  if (isNaN(campaignId)) {
    return res.status(400).json({ error: 'Geçersiz kampanya ID formatı' });
  }

  // Kampanyanın var olup olmadığını kontrol et
  const existingCampaign = await prisma.campaign.findUnique({
    where: { id: campaignId }
  });

  if (!existingCampaign) {
    return res.status(404).json({ error: 'Kampanya bulunamadı' });
  }

  if (req.method === 'GET') {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      });
      
      return res.status(200).json(campaign);
    } catch (error) {
      console.error('Kampanya alınırken hata:', error);
      await systemLog({
        type: 'ERROR',
        action: 'FETCH_CAMPAIGN',
        description: `Error fetching campaign with ID ${campaignId}: ${error}`,
        userId: session.user.id,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      });
      return res.status(500).json({ error: 'Kampanya alınırken bir hata oluştu.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { 
        name, description, type, value, startDate, endDate, isActive, 
        applicableProducts, applicableCategories, minimumOrderAmount 
      } = req.body;

      const slug = name ? slugify(name) : undefined;

      // Aynı isimli başka bir kampanya var mı kontrol et
      if (name && slug) {
        const duplicateCampaign = await prisma.campaign.findFirst({
          where: { 
            slug, 
            id: { not: campaignId } 
          }
        });

        if (duplicateCampaign) {
          return res.status(400).json({ error: 'Bu isimde başka bir kampanya zaten mevcut.' });
        }
      }

      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          name,
          slug,
          description,
          type,
          value: value ? String(value) : undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
          applicableProducts: applicableProducts || undefined,
          applicableCategories: applicableCategories || undefined,
          minimumOrderAmount: minimumOrderAmount ? String(minimumOrderAmount) : undefined
        }
      });

      await systemLog({
        type: 'INFO',
        action: 'UPDATE_CAMPAIGN',
        description: `Campaign with ID ${campaignId} updated by admin`,
        userId: session.user.id,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      });

      return res.status(200).json(updatedCampaign);
    } catch (error) {
      console.error('Kampanya güncellenirken hata:', error);
      await systemLog({
        type: 'ERROR',
        action: 'UPDATE_CAMPAIGN',
        description: `Error updating campaign with ID ${campaignId}: ${error}`,
        userId: session.user.id,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      });
      return res.status(500).json({ error: 'Kampanya güncellenirken bir hata oluştu.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.campaign.delete({
        where: { id: campaignId }
      });

      await systemLog({
        type: 'INFO',
        action: 'DELETE_CAMPAIGN',
        description: `Campaign with ID ${campaignId} deleted by admin`,
        userId: session.user.id,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      });

      return res.status(200).json({ message: 'Kampanya başarıyla silindi.' });
    } catch (error) {
      console.error('Kampanya silinirken hata:', error);
      await systemLog({
        type: 'ERROR',
        action: 'DELETE_CAMPAIGN',
        description: `Error deleting campaign with ID ${campaignId}: ${error}`,
        userId: session.user.id,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      });
      return res.status(500).json({ error: 'Kampanya silinirken bir hata oluştu.' });
    }
  }

  return res.status(405).json({ error: 'Desteklenmeyen HTTP metodu.' });
} 