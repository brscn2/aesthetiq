const mongoose = require('mongoose');

async function run() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/aesthetiq');
    console.log('Connected to MongoDB');

    // Access the native MongoDB driver collection
    const collection = mongoose.connection.db.collection('store_products');

    const pipeline = [
      {
        // 1. Adım: "color" alanını "|" karakterinden böl ve ilk parçayı al
        $project: {
          onlyColor: { 
            $trim: { 
              input: { $arrayElemAt: [{ $split: ["$color", "|"] }, 0] } 
            } 
          }
        }
      },
      {
        // 2. Adım: Bu renkleri grupla (Unique/Benzersiz hale getir)
        $group: {
          _id: "$onlyColor"
        }
      },
      {
        // 3. Adım: Alfabetik sırala
        $sort: {
          _id: 1
        }
      }
    ];

    console.log('Running aggregation...');
    const result = await collection.aggregate(pipeline).toArray();
    
    // Extract just the color names from the result objects
    const colors = result.map(item => item._id).filter(Boolean);

    console.log(`Found ${colors.length} unique colors:`);
    console.log(JSON.stringify(colors, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
