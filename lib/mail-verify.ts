import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Furnico E-posta Doğrulama',
    html: `
      <p>Merhaba,</p>
      <p>Hesabınızı doğrulamak için lütfen aşağıdaki bağlantıya tıklayın:</p>
      <a href="${verificationUrl}">E-posta Doğrulama</a>
      <p>Bağlantı ${process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES || 60} dakika içinde geçerlidir.</p>
    `,
  });
}
