import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OLD_URL = 'https://pub-539bf45898834540bd1f19ff89839ed0.r2.dev';
const NEW_URL = 'https://pub-7107a6e71655449780b6587eb45905a7.r2.dev';

function replaceUrl(url: string | null): string | null {
  if (!url) return url;
  return url.replace(OLD_URL, NEW_URL);
}

function replaceUrlsInArray(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.map((url) => (typeof url === 'string' ? url.replace(OLD_URL, NEW_URL) : url));
}

async function main() {
  console.log('Starting R2 URL migration...');
  console.log(`Old URL: ${OLD_URL}`);
  console.log(`New URL: ${NEW_URL}\n`);

  // 1. Update Products
  const products = await prisma.product.findMany();
  let productCount = 0;
  for (const product of products) {
    const newImageUrls = replaceUrlsInArray(product.imageUrls);
    const newModelUrl = replaceUrl(product.modelUrl);
    const newModelPreviewUrl = replaceUrl(product.modelPreviewUrl);

    if (
      JSON.stringify(newImageUrls) !== JSON.stringify(product.imageUrls) ||
      newModelUrl !== product.modelUrl ||
      newModelPreviewUrl !== product.modelPreviewUrl
    ) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          imageUrls: newImageUrls,
          modelUrl: newModelUrl,
          modelPreviewUrl: newModelPreviewUrl,
        },
      });
      productCount++;
    }
  }
  console.log(`Updated ${productCount} products`);

  // 2. Update Examples
  const examples = await prisma.example.findMany();
  let exampleCount = 0;
  for (const example of examples) {
    const newImageUrls = replaceUrlsInArray(example.imageUrls);

    if (JSON.stringify(newImageUrls) !== JSON.stringify(example.imageUrls)) {
      await prisma.example.update({
        where: { id: example.id },
        data: { imageUrls: newImageUrls },
      });
      exampleCount++;
    }
  }
  console.log(`Updated ${exampleCount} examples`);

  // 3. Update Orders
  const orders = await prisma.order.findMany();
  let orderCount = 0;
  for (const order of orders) {
    const newSourceImageUrl = replaceUrl(order.sourceImageUrl);

    if (newSourceImageUrl !== order.sourceImageUrl) {
      await prisma.order.update({
        where: { id: order.id },
        data: { sourceImageUrl: newSourceImageUrl! },
      });
      orderCount++;
    }
  }
  console.log(`Updated ${orderCount} orders`);

  // 4. Update ModelVariants
  const variants = await prisma.modelVariant.findMany();
  let variantCount = 0;
  for (const variant of variants) {
    const newPreviewImageUrl = replaceUrl(variant.previewImageUrl);

    if (newPreviewImageUrl !== variant.previewImageUrl) {
      await prisma.modelVariant.update({
        where: { id: variant.id },
        data: { previewImageUrl: newPreviewImageUrl! },
      });
      variantCount++;
    }
  }
  console.log(`Updated ${variantCount} model variants`);

  // 5. Update Reviews
  const reviews = await prisma.review.findMany();
  let reviewCount = 0;
  for (const review of reviews) {
    if (review.photoUrls) {
      const newPhotoUrls = replaceUrlsInArray(review.photoUrls);

      if (JSON.stringify(newPhotoUrls) !== JSON.stringify(review.photoUrls)) {
        await prisma.review.update({
          where: { id: review.id },
          data: { photoUrls: newPhotoUrls },
        });
        reviewCount++;
      }
    }
  }
  console.log(`Updated ${reviewCount} reviews`);

  console.log('\nMigration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
