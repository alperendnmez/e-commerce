// Ürün ve varyant kontrolü yap
if (!variantId) {
  // Varyant olmadan ekleniyor, doğrudan ürün kontrolü yap
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return res.status(404).json({ error: 'Ürün bulunamadı' });
  }

  // Varyantı olmayan ürün için basePrice kontrolü
  price = product.basePrice as number;
} else {
  // Varyant kontrolü yap
  const productVariant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!productVariant) {
    return res.status(404).json({ error: 'Ürün varyantı bulunamadı' });
  }

  if (productVariant.product.id !== productId) {
    return res.status(400).json({ error: 'Varyant ve ürün eşleşmiyor' });
  }

  // Varyant için fiyat kontrolü
  price = productVariant.price;
}
