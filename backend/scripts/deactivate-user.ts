// Removes a user from the system:  npm run user:deactivate -w backend -- <email>
import '../src/config'; // loads backend/.env (DATABASE_URL) before Prisma connects
import { prisma } from '../src/db';
import { deactivateUser } from '../src/users/deactivate';

const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run user:deactivate -w backend -- <email>');
  process.exit(1);
}

try {
  const { deactivatedAt } = await deactivateUser(email);
  console.log(`Deactivated ${email.toLowerCase()} at ${deactivatedAt.toISOString()}.`);
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
