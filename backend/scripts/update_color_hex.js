const mongoose = require('mongoose');

const colorMap = {
  "Anthracite Grey": "#383E42",
  "Anthracite grey": "#383E42",
  "Apple green": "#8DB600",
  "Aquamarine": "#7FFFD4",
  "Beige": "#F5F5DC",
  "Beige marl": "#F5F5DC",
  "Black": "#000000",
  "Black / Brown": "#000000",
  "Black / Ecru": "#000000",
  "Black / White": "#000000",
  "Blue": "#0000FF",
  "Blue / Green": "#0000FF",
  "Blue / Grey": "#0000FF",
  "Blue / Indigo": "#0000FF",
  "Blue / Steel": "#0000FF",
  "Blue marl": "#0000FF",
  "Blue/White": "#0000FF",
  "Bluish": "#40826D",
  "Bone White": "#F9F6EE",
  "Bottle green": "#006A4E",
  "Brown": "#964B00",
  "Brown / Ecru": "#964B00",
  "Brown / Taupe": "#964B00",
  "Brown Stripes": "#964B00",
  "Brown marl": "#964B00",
  "Brown-Blue": "#964B00",
  "Burgundy": "#800020",
  "Burgundy Red": "#800020",
  "Butter": "#FFFD74",
  "Camel Brown": "#C19A6B",
  "Caramel": "#AF6F09",
  "Cava": "#EBDDA7",
  "Chalk pink": "#E6A8A8",
  "Charcoal": "#36454F",
  "Charcoal grey": "#36454F",
  "Chocolate": "#7B3F00",
  "Chocolate Brown": "#7B3F00",
  "Chocolate brown": "#7B3F00",
  "Cream": "#FFFDD0",
  "Dark anthracite": "#2F2F2F",
  "Dark aubergine": "#3D0734",
  "Dark bottle green": "#004225",
  "Dark brown": "#3D2B1F",
  "Dark grey": "#5A5A5A",
  "Dark grey marl": "#5A5A5A",
  "Dark indigo": "#1A103D",
  "Dark khaki": "#676123",
  "Dark mink": "#786D5F",
  "Dark navy": "#000040",
  "Dark olive": "#556B2F",
  "Dark pink": "#E75480",
  "Dark red": "#8B0000",
  "Dark tan": "#916F41",
  "Deep blue": "#00008B",
  "Denim Blue": "#1560BD",
  "Duck green": "#004D40",
  "Ecru": "#F3EFE0",
  "Ecru / Black": "#F3EFE0",
  "Ecru / Blue": "#F3EFE0",
  "Ecru / Brown": "#F3EFE0",
  "Ecru / Maroon": "#F3EFE0",
  "Ecru / Navy": "#F3EFE0",
  "Ecru White": "#F3EFE0",
  "Faded black": "#2F2F2F",
  "Faded blue": "#738595",
  "Faded pink": "#F4C2C2",
  "GARNET": "#730202",
  "GREEN": "#008000",
  "Golden": "#D4AF37",
  "Green": "#008000",
  "Green / Ecru": "#008000",
  "Green marl": "#008000",
  "Grey": "#808080",
  "Grey / Blue": "#808080",
  "Grey / Natural": "#808080",
  "Grey / Tan": "#808080",
  "Grey green": "#5E716A",
  "Grey marl": "#808080",
  "Greyish": "#808080",
  "Greyish Blue": "#6699CC",
  "Ice": "#DDF9FF",
  "Indigo": "#4B0082",
  "Ink blue": "#002F6C",
  "Intense red": "#E60000",
  "Khaki": "#BDB76B",
  "Khaki Green": "#8A865D",
  "Khaki marl": "#BDB76B",
  "Leopard": "#D6A274",
  "Leopard / Grey": "#D6A274",
  "Light beige": "#F5F5DC",
  "Light blue": "#ADD8E6",
  "Light brown": "#B5651D",
  "Light camel": "#D1A384",
  "Light green": "#90EE90",
  "Light grey": "#D3D3D3",
  "Light khaki": "#F0E68C",
  "Light lilac": "#E6E6FA",
  "Light mink": "#9C9081",
  "Light pink": "#FFB6C1",
  "Light tan": "#D2B48C",
  "Light yellow": "#FFFFE0",
  "Lime": "#00FF00",
  "Maroon": "#800000",
  "Mauve": "#E0B0FF",
  "Metal brown": "#4E3B31",
  "Mid-blue": "#0067A5",
  "Mid-ecru": "#E5E0D0",
  "Mid-green": "#3D8C40",
  "Mid-grey": "#707070",
  "Mid-mink": "#8B8680",
  "Mid-red": "#C40233",
  "Midnight blue": "#191970",
  "Mink": "#8B8680",
  "Mink marl": "#8B8680",
  "Mocha": "#A38068",
  "Multicoloured": "#FFFFFF",
  "Mustard": "#FFDB58",
  "Navy / White": "#000080",
  "Navy blue": "#000080",
  "Navy marl": "#000080",
  "Olive Green": "#808000",
  "Olive green": "#808000",
  "Orange": "#FFA500",
  "Oyster-white": "#EAE0C8",
  "Pastel blue": "#AEC6CF",
  "Pearl grey": "#E1E1E1",
  "Pink": "#FFC0CB",
  "Red": "#FF0000",
  "SAND/BROWN": "#C2B280",
  "Sand": "#C2B280",
  "Sand / Blue": "#C2B280",
  "Sand / Marl": "#C2B280",
  "Sand Brown": "#C2B280",
  "Sea green": "#2E8B57",
  "Silver": "#C0C0C0",
  "Sky blue": "#87CEEB",
  "Stone": "#877F7D",
  "Stripes": "#FFFFFF",
  "Tan marl": "#D2B48C",
  "Taupe Grey": "#8B8589",
  "Taupe grey": "#8B8589",
  "Toffee": "#714222",
  "White": "#FFFFFF",
  "White / Green": "#FFFFFF",
  "White / Grey": "#FFFFFF",
  "White / Red": "#FFFFFF",
  "White / Sky blue": "#FFFFFF",
  "Wine": "#722F37",
  "Yellow": "#FFFF00",
  "blue/black": "#0000FF",
  "bordeaux/ecru": "#800020",
  "brown vigore": "#964B00",
  "brown/white": "#964B00",
  "camel": "#C19A6B",
  "denim blue": "#1560BD",
  "mid khaki": "#706B33",
  "orange-green": "#FFA500",
  "straw": "#E4D96F",
  "striped": "#FFFFFF",
  "whisky": "#AD6D2F",
    // Add number-only color mapping if needed, e.g. "734" from previous output
  "734": "#000000", // Assuming default or needing user input, sticking to known map for now.
};

async function run() {
  try {
    // Load environment variables
    require('dotenv').config();

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI is not defined in the environment variables');
    }

    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Cloud');

    const collection = mongoose.connection.db.collection('store_products');

    console.log('Fetching products...');
    const products = await collection.find({}, { projection: { _id: 1, color: 1 } }).toArray();
    console.log(`Found ${products.length} products to process.`);

    const bulkOps = [];
    let updatedCount = 0;
    let skippedCount = 0;
    let missingMapCount = 0;

    for (const product of products) {
      if (!product.color) {
        skippedCount++;
        continue;
      }

      // Extract color name: "Brown | 4161/404/700" -> "Brown"
      const colorName = product.color.split('|')[0].trim();
      const hex = colorMap[colorName];

      if (hex) {
        bulkOps.push({
          updateOne: {
              filter: { _id: product._id },
              update: { $set: { colorHex: hex } }
          }
        });
        updatedCount++;
      } else {
        // console.log(`No hex mapping for color: "${colorName}" (Product ID: ${product._id})`);
        missingMapCount++;
      }
    }

    if (bulkOps.length > 0) {
        console.log(`Executing bulk update for ${bulkOps.length} documents...`);
        const result = await collection.bulkWrite(bulkOps);
        console.log('Bulk write result:', result);
    } else {
        console.log('No updates to perform.');
    }

    console.log(`Summary:`);
    console.log(`Matched & Scheduled for Update: ${updatedCount}`);
    console.log(`Skipped (No Color Field): ${skippedCount}`);
    console.log(`Missing Mapping: ${missingMapCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
