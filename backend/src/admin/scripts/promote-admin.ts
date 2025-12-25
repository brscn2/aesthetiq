import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { AdminService } from '../admin.service';

async function promoteUserToAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);

  // Replace with the actual Clerk ID of the user you want to promote
  const clerkId = process.argv[2];
  
  if (!clerkId) {
    console.error('Usage: npm run promote-admin <clerkId>');
    process.exit(1);
  }

  try {
    await adminService.promoteUserToAdmin(clerkId);
    console.log(`Successfully promoted user ${clerkId} to admin`);
  } catch (error) {
    console.error('Error promoting user to admin:', error.message);
  }

  await app.close();
}

promoteUserToAdmin();