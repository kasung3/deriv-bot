import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  const hashedPassword = await bcrypt.hash('johndoe123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
      settings: {
        create: {
          initialStake: 1.0,
          martingaleFactor: 2.0,
          maxConsecutiveLosses: 5,
          maxConsecutiveLossesEnabled: true,
          maxStake: 100.0,
          maxStakeEnabled: true,
          dailyLossLimit: 50.0,
          dailyLossLimitEnabled: true,
          atrThreshold: 0.0005,
          selectedMarket: 'R_10',
          accountType: 'demo',
        },
      },
    },
  });

  console.log('Created user:', user.email);
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
