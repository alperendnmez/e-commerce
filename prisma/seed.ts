import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Test markası oluştur
  const testBrand = await prisma.brand.upsert({
    where: { slug: 'test-marka' },
    update: {},
    create: {
      name: 'Test Marka',
      slug: 'test-marka',
      description: 'Test marka açıklaması',
      isActive: true,
      isFeatured: true,
      displayOrder: 1,
      showInHeader: true,
      showInFooter: true,
      showInSidebar: true,
    },
  })

  console.log({ testBrand })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 