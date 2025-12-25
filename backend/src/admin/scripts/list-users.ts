import { connect, disconnect } from 'mongoose';
import { User, UserSchema } from '../../users/schemas/user.schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/aesthetiq';
    console.log('Connecting to MongoDB...');
    await connect(mongoUri);
    
    // Create model
    const UserModel = require('mongoose').model('User', UserSchema);
    
    const users = await UserModel.find({}).exec();
    
    console.log('\n=== All Users ===');
    users.forEach((user: any, index: number) => {
      console.log(`${index + 1}. User ID: ${user.clerkId}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role || 'USER'}`);
      console.log(`   Created: ${user.createdAt || 'N/A'}`);
      console.log('   ---');
    });
    
    if (users.length === 0) {
      console.log('No users found in database.');
      console.log('Make sure you have signed up at least once in the frontend.');
    }
    
  } catch (error) {
    console.error('Error listing users:', error.message);
  } finally {
    await disconnect();
  }
}

listUsers();