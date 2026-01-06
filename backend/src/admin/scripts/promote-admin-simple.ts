import { connect, disconnect } from 'mongoose';
import { UserSchema } from '../../users/schemas/user.schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function promoteUserToAdmin() {
  const clerkId = process.argv[2];
  
  if (!clerkId) {
    console.error('Usage: npm run promote-admin-simple <clerkId>');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/aesthetiq';
    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    
    // Create model
    const UserModel = require('mongoose').model('User', UserSchema);
    
    // Find and update user
    const user = await UserModel.findOneAndUpdate(
      { clerkId },
      { role: 'ADMIN' },
      { new: true }
    );
    
    if (!user) {
      console.error(`User with Clerk ID ${clerkId} not found`);
      process.exit(1);
    }
    
    console.log(`✅ Successfully promoted user to admin:`);
    console.log(`   User ID: ${user.clerkId}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    
  } catch (error) {
    console.error('Error promoting user to admin:', error.message);
    process.exit(1);
  } finally {
    await disconnect();
  }
}

promoteUserToAdmin();