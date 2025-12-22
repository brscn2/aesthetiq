import { connect, disconnect } from 'mongoose';
import { UserSchema } from '../../users/schemas/user.schema';
import { createClerkClient } from '@clerk/backend';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function promoteUserToAdminWithClerk() {
  const clerkId = process.argv[2];
  
  if (!clerkId) {
    console.error('Usage: npm run promote-admin-clerk <clerkId>');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/aesthetiq';
    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    
    // Create model
    const UserModel = require('mongoose').model('User', UserSchema);
    
    // Update database
    const user = await UserModel.findOneAndUpdate(
      { clerkId },
      { role: 'ADMIN' },
      { new: true }
    );
    
    if (!user) {
      console.error(`User with Clerk ID ${clerkId} not found in database`);
      process.exit(1);
    }
    
    console.log('✅ Database updated successfully');
    
    // Update Clerk metadata
    console.log('Updating Clerk metadata...');
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    await clerkClient.users.updateUserMetadata(clerkId, {
      publicMetadata: {
        role: 'ADMIN'
      }
    });
    
    console.log('✅ Clerk metadata updated successfully');
    
    console.log(`\n🎉 Successfully promoted user to admin:`);
    console.log(`   User ID: ${user.clerkId}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`\n🔄 Please refresh your browser to see the changes.`);
    
  } catch (error) {
    console.error('Error promoting user to admin:', error.message);
    process.exit(1);
  } finally {
    await disconnect();
  }
}

promoteUserToAdminWithClerk();