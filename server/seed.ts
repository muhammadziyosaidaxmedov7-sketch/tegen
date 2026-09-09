import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      name: 'Smartfonlar',
      slug: 'smartfonlar',
    },
    {
      name: 'Elektronika',
      slug: 'elektronika',
    },
    {
      name: 'Kiyim',
      slug: 'kiyim',
    },
    {
      name: 'Oyoq kiyim',
      slug: 'oyoq-kiyim',
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        name: category.name,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
      },
    });
  }

  const smartfon = await prisma.category.findUnique({
    where: {
      slug: 'smartfonlar',
    },
  });

  const oyoqKiyim = await prisma.category.findUnique({
    where: {
      slug: 'oyoq-kiyim',
    },
  });

  if (smartfon) {
    await prisma.product.upsert({
      where: {
        id: 1,
      },
      update: {},
      create: {
        id: 1,
        categoryId: smartfon.id,
        name: 'Smartfon TEGEN X1',
        description: 'TEGEN X1 smartfon',
        price: 2499000,
        oldPrice: 2899000,
        image: null,
        isActive: true,
      },
    });
  }

  if (oyoqKiyim) {
    await prisma.product.upsert({
      where: {
        id: 2,
      },
      update: {},
      create: {
        id: 2,
        categoryId: oyoqKiyim.id,
        name: 'Sport krossovka',
        description: 'Sport uchun qulay krossovka',
        price: 399000,
        oldPrice: 499000,
        image: null,
        isActive: true,
      },
    });
  }

  console.log('TEGEN seed muvaffaqiyatli bajarildi');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
