import { connect, disconnect } from 'mongoose';
import { UserSchema } from '../../users/schemas/user.schema';
import { createClerkClient } from '@clerk/backend';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function promoteAllUsersToAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/aesthetiq';
    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    
    // Create model
    const UserModel = require('mongoose').model('User', UserSchema);
    
    // Get all users
    const users = await UserModel.find({}).exec();
    
    if (users.length === 0) {
      console.log('No users found in database.');
      return;
    }
    
    console.log(`Found ${users.length} users. Promoting all to ADMIN...`);
    
    // Initialize Clerk client
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    
    // Update each user
    for (const user of users) {
      try {
        // Update database
        await UserModel.findOneAndUpdate(
          { clerkId: user.clerkId },
          { role: 'ADMIN' },
          { new: true }
        );
        
        // Update Clerk metadata
        await clerkClient.users.updateUserMetadata(user.clerkId, {
          publicMetadata: {
            role: 'ADMIN'
          }
        });
        
        console.log(`✅ Promoted ${user.email} (${user.clerkId})`);
      } catch (error) {
        console.error(`❌ Failed to promote ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Promotion process completed!`);
    console.log(`🔄 Please refresh your browser to see the changes.`);
    
  } catch (error) {
    console.error('Error promoting users to admin:', error.message);
  } finally {
    await disconnect();
  }
}

promoteAllUsersToAdmin();