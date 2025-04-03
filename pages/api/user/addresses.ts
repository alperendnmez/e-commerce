import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { options as authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Kullanıcı oturumunu doğrula
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt(session.user.id);

    // GET: Kullanıcının adreslerini getir
    if (req.method === 'GET') {
      try {
        const addresses = await prisma.address.findMany({
          where: { userId: userId },
          orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json(addresses);
      } catch (error) {
        console.error('Addresses fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch addresses' });
      }
    } 
    
    // POST: Yeni adres ekle
    else if (req.method === 'POST') {
      try {
        const {
          title,
          fullName,
          phone,
          address,
          city,
          state,
          zipCode,
          country,
          isDefault,
          isDefaultBilling,
        } = req.body;

        // Zorunlu alanları kontrol et
        if (!fullName || !phone || !address || !city || !state || !zipCode || !country) {
          return res.status(400).json({ error: 'Required fields are missing' });
        }

        // Tam adı ad ve soyad olarak ayır
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || ''; // Eğer soyad yoksa boş string

        // Yeni adres oluştur
        const newAddress = await prisma.address.create({
          data: {
            title: title || 'Adres',
            firstName,
            lastName,
            phone,
            street: address, // 'address' alanını 'street' olarak kaydet
            city,
            state,
            zipCode,
            country,
            isDefault: isDefault === true,
            isDefaultBilling: isDefaultBilling === true,
            user: { connect: { id: userId } },
          },
        });

        // Sunucu yanıtı için client beklentilerine uygun değer dönüştürme
        const clientResponse = {
          ...newAddress,
          fullName: `${newAddress.firstName} ${newAddress.lastName}`,
          address: newAddress.street
        };

        // Eğer bu adres varsayılan olarak işaretlendiyse, diğer adreslerin varsayılan durumunu güncelle
        if (isDefault) {
          await prisma.address.updateMany({
            where: {
              userId: userId,
              id: { not: newAddress.id },
            },
            data: {
              isDefault: false,
            },
          });
        }

        // Eğer bu adres varsayılan fatura adresi olarak işaretlendiyse, diğer adreslerin varsayılan fatura durumunu güncelle
        if (isDefaultBilling) {
          await prisma.address.updateMany({
            where: {
              userId: userId,
              id: { not: newAddress.id },
            },
            data: {
              isDefaultBilling: false,
            },
          });
        }

        return res.status(201).json(clientResponse);
      } catch (error) {
        console.error('Address creation error:', error);
        return res.status(500).json({ error: 'Failed to create address' });
      }
    } 
    
    // PATCH veya PUT: Mevcut adresi güncelle
    else if (req.method === 'PATCH' || req.method === 'PUT') {
      try {
        const { id } = req.query;
        const { 
          title, 
          fullName, 
          phone, 
          address, 
          city, 
          state, 
          zipCode, 
          country, 
          isDefault, 
          isDefaultBilling 
        } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Address ID is required' });
        }

        const addressId = typeof id === 'string' ? parseInt(id) : parseInt(id[0]);

        // Adresin kullanıcıya ait olduğunu doğrula
        const existingAddress = await prisma.address.findUnique({
          where: { id: addressId },
        });

        if (!existingAddress || existingAddress.userId !== userId) {
          return res.status(404).json({ error: 'Address not found or unauthorized' });
        }

        // Güncelleme için veri hazırla
        const updateData: any = {};
        
        if (title) updateData.title = title;
        if (phone) updateData.phone = phone;
        if (address) updateData.street = address;
        if (city) updateData.city = city;
        if (state) updateData.state = state;
        if (zipCode) updateData.zipCode = zipCode;
        if (country) updateData.country = country;
        if (isDefault !== undefined) updateData.isDefault = isDefault;
        if (isDefaultBilling !== undefined) updateData.isDefaultBilling = isDefaultBilling;

        // Ad ve soyad güncelleme
        if (fullName) {
          const nameParts = fullName.split(' ');
          updateData.firstName = nameParts[0];
          updateData.lastName = nameParts.slice(1).join(' ') || '';
        }

        // Adresi güncelle
        const updatedAddress = await prisma.address.update({
          where: { id: addressId },
          data: updateData,
        });

        // Sunucu yanıtı için client beklentilerine uygun değer dönüştürme
        const clientResponse = {
          ...updatedAddress,
          fullName: `${updatedAddress.firstName} ${updatedAddress.lastName}`,
          address: updatedAddress.street
        };

        // Eğer bu adres varsayılan olarak işaretlendiyse, diğer adreslerin varsayılan durumunu güncelle
        if (isDefault) {
          await prisma.address.updateMany({
            where: {
              userId: userId,
              id: { not: addressId },
            },
            data: {
              isDefault: false,
            },
          });
        }

        // Eğer bu adres varsayılan fatura adresi olarak işaretlendiyse, diğer adreslerin varsayılan fatura durumunu güncelle
        if (isDefaultBilling) {
          await prisma.address.updateMany({
            where: {
              userId: userId,
              id: { not: addressId },
            },
            data: {
              isDefaultBilling: false,
            },
          });
        }

        return res.status(200).json(clientResponse);
      } catch (error) {
        console.error('Address update error:', error);
        return res.status(500).json({ error: 'Failed to update address' });
      }
    } 
    
    // DELETE: Adresi sil
    else if (req.method === 'DELETE') {
      try {
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({ error: 'Address ID is required' });
        }

        // Adresin kullanıcıya ait olduğunu doğrula
        const address = await prisma.address.findUnique({
          where: { id: parseInt(id as string) },
        });

        if (!address || address.userId !== userId) {
          return res.status(404).json({ error: 'Address not found or unauthorized' });
        }

        // Adresi sil
        await prisma.address.delete({
          where: { id: parseInt(id as string) },
        });

        return res.status(200).json({ message: 'Address deleted successfully' });
      } catch (error) {
        console.error('Address deletion error:', error);
        return res.status(500).json({ error: 'Failed to delete address' });
      }
    } 
    
    // Desteklenmeyen HTTP metodu
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 