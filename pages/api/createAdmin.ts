import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const session = await getSession({ req });

  if (!session || session.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Erişim izniniz yok." });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email gereklidir." });
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: Role.ADMIN },
    });
    return res.status(200).json({ message: `${email} artık ADMIN oldu.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Kullanıcıyı güncellerken bir hata oluştu." });
  }
}
