import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { slugify } from '@/lib/utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  // Yetkilendirme kontrolü
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
  }

  if (req.method === 'GET') {
    try {
      const campaigns = await prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(campaigns);
    } catch (error) {
      console.error('Kampanyalar alınırken hata:', error);
      return res.status(500).json({ error: 'Kampanyalar alınırken bir hata oluştu.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { 
        name, description, type, value, startDate, endDate, isActive, 
        applicableProducts, applicableCategories, minimumOrderAmount 
      } = req.body;

      const slug = slugify(name);

      const newCampaign = await prisma.campaign.create({
        data: {
          name,
          slug,
          description,
          type,
          value: String(value),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: Boolean(isActive),
          applicableProducts: applicableProducts || [],
          applicableCategories: applicableCategories || [],
          minimumOrderAmount: minimumOrderAmount ? String(minimumOrderAmount) : null
        }
      });

      return res.status(201).json(newCampaign);
    } catch (error) {
      console.error('Kampanya oluşturulurken hata:', error);
      return res.status(500).json({ error: 'Kampanya oluşturulurken bir hata oluştu.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { 
        id, name, description, type, value, startDate, endDate, isActive, 
        applicableProducts, applicableCategories, minimumOrderAmount 
      } = req.body;

      const slug = slugify(name);

      const updatedCampaign = await prisma.campaign.update({
        where: { id: Number(id) },
        data: {
          name,
          slug,
          description,
          type,
          value: String(value),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: Boolean(isActive),
          applicableProducts: applicableProducts || [],
          applicableCategories: applicableCategories || [],
          minimumOrderAmount: minimumOrderAmount ? String(minimumOrderAmount) : null
        }
      });

      return res.status(200).json(updatedCampaign);
    } catch (error) {
      console.error('Kampanya güncellenirken hata:', error);
      return res.status(500).json({ error: 'Kampanya güncellenirken bir hata oluştu.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Kampanya ID belirtilmedi.' });
      }

      await prisma.campaign.delete({
        where: { id: Number(id) }
      });

      return res.status(200).json({ message: 'Kampanya başarıyla silindi.' });
    } catch (error) {
      console.error('Kampanya silinirken hata:', error);
      return res.status(500).json({ error: 'Kampanya silinirken bir hata oluştu.' });
    }
  }

  return res.status(405).json({ error: 'Desteklenmeyen HTTP metodu.' });
} 