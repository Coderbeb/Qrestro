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
        email: 'admin@qrestro.com',
        passwordHash,
        restaurantName: 'QRestro Platform',
        ownerName: 'Platform Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('  ✅ Super Admin created: username=superadmin password=admin123');
  } else {
    console.log('  ⏭️  Super Admin already exists, skipping.');
  }
  
  // 3. Create Demo Restaurants
  const demoRestaurants = [
    { username: 'spicehub', email: 'spicehub@demo.com', restaurantName: 'SpiceHub', ownerName: 'Sanjay Kapoor', cuisine: 'Restaurant' },
    { username: 'tandoortales', email: 'tandoortales@demo.com', restaurantName: 'Tandoor Tales', ownerName: 'Amit Sharma', cuisine: 'Indian Cuisine' },
    { username: 'urbanbites', email: 'urbanbites@demo.com', restaurantName: 'Urban Bites', ownerName: 'Vikram Malhotra', cuisine: 'Cafe & Kitchen' },
    { username: 'curryhouse', email: 'curryhouse@demo.com', restaurantName: 'Curry House', ownerName: 'Rohan Verma', cuisine: 'Restaurant' },
    { username: 'foodfiesta', email: 'foodfiesta@demo.com', restaurantName: 'Food Fiesta', ownerName: 'Neha Gupta', cuisine: 'Multi Cuisine' },
    { username: 'grillclub', email: 'grillclub@demo.com', restaurantName: 'The Grill Club', ownerName: 'Rajesh Sen', cuisine: 'Steakhouse' },
  ];

  console.log('🌱 Seeding demo restaurants...');
  const passwordHash = await hashPassword('demo123');
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { tier: 'FREE' } });

  for (const demo of demoRestaurants) {
    const existingRestaurant = await prisma.owner.findUnique({ where: { username: demo.username } });
    if (!existingRestaurant) {
      await prisma.owner.create({
        data: {
          username: demo.username,
          email: demo.email,
          passwordHash,
          restaurantName: demo.restaurantName,
          ownerName: demo.ownerName,
          role: 'RESTAURANT_OWNER',
          cuisine: demo.cuisine,
          showOnLanding: true,
          planId: freePlan?.id,
        },
      });
      console.log(`  ✅ Demo Restaurant: ${demo.restaurantName}`);
    } else {
      console.log(`  ⏭️  Demo Restaurant ${demo.restaurantName} already exists, skipping.`);
    }
  }

  console.log('\n🎉 Seed complete!');
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
