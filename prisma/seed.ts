import prisma from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create subscription plans if they don't exist
  const plans = [
    { tier: 'FREE' as const, price: 0, maxTables: 5, features: ['Basic QR ordering', 'Up to 5 tables'] },
    { tier: 'PRO' as const, price: 49.99, maxTables: 25, features: ['Up to 25 tables', 'Priority support', 'Analytics'] },
    { tier: 'PREMIUM' as const, price: 99.99, maxTables: 100, features: ['Unlimited tables', 'White-label branding', 'API access', 'Dedicated support'] },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { tier: plan.tier },
      update: { price: plan.price, maxTables: plan.maxTables, features: plan.features },
      create: plan,
    });
    console.log(`  ✅ Plan: ${plan.tier}`);
  }

  // 2. Create Super Admin if none exists
  const existingAdmin = await prisma.owner.findFirst({ where: { role: 'SUPER_ADMIN' } });

  if (!existingAdmin) {
    const passwordHash = await hashPassword('admin123');
    await prisma.owner.create({
      data: {
        username: 'superadmin',
        email: 'admin@qrbite.com',
        passwordHash,
        restaurantName: 'QRBite Platform',
        ownerName: 'Platform Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('  ✅ Super Admin created: username=superadmin password=admin123');
  } else {
    console.log('  ⏭️  Super Admin already exists, skipping.');
  }

  console.log('\n🎉 Seed complete!');
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
