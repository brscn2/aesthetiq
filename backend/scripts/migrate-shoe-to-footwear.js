/**
 * Migration script to rename category 'SHOE' to 'FOOTWEAR'
 * in both wardrobeitems and commerceitems collections
 * 
 * Usage: node backend/scripts/migrate-shoe-to-footwear.js
 */

const { MongoClient } = require('mongodb');

// MongoDB connection URI - update if needed
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aesthetiq';

async function migrateSHOEToFOOTWEAR() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    const db = client.db();
    
    // Migrate wardrobeitems collection
    console.log('\n📦 Migrating wardrobeitems collection...');
    const wardrobeResult = await db.collection('wardrobeitems').updateMany(
      { category: 'SHOE' },
      { $set: { category: 'FOOTWEAR' } }
    );
    console.log(`✅ Updated ${wardrobeResult.modifiedCount} wardrobe items (${wardrobeResult.matchedCount} matched)`);
    
    // Migrate commerceitems collection
    console.log('\n🛍️  Migrating commerceitems collection...');
    const commerceResult = await db.collection('commerceitems').updateMany(
      { category: 'SHOE' },
      { $set: { category: 'FOOTWEAR' } }
    );
    console.log(`✅ Updated ${commerceResult.modifiedCount} commerce items (${commerceResult.matchedCount} matched)`);
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   - Wardrobe items: ${wardrobeResult.modifiedCount} updated`);
    console.log(`   - Commerce items: ${commerceResult.modifiedCount} updated`);
    console.log(`   - Total: ${wardrobeResult.modifiedCount + commerceResult.modifiedCount} documents updated`);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const remainingWardrobe = await db.collection('wardrobeitems').countDocuments({ category: 'SHOE' });
    const remainingCommerce = await db.collection('commerceitems').countDocuments({ category: 'SHOE' });
    
    if (remainingWardrobe === 0 && remainingCommerce === 0) {
      console.log('✅ Migration verified: No SHOE categories remain');
    } else {
      console.warn(`⚠️  Warning: ${remainingWardrobe} wardrobe items and ${remainingCommerce} commerce items still have SHOE category`);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
migrateSHOEToFOOTWEAR()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
