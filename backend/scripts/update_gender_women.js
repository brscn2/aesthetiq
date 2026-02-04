/**
 * Script to update gender field to "WOMEN" for all items created after January 21, 2026
 * 
 * Usage: node scripts/update_gender_women.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DATABASE_NAME = 'test';
const COLLECTION_NAME = 'commerceitems';

// January 21, 2026 00:00:00 UTC
const CUTOFF_DATE = new Date('2026-01-21T00:00:00.000Z');

async function updateGenderToWomen() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully');

    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // First, count how many documents will be affected
    const countQuery = {
      updatedAt: { $gte: CUTOFF_DATE },
      gender: { $ne: 'WOMEN' }
    };

    const affectedCount = await collection.countDocuments(countQuery);
    console.log(`\nFound ${affectedCount} items that need gender update (updatedAt >= ${CUTOFF_DATE.toISOString()})`);

    if (affectedCount === 0) {
      console.log('No items to update. Exiting...');
      return;
    }

    // Show some sample items before update
    console.log('\nSample items before update:');
    const samples = await collection.find(countQuery).limit(5).toArray();
    samples.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - Current Gender: ${item.gender}, Updated At: ${item.updatedAt}`);
    });

    // Ask for confirmation (in production, you might want to use a prompt library)
    console.log(`\n⚠️  About to update ${affectedCount} items...`);
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Perform the update
    console.log('\nUpdating gender to "WOMEN"...');
    const updateResult = await collection.updateMany(
      countQuery,
      { 
        $set: { 
          gender: 'WOMEN',
          lastModified: new Date()
        } 
      }
    );

    console.log(`\n✅ Update completed!`);
    console.log(`   Matched: ${updateResult.matchedCount}`);
    console.log(`   Modified: ${updateResult.modifiedCount}`);

    // Show some updated items
    console.log('\nSample items after update:');
    const updatedSamples = await collection.find({ 
      updatedAt: { $gte: CUTOFF_DATE },
      gender: 'WOMEN'
    }).limit(5).toArray();
    
    updatedSamples.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - Gender: ${item.gender}, Updated At: ${item.updatedAt}`);
    });

  } catch (error) {
    console.error('Error updating gender:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
updateGenderToWomen()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
