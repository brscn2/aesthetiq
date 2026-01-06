import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { BrandsService } from '../brands.service';

const mockBrands = [
  { name: 'Nike', description: 'American sportswear brand', country: 'USA', foundedYear: 1964, website: 'https://nike.com' },
  { name: 'Adidas', description: 'German sportswear brand', country: 'Germany', foundedYear: 1949, website: 'https://adidas.com' },
  { name: 'Zara', description: 'Spanish fast fashion retailer', country: 'Spain', foundedYear: 1975, website: 'https://zara.com' },
  { name: 'H&M', description: 'Swedish fashion retailer', country: 'Sweden', foundedYear: 1947, website: 'https://hm.com' },
  { name: 'Uniqlo', description: 'Japanese casual wear brand', country: 'Japan', foundedYear: 1984, website: 'https://uniqlo.com' },
  { name: 'Levi\'s', description: 'American denim brand', country: 'USA', foundedYear: 1853, website: 'https://levi.com' },
  { name: 'Ralph Lauren', description: 'American luxury fashion brand', country: 'USA', foundedYear: 1967, website: 'https://ralphlauren.com' },
  { name: 'Tommy Hilfiger', description: 'American premium fashion brand', country: 'USA', foundedYear: 1985, website: 'https://tommy.com' },
  { name: 'Calvin Klein', description: 'American fashion house', country: 'USA', foundedYear: 1968, website: 'https://calvinklein.com' },
  { name: 'Gucci', description: 'Italian luxury fashion brand', country: 'Italy', foundedYear: 1921, website: 'https://gucci.com' },
  { name: 'Prada', description: 'Italian luxury fashion house', country: 'Italy', foundedYear: 1913, website: 'https://prada.com' },
  { name: 'Versace', description: 'Italian luxury fashion brand', country: 'Italy', foundedYear: 1978, website: 'https://versace.com' },
  { name: 'Burberry', description: 'British luxury fashion house', country: 'UK', foundedYear: 1856, website: 'https://burberry.com' },
  { name: 'The North Face', description: 'American outdoor apparel brand', country: 'USA', foundedYear: 1968, website: 'https://thenorthface.com' },
  { name: 'Patagonia', description: 'American outdoor clothing brand', country: 'USA', foundedYear: 1973, website: 'https://patagonia.com' },
  { name: 'New Balance', description: 'American athletic footwear brand', country: 'USA', foundedYear: 1906, website: 'https://newbalance.com' },
  { name: 'Puma', description: 'German sportswear brand', country: 'Germany', foundedYear: 1948, website: 'https://puma.com' },
  { name: 'Converse', description: 'American shoe brand', country: 'USA', foundedYear: 1908, website: 'https://converse.com' },
  { name: 'Vans', description: 'American skateboarding shoe brand', country: 'USA', foundedYear: 1966, website: 'https://vans.com' },
  { name: 'Mango', description: 'Spanish fashion brand', country: 'Spain', foundedYear: 1984, website: 'https://mango.com' },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const brandsService = app.get(BrandsService);

  console.log('🌱 Seeding brands...\n');

  let created = 0;
  let skipped = 0;

  for (const brand of mockBrands) {
    try {
      await brandsService.create(brand);
      console.log(`✅ Created: ${brand.name}`);
      created++;
    } catch (error: any) {
      if (error.code === 11000 || error.message?.includes('duplicate')) {
        console.log(`⏭️  Skipped (exists): ${brand.name}`);
        skipped++;
      } else {
        console.error(`❌ Error creating ${brand.name}:`, error.message);
      }
    }
  }

  console.log(`\n✨ Done! Created: ${created}, Skipped: ${skipped}`);
  await app.close();
}

bootstrap();
