import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Received request:", req.method, req.body);

  if (req.method !== 'POST') {
    console.log("Method not allowed");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, password, confirmPassword, firstName, lastName } = req.body;
    console.log("Parsed body:", email, password, confirmPassword, firstName, lastName);

    // Gerekli alanları kontrol et
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      console.log("Missing required fields");
      return res.status(400).json({ error: "Email, password, confirmPassword, firstName ve lastName gerekli" });
    }

    // Şifrelerin eşleştiğini kontrol et
    if (password !== confirmPassword) {
      console.log("Passwords do not match");
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Kullanıcının zaten var olup olmadığını kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    console.log("Existing user:", existingUser);

    if (existingUser) {
      console.log("User already exists");
      return res.status(400).json({ error: "User already exists" });
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password:", hashedPassword);

    // Yeni kullanıcıyı oluştur
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: new Date(), // E-posta doğrulamasını otomatik olarak tamamla
        emailVerificationToken: null, // Token'ı null olarak ayarla
        tokenExpires: null, // Token süresini null olarak ayarla
      },
    });
    console.log("New user created:", newUser);

    return res.status(201).json({ message: "User created successfully. You can now log in." });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
