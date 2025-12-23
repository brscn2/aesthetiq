export const testBrands = [
  {
    name: 'Nike',
    description: 'Just Do It - Athletic wear and sportswear',
    country: 'USA',
    foundedYear: 1964,
    website: 'https://www.nike.com',
  },
  {
    name: 'Adidas',
    description: 'Impossible is Nothing - Sports clothing and accessories',
    country: 'Germany',
    foundedYear: 1949,
    website: 'https://www.adidas.com',
  },
  {
    name: 'Zara',
    description: 'Fast fashion retailer',
    country: 'Spain',
    foundedYear: 1975,
    website: 'https://www.zara.com',
  },
  {
    name: 'H&M',
    description: 'Affordable fashion for everyone',
    country: 'Sweden',
    foundedYear: 1947,
    website: 'https://www.hm.com',
  },
  {
    name: 'Uniqlo',
    description: 'Simple, quality clothing',
    country: 'Japan',
    foundedYear: 1984,
    website: 'https://www.uniqlo.com',
  },
];

export const testWardrobeItems = [
  {
    userId: 'test-user-1',
    category: 'TOP',
    subCategory: 'T-Shirt',
    brand: 'Nike',
    colorHex: '#FF0000',
    imageUrl: 'https://example.com/nike-tshirt.jpg',
  },
  {
    userId: 'test-user-1',
    category: 'BOTTOM',
    subCategory: 'Jeans',
    brand: 'Zara',
    colorHex: '#0000FF',
    imageUrl: 'https://example.com/zara-jeans.jpg',
  },
  {
    userId: 'test-user-2',
    category: 'SHOE',
    subCategory: 'Sneakers',
    brand: 'Adidas',
    colorHex: '#FFFFFF',
    imageUrl: 'https://example.com/adidas-sneakers.jpg',
  },
];

export const testUsers = [
  {
    clerkId: 'test-clerk-id-1',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'ADMIN',
    subscriptionStatus: 'PRO',
  },
  {
    clerkId: 'test-clerk-id-2',
    email: 'user@test.com',
    name: 'Test User',
    role: 'USER',
    subscriptionStatus: 'FREE',
  },
];

export const testAuditLogs = [
  {
    userId: 'test-clerk-id-1',
    userEmail: 'admin@test.com',
    action: 'CREATE_BRAND',
    resource: 'brand',
    resourceId: 'test-brand-id-1',
    newData: { name: 'Test Brand', country: 'Germany' },
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
  },
  {
    userId: 'test-clerk-id-1',
    userEmail: 'admin@test.com',
    action: 'UPDATE_BRAND',
    resource: 'brand',
    resourceId: 'test-brand-id-1',
    oldData: { name: 'Test Brand', country: 'Germany' },
    newData: { name: 'Updated Brand', country: 'Germany' },
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
  },
];