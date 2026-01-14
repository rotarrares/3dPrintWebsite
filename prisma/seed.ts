import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@print3d.ro' },
    update: {},
    create: {
      email: 'admin@print3d.ro',
      passwordHash: adminPassword,
      name: 'Administrator',
    },
  });
  console.log('Admin user created:', admin.email);

  // Create example entries
  const examples = [
    {
      title: 'Figurină Câine',
      description: 'Figurină 3D personalizată după poza câinelui, cu detalii realiste.',
      imageUrls: ['https://cdn.print3d.ro/examples/dog1.jpg', 'https://cdn.print3d.ro/examples/dog2.jpg'],
      category: 'animale',
      sortOrder: 1,
    },
    {
      title: 'Portret Familie',
      description: 'Statuetă de familie în miniatură, perfectă pentru cadouri.',
      imageUrls: ['https://cdn.print3d.ro/examples/family1.jpg'],
      category: 'persoane',
      sortOrder: 2,
    },
    {
      title: 'Figurină Pisică',
      description: 'Pisica ta preferată transformată într-o figurină 3D adorabilă.',
      imageUrls: ['https://cdn.print3d.ro/examples/cat1.jpg', 'https://cdn.print3d.ro/examples/cat2.jpg'],
      category: 'animale',
      sortOrder: 3,
    },
    {
      title: 'Caricatură 3D',
      description: 'Caricatură amuzantă în format 3D, personalizată după poză.',
      imageUrls: ['https://cdn.print3d.ro/examples/caricature1.jpg'],
      category: 'persoane',
      sortOrder: 4,
    },
  ];

  for (const example of examples) {
    await prisma.example.upsert({
      where: { id: `seed-${example.sortOrder}` },
      update: example,
      create: {
        id: `seed-${example.sortOrder}`,
        ...example,
      },
    });
  }
  console.log('Example entries created:', examples.length);

  // Create sample orders for testing
  const sampleOrders = [
    {
      orderNumber: 'P3D-20240101-TEST',
      status: 'RECEIVED' as const,
      customerName: 'Ion Popescu',
      customerEmail: 'ion.popescu@example.com',
      customerPhone: '0740123456',
      customerCity: 'Cluj-Napoca',
      description: 'Vreau o figurină cu câinele meu',
      sourceImageUrl: 'https://cdn.print3d.ro/uploads/sample-dog.jpg',
      preferredSize: '15cm',
      preferredColor: 'Alb',
    },
    {
      orderNumber: 'P3D-20240102-TEST',
      status: 'PENDING_APPROVAL' as const,
      customerName: 'Maria Ionescu',
      customerEmail: 'maria.ionescu@example.com',
      customerPhone: '0741234567',
      customerCity: 'București',
      description: 'Figurină cu pisica mea',
      sourceImageUrl: 'https://cdn.print3d.ro/uploads/sample-cat.jpg',
      price: 150,
    },
    {
      orderNumber: 'P3D-20240103-TEST',
      status: 'PAID' as const,
      customerName: 'Andrei Georgescu',
      customerEmail: 'andrei.georgescu@example.com',
      customerPhone: '0742345678',
      customerCity: 'Timișoara',
      description: 'Portret familie',
      sourceImageUrl: 'https://cdn.print3d.ro/uploads/sample-family.jpg',
      price: 200,
      paidAt: new Date(),
    },
  ];

  for (const order of sampleOrders) {
    const existing = await prisma.order.findUnique({
      where: { orderNumber: order.orderNumber },
    });

    if (!existing) {
      await prisma.order.create({ data: order });
    }
  }
  console.log('Sample orders created:', sampleOrders.length);

  // Add variants to the PENDING_APPROVAL order
  const pendingOrder = await prisma.order.findUnique({
    where: { orderNumber: 'P3D-20240102-TEST' },
  });

  if (pendingOrder) {
    const existingVariants = await prisma.modelVariant.count({
      where: { orderId: pendingOrder.id },
    });

    if (existingVariants === 0) {
      await prisma.modelVariant.createMany({
        data: [
          {
            orderId: pendingOrder.id,
            previewImageUrl: 'https://cdn.print3d.ro/variants/sample-v1.jpg',
            description: 'Varianta 1 - Poziție șezând',
          },
          {
            orderId: pendingOrder.id,
            previewImageUrl: 'https://cdn.print3d.ro/variants/sample-v2.jpg',
            description: 'Varianta 2 - Poziție în picioare',
          },
        ],
      });
      console.log('Sample variants created for pending order');
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
